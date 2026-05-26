import prisma from "../lib/prisma";
import { beforeEach, beforeAll, afterAll } from "vitest";

beforeEach(async () => {
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
