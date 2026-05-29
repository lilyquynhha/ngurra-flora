import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

// --- Helper: match regionId from stateProvince
const resolveRegionId = async (stateProvince: string | undefined): Promise<string | null> => {
  if (!stateProvince) return null;

  const region = await prisma.region.findFirst({
    where: { name: { equals: stateProvince, mode: "insensitive" } },
  });

  return region?.id ?? null;
};

// --- Get all occurences with pagination and filtering options

export const getAllOccurrences = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const plantId = req.query.plantId as string | undefined;
    const regionId = req.query.regionId as string | undefined;

    const where = {
      ...(plantId && { plantId }),
      ...(regionId && { regionId }),
    };

    const [occurrences, total] = await prisma.$transaction([
      prisma.occurrence.findMany({
        where,
        skip,
        take: limit,
        orderBy: { recordedDate: "desc" },
        select: {
          id: true,
          plantId: true,
          regionId: true,
          latitude: true,
          longitude: true,
          recordedDate: true,
          basisOfRecord: true,
          dataProvider: true,
          externalId: true,
          createdAt: true,
          plant: { select: { scientificName: true, commonName: true } },
          region: { select: { name: true, code: true } },
        },
      }),
      prisma.occurrence.count({ where }),
    ]);

    res.json({
      total: total,
      data: occurrences,
      pagination: { page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// --- Get all occurences of a specific plant

export const getOccurrencesByPlant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { plantId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const plant = await prisma.plant.findUnique({ where: { id: plantId as string } });
    if (!plant) {
      res.status(404).json({ error: "Plant not found" });
      return;
    }

    const occurrences = await prisma.occurrence.findMany({
      where: { plantId: plantId as string },
      skip,
      take: limit,
      orderBy: { recordedDate: "desc" },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        recordedDate: true,
        basisOfRecord: true,
        dataProvider: true,
        region: { select: { id: true, name: true, code: true } },
      },
    });

    res.json({ data: occurrences });
  } catch (err) {
    next(err);
  }
};

// --- Get nearby occurrences of a coordinate (latitude, longitude)

export const getNearbyOccurrences = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusKm = parseFloat(req.query.radius as string) || 50;

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ error: "lat and lng are required numeric values" });
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({ error: "lat must be -90 to 90, lng must be -180 to 180" });
      return;
    }

    const radiusMetres = radiusKm * 1000;

    const results: Array<{
      id: string;
      plant_id: string;
      scientific_name: string;
      common_name: string | null;
      latitude: number;
      longitude: number;
      recorded_date: Date | null;
      data_provider: string | null;
      distance_km: number;
    }> = await prisma.$queryRaw`
      SELECT
        o.id,
        o.plant_id,
        p.scientific_name,
        p.common_name,
        o.latitude,
        o.longitude,
        o.recorded_date,
        o.data_provider,
        -- calculate the distance between the specified location and the occurence (in km)
        ROUND(
          (ST_Distance(
            o.location,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          ) / 1000)::numeric,
          2
        ) AS distance_km
      FROM occurrences o
      JOIN plants p ON p.id = o.plant_id
      -- check if the specified location falls within the radius
      WHERE ST_DWithin(
        o.location,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMetres}
      )
      ORDER BY distance_km ASC -- nearest occurences first
      LIMIT 50
    `;

    res.json({
      data: results,
      meta: {
        lat,
        lng,
        radiusKm,
        total: results.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// --- Get occurrences in bounding box

export const getOccurrencesInBbox = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const minLng = parseFloat(req.query.minLng as string);
    const minLat = parseFloat(req.query.minLat as string);
    const maxLng = parseFloat(req.query.maxLng as string);
    const maxLat = parseFloat(req.query.maxLat as string);

    if ([minLng, minLat, maxLng, maxLat].some(isNaN)) {
      res.status(400).json({ error: "minLng, minLat, maxLng, maxLat are all required" });
      return;
    }

    const results: Array<{
      id: string;
      plant_id: string;
      scientific_name: string;
      common_name: string | null;
      latitude: number;
      longitude: number;
      recorded_date: Date | null;
    }> = await prisma.$queryRaw`
      SELECT
        o.id,
        o.plant_id,
        p.scientific_name,
        p.common_name,
        o.latitude,
        o.longitude,
        o.recorded_date
      FROM occurrences o
      JOIN plants p ON p.id = o.plant_id
      -- check if the specified location falls within the bounding box
      WHERE o.location && ST_MakeEnvelope( -- create the rectangular bounding box
        ${minLng}, -- left edge
        ${minLat}, -- bottom edge
        ${maxLng}, -- right edge
        ${maxLat}, -- top edge
        4326
      )::geography
      ORDER BY o.recorded_date DESC
      LIMIT 100
    `;

    res.json({ data: results });
  } catch (err) {
    next(err);
  }
};

// --- Create an occurence

export const createOccurrence = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      plantId,
      latitude,
      longitude,
      recordedDate,
      basisOfRecord,
      dataProvider,
      externalId,
      stateProvince,
    } = req.body;

    if (!plantId || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: "plantId, latitude and longitude are required" });
      return;
    }

    const plant = await prisma.plant.findUnique({ where: { id: plantId } });
    if (!plant) {
      res.status(404).json({ error: "Plant not found" });
      return;
    }

    const regionId = await resolveRegionId(stateProvince);

    // 1 - create the row (all fields except location)
    const occurrence = await prisma.occurrence.create({
      data: {
        plantId,
        latitude,
        longitude,
        regionId,
        recordedDate: recordedDate ? new Date(recordedDate) : null,
        basisOfRecord,
        dataProvider,
        externalId,
      },
    });

    // 2 - update the PostGIS location column
    await prisma.$executeRaw`
      UPDATE occurrences
      SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      WHERE id = ${occurrence.id}
    `;

    res.status(201).json({ data: occurrence });
  } catch (err: any) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "An occurrence with that externalId already exists" });
      return;
    }
    next(err);
  }
};

