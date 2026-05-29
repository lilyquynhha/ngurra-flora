import { Request, Response, NextFunction } from "express";
import * as z from "zod";

// --- Validate the request's body
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: z.treeifyError(result.error),
      });
      return;
    }

    req.body = result.data;
    next();
  };
};

// --- Schemas

export const RegisterSchema = z.object({
  email: z.email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["VIEWER", "CONTRIBUTOR", "ADMIN"]).optional(),
});

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const CreatePlantSchema = z.object({
  scientificName: z.string().min(1, "Scientific name is required"),
  commonName: z.string().optional(),
  family: z.string().optional(),
  genus: z.string().optional(),
  author: z.string().optional(),
  conservationStatus: z
    .enum([
      "NOT_EVALUATED",
      "LEAST_CONCERN",
      "NEAR_THREATENED",
      "VULNERABLE",
      "ENDANGERED",
      "CRITICALLY_ENDANGERED",
      "EXTINCT_IN_WILD",
      "EXTINCT",
    ])
    .optional(),
  description: z.string().optional(),
  imageUrl: z.url("Must be a valid URL").optional(),
  externalId: z.string().optional(),
  regionIds: z.array(z.uuid()).optional(),
  tagIds: z.array(z.uuid()).optional(),
});

export const UpdatePlantSchema = CreatePlantSchema.partial();

export const CreateRegionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().nullable().optional(),
});

export const UpdateRegionSchema = CreateRegionSchema.partial();

export const CreateOccurrenceSchema = z.object({
  plantId: z.uuid("plantId must be a valid UUID"),
  latitude: z.number().min(-90).max(90, "Latitude must be between -90 and 90"),
  longitude: z.number().min(-180).max(180, "Longitude must be between -180 and 180"),
  recordedDate: z.iso.datetime().optional(),
  basisOfRecord: z.string().optional(),
  dataProvider: z.string().optional(),
  externalId: z.string().optional(),
  stateProvince: z.string().optional(),
});

export const UpdateOccurenceSchema = CreateOccurrenceSchema.partial();

export const CreateTagSchema = z.object({
  name: z.string().min(1, "Name is required"),
});
