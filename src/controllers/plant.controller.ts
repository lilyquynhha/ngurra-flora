import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ConservationStatus } from "@prisma/client";

// --- Get all plants with filtering options and pagination

export const getAllPlants = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get the query params for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get the query params for filtering options
    const regionId = req.query.region as string | undefined;
    const tagId = req.query.tag as string | undefined;
    const status = req.query.status as ConservationStatus | undefined;
    const search = req.query.search as string | undefined;

    // Filtering options
    const where = {
      ...(status && { conservationStatus: status }),
      ...(search && {
        OR: [
          { scientificName: { contains: search, mode: "insensitive" as const } },
          { commonName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(regionId && {
        plantRegions: { some: { regionId } },
      }),
      ...(tagId && {
        plantTags: { some: { tagId } },
      }),
    };

    const [plants, total] = await prisma.$transaction([
      prisma.plant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scientificName: "asc" },
        include: {
          plantRegions: {
            include: { region: { select: { id: true, name: true, code: true } } },
          },
          plantTags: {
            include: { tag: { select: { id: true, name: true } } },
          },
          _count: { select: { occurrences: true } },
        },
      }),
      prisma.plant.count({ where }),
    ]);

    res.json({
      total: total,
      data: plants,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// --- Get an existing plant by ID

export const getPlantById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const plant = await prisma.plant.findUnique({
      where: { id: id as string },
      include: {
        plantRegions: {
          include: { region: { select: { id: true, name: true, code: true } } },
        },
        plantTags: {
          include: { tag: { select: { id: true, name: true } } },
        },
        occurrences: {
          take: 10,
          orderBy: { recordedDate: "desc" },
          select: {
            id: true,
            latitude: true,
            longitude: true,
            recordedDate: true,
            basisOfRecord: true,
            dataProvider: true,
          },
        },
      },
    });

    if (!plant) {
      res.status(404).json({ error: "Plant not found" });
      return;
    }

    res.json({ data: plant });
  } catch (err) {
    next(err);
  }
};

// --- Create a new plant

export const createPlant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      scientificName,
      commonName,
      family,
      genus,
      species,
      author,
      conservationStatus,
      description,
      imageUrl,
      externalId,
      regionIds, // array of region IDs to link
    } = req.body;

    if (!scientificName) {
      res.status(400).json({ error: "scientificName is required" });
      return;
    }

    const plant = await prisma.plant.create({
      data: {
        scientificName,
        commonName,
        family,
        genus,
        species,
        author,
        conservationStatus,
        description,
        imageUrl,
        externalId,
        createdById: req.user!.userId,
        // Link the plant to the specified regions
        ...(regionIds?.length && {
          plantRegions: {
            create: regionIds.map((regionId: string) => ({ regionId })),
          },
        }),
      },
      include: {
        plantRegions: { include: { region: { select: { id: true, name: true, code: true } } } },
        plantTags: { include: { tag: { select: { id: true, name: true } } } },
      },
    });

    res.status(201).json({ data: plant });
  } catch (err: any) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "A plant with the same scientific name already exists" });
      return;
    }
    next(err);
  }
};

// --- Update an existing plant

export const updatePlant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      scientificName,
      commonName,
      family,
      genus,
      species,
      author,
      conservationStatus,
      description,
      imageUrl,
    } = req.body;

    const plant = await prisma.plant.update({
      where: { id: id as string },
      data: {
        ...(scientificName && { scientificName }),
        ...(commonName !== undefined && { commonName }),
        ...(family !== undefined && { family }),
        ...(genus !== undefined && { genus }),
        ...(species !== undefined && { species }),
        ...(author !== undefined && { author }),
        ...(conservationStatus && { conservationStatus }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
      include: {
        plantRegions: { include: { region: { select: { id: true, name: true, code: true } } } },
        plantTags: { include: { tag: { select: { id: true, name: true } } } },
      },
    });

    res.json({ data: plant });
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Plant not found" });
      return;
    }
    next(err);
  }
};

// --- Delete an existing plant

export const deletePlant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.plant.delete({ where: { id: id as string } });

    res.status(204).send();
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Plant not found" });
      return;
    }
    next(err);
  }
};

// --- Link a plant to a region

export const linkPlantToRegion = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id, regionId } = req.params;

    await prisma.plantRegion.create({
      data: { plantId: id as string, regionId: regionId as string },
    });

    res.status(201).json({ data: { plantId: id, regionId } });
  } catch (err: any) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "Plant already linked to this region" });
      return;
    }
    if (err.code === "P2003") {
      res.status(404).json({ error: "Plant or region not found" });
      return;
    }
    next(err);
  }
};

// --- Unlink a plant from a region

export const unlinkPlantFromRegion = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id, regionId } = req.params;

    await prisma.plantRegion.delete({
      where: { plantId_regionId: { plantId: id as string, regionId: regionId as string } },
    });

    res.status(204).send();
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Plant not linked to this region" });
      return;
    }
    next(err);
  }
};