// --- Update an occurence (without updating the plant)

export const updateOccurrence = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      plantId,
      latitude,
      longitude,
      recordedDate,
      basisOfRecord,
      dataProvider,
      externalId,
      stateProvince,
    } = req.body;

    const existingOccurrence = await prisma.occurrence.findUnique({ where: { id: id as string } });
    if (!existingOccurrence) {
      res.status(404).json({ error: "Occurrence not found" });
      return;
    }

    if (plantId !== undefined && plantId !== existingOccurrence.plantId) {
      res.status(400).json({ error: "Cannot change plantId for an occurrence" });
      return;
    }

    const regionId = stateProvince !== undefined ? await resolveRegionId(stateProvince) : undefined;

    const occurrence = await prisma.occurrence.update({
      where: { id: id as string },
      data: {
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(recordedDate !== undefined && {
          recordedDate: recordedDate ? new Date(recordedDate) : null,
        }),
        ...(basisOfRecord !== undefined && { basisOfRecord }),
        ...(dataProvider !== undefined && { dataProvider }),
        ...(externalId !== undefined && { externalId }),
        ...(regionId !== undefined && { regionId }),
      },
    });

    if (latitude !== undefined || longitude !== undefined) {
      await prisma.$executeRaw`
        UPDATE occurrences
        SET location = ST_SetSRID(ST_MakePoint(${occurrence.longitude}, ${occurrence.latitude}), 4326)::geography
        WHERE id = ${occurrence.id}
      `;
    }

    res.json({ data: occurrence });
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Occurrence not found" });
      return;
    }
    if (err.code === "P2002") {
      res.status(409).json({ error: "An occurrence with that externalId already exists" });
      return;
    }
    next(err);
  }
};

// --- Delete an occurence

export const deleteOccurrence = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.occurrence.delete({ where: { id: id as string } });

    res.status(204).send();
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Occurrence not found" });
      return;
    }
    next(err);
  }
};
