import prisma from "../lib/prisma";
import { beforeAll, afterAll } from "vitest";

// Wipe database before each test suite
beforeAll(async () => {
  await prisma.plantTag.deleteMany();
  await prisma.plantRegion.deleteMany();
  await prisma.occurrence.deleteMany();
  await prisma.plant.deleteMany();
  await prisma.region.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
