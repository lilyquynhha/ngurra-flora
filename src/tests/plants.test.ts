import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import supertest from "supertest";
import app from "../index";
import prisma from "../lib/prisma";

const request = supertest(app);

let adminToken: string;
let contributorToken: string;
let viewerToken: string;
let regionId: string;
let plantId: string;

// --- Create shared users and a region for use in all tests
beforeAll(async () => {
  // Register users and get tokens
  adminToken = (
    await request
      .post("/auth/register")
      .send({ email: "plant_admin@test.com", password: "password123", role: "ADMIN" })
  ).body.token;

  contributorToken = (
    await request
      .post("/auth/register")
      .send({ email: "plant_contributor@test.com", password: "password123", role: "CONTRIBUTOR" })
  ).body.token;

  viewerToken = (
    await request
      .post("/auth/register")
      .send({ email: "plant_viewer@test.com", password: "password123", role: "VIEWER" })
  ).body.token;

  // Create a shared region
  const res = await request
    .post("/regions")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Test Region", code: "TST" });

  regionId = res.body.data.id;
});

describe("GET /plants", () => {
  it("returns 200 with paginated data", async () => {
    const res = await request.get("/plants");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body).toHaveProperty("total");
  });
});

describe("POST /plants", () => {
  // Wipe plants between tests
  beforeEach(async () => {
    await prisma.plantTag.deleteMany();
    await prisma.plantRegion.deleteMany();
    await prisma.occurrence.deleteMany();
    await prisma.plant.deleteMany();
  });

  it("creates a plant as CONTRIBUTOR", async () => {
    const res = await request
      .post("/plants")
      .set("Authorization", `Bearer ${contributorToken}`)
      .send({
        scientificName: "Acacia pycnantha",
        commonName: "Golden Wattle",
        conservationStatus: "LEAST_CONCERN",
        regionIds: [regionId],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.scientificName).toBe("Acacia pycnantha");
    plantId = res.body.data.id;
  });

  it("returns 401 without token", async () => {
    const res = await request.post("/plants").send({ scientificName: "Test plant" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for VIEWER role", async () => {
    const res = await request
      .post("/plants")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ scientificName: "Test plant" });
    expect(res.status).toBe(403);
  });

  it("returns 400 when scientificName is missing", async () => {
    const res = await request
      .post("/plants")
      .set("Authorization", `Bearer ${contributorToken}`)
      .send({ commonName: "No scientific name" });
    expect(res.status).toBe(400);
  });
});

describe("GET /plants/:id", () => {
  beforeEach(async () => {
    await prisma.plantTag.deleteMany();
    await prisma.plantRegion.deleteMany();
    await prisma.occurrence.deleteMany();
    await prisma.plant.deleteMany();

    const res = await request
      .post("/plants")
      .set("Authorization", `Bearer ${contributorToken}`)
      .send({ scientificName: "Eucalyptus globulus", commonName: "Blue Gum" });

    plantId = res.body.data.id;
  });

  it("returns plant with nested regions and tags", async () => {
    const res = await request.get(`/plants/${plantId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("plantRegions");
    expect(res.body.data).toHaveProperty("plantTags");
  });

  it("returns 404 for unknown ID", async () => {
    const res = await request.get("/plants/nonexistent-id");
    expect(res.status).toBe(404);
  });
});

describe("DELETE /plants/:id", () => {
  beforeEach(async () => {
    await prisma.plantTag.deleteMany();
    await prisma.plantRegion.deleteMany();
    await prisma.occurrence.deleteMany();
    await prisma.plant.deleteMany();

    const res = await request
      .post("/plants")
      .set("Authorization", `Bearer ${contributorToken}`)
      .send({ scientificName: "Banksia serrata", commonName: "Old Man Banksia" });

    plantId = res.body.data.id;
  });

  it("returns 403 for CONTRIBUTOR role", async () => {
    const res = await request
      .delete(`/plants/${plantId}`)
      .set("Authorization", `Bearer ${contributorToken}`);
    expect(res.status).toBe(403);
  });

  it("deletes plant as ADMIN", async () => {
    const res = await request
      .delete(`/plants/${plantId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });
});
