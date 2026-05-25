import { describe, it, expect } from "vitest";
import supertest from "supertest";
import app from "../index";

const request = supertest(app);

const testUser = {
  email: "test@example.com",
  password: "password123",
};

describe("POST /auth/register", () => {
  it("creates a new user and returns a token", async () => {
    const res = await request.post("/auth/register").send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.role).toBe("VIEWER");
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("returns 409 if email is already registered", async () => {
    await request.post("/auth/register").send(testUser);
    const res = await request.post("/auth/register").send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Email already in use");
  });

  it("returns 400 if email or password is missing", async () => {
    const res = await request.post("/auth/register").send({ email: "nope@example.com" });

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  it("returns a token on valid credentials", async () => {
    await request.post("/auth/register").send(testUser);
    const res = await request.post("/auth/login").send(testUser);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("returns 401 on wrong password", async () => {
    await request.post("/auth/register").send(testUser);
    const res = await request.post("/auth/login").send({ ...testUser, password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  it("returns 401 on unregistered email", async () => {
    const res = await request
      .post("/auth/login")
      .send({ email: "ghost@example.com", password: "password123" });

    expect(res.status).toBe(401);
  });
});

describe("GET /auth/me", () => {
  it("returns the current user with a valid token", async () => {
    const reg = await request.post("/auth/register").send(testUser);
    const token = reg.body.token;

    const res = await request.get("/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email);
  });

  it("returns 401 with no token", async () => {
    const res = await request.get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with an invalid token", async () => {
    const res = await request.get("/auth/me").set("Authorization", "Bearer notarealtoken");
    expect(res.status).toBe(401);
  });
});
