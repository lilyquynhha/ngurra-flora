import { describe, it, expect, beforeEach } from "vitest";
import supertest from "supertest";
import app from "../index";

const request = supertest(app);

// Helper: register and return token for a given role
const getToken = async (role: "ADMIN" | "CONTRIBUTOR" | "VIEWER") => {
  const email = `${role.toLowerCase()}@test.com`;
  const password = "password123";
  await request.post("/auth/register").send({ email, password, role });

  const res = await request.post("/auth/login").send({ email, password });
  return res.body.token;
};

let adminToken: string;
let contributorToken: string;
let viewerToken: string;
let regionId: string;
let plantId: string;

beforeEach(async () => {
  adminToken = await getToken("ADMIN");
  contributorToken = await getToken("CONTRIBUTOR");
  viewerToken = await getToken("VIEWER");

  // Create a region to use in plant tests
  const res = await request
    .post("/regions")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Test Region", code: "TST" });

  //   expect(res.status).toBe(201);
  //   expect(res.body.data).toBeDefined();

  if (res.status !== 201) {
    console.error(res.body);
    throw new Error("Failed to create test region");
  }

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

describe("GET /plants/:id", async () => {
  // Create a plant before each test in this block
  beforeEach(async () => {
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

describe("DELETE /plants/:id", async () => {
  // Create a plant before each test in this block
  beforeEach(async () => {
    const res = await request
      .post("/plants")
      .set("Authorization", `Bearer ${contributorToken}`)
      .send({ scientificName: "Eucalyptus globulus", commonName: "Blue Gum" });

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
