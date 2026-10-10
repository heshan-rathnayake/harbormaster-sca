import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PrismaService } from "./prisma.service.js";

describe("PrismaService", () => {
  it("is built from the configured database URL and exposes the generated queries", async () => {
    const get = vi.fn(() => "postgresql://user:password@localhost:5432/test");
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService, { provide: ConfigService, useValue: { get } }],
    }).compile();

    const prisma = moduleRef.get(PrismaService);

    expect(get).toHaveBeenCalledWith("DATABASE_URL", { infer: true });
    expect(typeof prisma.organization.findMany).toBe("function");
    expect(typeof prisma.project.findMany).toBe("function");
  });
});
