import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { getProjects } from "../get-projects";

// Mock the dependencies
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
    },
  },
}));

const { getSession } = await import("@/lib/auth");
const { prisma } = await import("@/lib/prisma");

describe("getProjects", () => {
  const mockSession = {
    userId: "user-123",
    email: "test@example.com",
    expiresAt: new Date(),
  };

  const mockProjects = [
    {
      id: "project-1",
      name: "First Project",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-05"),
    },
    {
      id: "project-2",
      name: "Second Project",
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-04"),
    },
    {
      id: "project-3",
      name: "Third Project",
      createdAt: new Date("2024-01-03"),
      updatedAt: new Date("2024-01-03"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("successfully retrieves projects for authenticated user", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);

    const result = await getProjects();

    expect(getSession).toHaveBeenCalled();
    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    expect(result).toEqual(mockProjects);
  });

  test("throws error when user is not authenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(getProjects()).rejects.toThrow("Unauthorized");
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });

  test("returns empty array when user has no projects", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);

    const result = await getProjects();

    expect(result).toEqual([]);
    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  test("returns projects ordered by updatedAt descending", async () => {
    // Create projects with different update times to test ordering
    const unorderedProjects = [
      {
        id: "project-old",
        name: "Old Project",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"), // Oldest update
      },
      {
        id: "project-newest",
        name: "Newest Project",
        createdAt: new Date("2024-01-02"),
        updatedAt: new Date("2024-01-10"), // Most recent update
      },
      {
        id: "project-middle",
        name: "Middle Project",
        createdAt: new Date("2024-01-03"),
        updatedAt: new Date("2024-01-05"), // Middle update
      },
    ];

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue(unorderedProjects);

    const result = await getProjects();

    expect(result).toEqual(unorderedProjects);
    
    // Verify the query includes the correct ordering
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          updatedAt: "desc",
        },
      })
    );
  });

  test("only selects required fields", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);

    await getProjects();

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    );

    // Verify that sensitive fields like messages and data are not selected
    const selectCall = vi.mocked(prisma.project.findMany).mock.calls[0][0];
    expect(selectCall.select).not.toHaveProperty("messages");
    expect(selectCall.select).not.toHaveProperty("data");
    expect(selectCall.select).not.toHaveProperty("userId");
  });

  test("filters projects by user ID", async () => {
    const differentUserSession = {
      userId: "different-user-456",
      email: "different@example.com",
      expiresAt: new Date(),
    };

    vi.mocked(getSession).mockResolvedValue(differentUserSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);

    await getProjects();

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "different-user-456",
        },
      })
    );
  });

  test("handles projects with special characters in names", async () => {
    const projectsWithSpecialNames = [
      {
        id: "project-1",
        name: "My Awesome Project! 🚀",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
      {
        id: "project-2",
        name: "Test Project (v2.0) - [FINAL]",
        createdAt: new Date("2024-01-02"),
        updatedAt: new Date("2024-01-02"),
      },
      {
        id: "project-3",
        name: "プロジェクト名", // Japanese characters
        createdAt: new Date("2024-01-03"),
        updatedAt: new Date("2024-01-03"),
      },
    ];

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue(projectsWithSpecialNames);

    const result = await getProjects();

    expect(result).toEqual(projectsWithSpecialNames);
  });

  test("handles large number of projects", async () => {
    const manyProjects = Array.from({ length: 1000 }, (_, index) => ({
      id: `project-${index + 1}`,
      name: `Project ${index + 1}`,
      createdAt: new Date(`2024-01-${String(index % 30 + 1).padStart(2, '0')}`),
      updatedAt: new Date(`2024-01-${String((index + 15) % 30 + 1).padStart(2, '0')}`),
    }));

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue(manyProjects);

    const result = await getProjects();

    expect(result).toHaveLength(1000);
    expect(result).toEqual(manyProjects);
  });

  test("propagates database errors", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockRejectedValue(
      new Error("Database connection failed")
    );

    await expect(getProjects()).rejects.toThrow("Database connection failed");
  });

  test("handles database timeout errors", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockRejectedValue(
      new Error("Query timeout")
    );

    await expect(getProjects()).rejects.toThrow("Query timeout");
  });

  test("preserves date objects correctly", async () => {
    const projectsWithSpecificDates = [
      {
        id: "project-1",
        name: "Project 1",
        createdAt: new Date("2024-01-15T10:30:00Z"),
        updatedAt: new Date("2024-02-20T14:45:30Z"),
      },
    ];

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue(projectsWithSpecificDates);

    const result = await getProjects();

    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(result[0].updatedAt).toBeInstanceOf(Date);
    expect(result[0].createdAt.toISOString()).toBe("2024-01-15T10:30:00.000Z");
    expect(result[0].updatedAt.toISOString()).toBe("2024-02-20T14:45:30.000Z");
  });

  test("handles projects with same update time", async () => {
    const sameUpdateTime = new Date("2024-01-01T12:00:00Z");
    const projectsWithSameUpdateTime = [
      {
        id: "project-1",
        name: "First Project",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: sameUpdateTime,
      },
      {
        id: "project-2",
        name: "Second Project",
        createdAt: new Date("2024-01-01T11:00:00Z"),
        updatedAt: sameUpdateTime,
      },
    ];

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue(projectsWithSameUpdateTime);

    const result = await getProjects();

    expect(result).toEqual(projectsWithSameUpdateTime);
    expect(result).toHaveLength(2);
  });

  test("handles concurrent requests", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);

    // Simulate multiple concurrent requests
    const promises = Array(5).fill(0).map(() => getProjects());
    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result).toEqual(mockProjects);
    });

    // Should have been called 5 times
    expect(prisma.project.findMany).toHaveBeenCalledTimes(5);
  });

  test("handles null session gracefully", async () => {
    // Test edge case where getSession might return null due to expired token
    vi.mocked(getSession)
      .mockResolvedValueOnce(mockSession) // First call succeeds
      .mockResolvedValueOnce(null); // Second call fails (expired token)

    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);

    // First call should succeed
    const result1 = await getProjects();
    expect(result1).toEqual(mockProjects);

    // Second call should fail
    await expect(getProjects()).rejects.toThrow("Unauthorized");
  });

  test("ensures userId filter is always applied", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);

    await getProjects();

    const queryParams = vi.mocked(prisma.project.findMany).mock.calls[0][0];
    
    expect(queryParams.where).toHaveProperty("userId");
    expect(queryParams.where.userId).toBe("user-123");
    
    // Ensure no other where conditions are present that might bypass user filtering
    expect(Object.keys(queryParams.where)).toEqual(["userId"]);
  });
});