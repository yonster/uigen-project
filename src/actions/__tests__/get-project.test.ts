import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { getProject } from "../get-project";

// Mock the dependencies
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
  },
}));

const { getSession } = await import("@/lib/auth");
const { prisma } = await import("@/lib/prisma");

describe("getProject", () => {
  const mockSession = {
    userId: "user-123",
    email: "test@example.com",
    expiresAt: new Date(),
  };

  const mockProject = {
    id: "project-123",
    name: "Test Project",
    userId: "user-123",
    messages: JSON.stringify([
      { role: "user", content: "Create a button" },
      { role: "assistant", content: "I'll create a button for you" },
    ]),
    data: JSON.stringify({
      files: {
        "/Button.tsx": "export const Button = () => <button>Click me</button>",
      },
    }),
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("successfully retrieves project for authenticated user", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);

    const result = await getProject("project-123");

    expect(getSession).toHaveBeenCalled();
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: {
        id: "project-123",
        userId: "user-123",
      },
    });

    expect(result).toEqual({
      id: "project-123",
      name: "Test Project",
      messages: [
        { role: "user", content: "Create a button" },
        { role: "assistant", content: "I'll create a button for you" },
      ],
      data: {
        files: {
          "/Button.tsx": "export const Button = () => <button>Click me</button>",
        },
      },
      createdAt: mockProject.createdAt,
      updatedAt: mockProject.updatedAt,
    });
  });

  test("throws error when user is not authenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(getProject("project-123")).rejects.toThrow("Unauthorized");
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  test("throws error when project is not found", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    await expect(getProject("nonexistent-project")).rejects.toThrow("Project not found");
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: {
        id: "nonexistent-project",
        userId: "user-123",
      },
    });
  });

  test("throws error when project belongs to different user", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    await expect(getProject("other-users-project")).rejects.toThrow("Project not found");
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: {
        id: "other-users-project",
        userId: "user-123",
      },
    });
  });

  test("handles empty messages array", async () => {
    const projectWithEmptyMessages = {
      ...mockProject,
      messages: "[]",
    };

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithEmptyMessages);

    const result = await getProject("project-123");

    expect(result.messages).toEqual([]);
  });

  test("handles empty data object", async () => {
    const projectWithEmptyData = {
      ...mockProject,
      data: "{}",
    };

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithEmptyData);

    const result = await getProject("project-123");

    expect(result.data).toEqual({});
  });

  test("handles complex messages array", async () => {
    const complexMessages = [
      { role: "user", content: "Create a button component" },
      { role: "assistant", content: "I'll create a button component for you", toolCalls: [] },
      { role: "tool", content: "File created", toolCallId: "123" },
      { role: "user", content: "Make it red" },
    ];

    const projectWithComplexMessages = {
      ...mockProject,
      messages: JSON.stringify(complexMessages),
    };

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithComplexMessages);

    const result = await getProject("project-123");

    expect(result.messages).toEqual(complexMessages);
  });

  test("handles complex data object", async () => {
    const complexData = {
      files: {
        "/src/Button.tsx": "export const Button = () => <button>Click me</button>",
        "/src/App.tsx": "import { Button } from './Button';\nexport const App = () => <Button />;",
        "/package.json": '{\n  "name": "test-app",\n  "version": "1.0.0"\n}',
      },
      dependencies: ["react", "typescript"],
      config: {
        theme: "dark",
        primaryColor: "blue",
        layout: {
          sidebar: true,
          header: false,
        },
      },
    };

    const projectWithComplexData = {
      ...mockProject,
      data: JSON.stringify(complexData),
    };

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithComplexData);

    const result = await getProject("project-123");

    expect(result.data).toEqual(complexData);
  });

  test("handles malformed JSON in messages", async () => {
    const projectWithMalformedMessages = {
      ...mockProject,
      messages: '{"invalid": json}', // Invalid JSON
    };

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithMalformedMessages);

    await expect(getProject("project-123")).rejects.toThrow();
  });

  test("handles malformed JSON in data", async () => {
    const projectWithMalformedData = {
      ...mockProject,
      data: '{invalid: json}', // Invalid JSON
    };

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithMalformedData);

    await expect(getProject("project-123")).rejects.toThrow();
  });

  test("propagates database errors", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockRejectedValue(
      new Error("Database connection failed")
    );

    await expect(getProject("project-123")).rejects.toThrow("Database connection failed");
  });

  test("handles different project ID formats", async () => {
    const testCases = [
      "project-123",
      "proj_456",
      "abcd1234-efgh-5678-ijkl-9012mnop3456", // UUID format
      "very-long-project-id-with-many-dashes-and-characters",
    ];

    for (const projectId of testCases) {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        ...mockProject,
        id: projectId,
      });

      const result = await getProject(projectId);

      expect(result.id).toBe(projectId);
      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: {
          id: projectId,
          userId: "user-123",
        },
      });

      vi.clearAllMocks();
    }
  });

  test("handles null values in database fields", async () => {
    // Simulate edge case where database might return null for non-nullable fields
    const projectWithNulls = {
      ...mockProject,
      messages: null as any,
      data: null as any,
    };

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithNulls);

    // This should throw when trying to JSON.parse null values
    await expect(getProject("project-123")).rejects.toThrow();
  });

  test("preserves date objects correctly", async () => {
    const specificDates = {
      createdAt: new Date("2024-01-15T10:30:00Z"),
      updatedAt: new Date("2024-02-20T14:45:30Z"),
    };

    const projectWithSpecificDates = {
      ...mockProject,
      ...specificDates,
    };

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithSpecificDates);

    const result = await getProject("project-123");

    expect(result.createdAt).toEqual(specificDates.createdAt);
    expect(result.updatedAt).toEqual(specificDates.updatedAt);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  test("handles special characters in project names", async () => {
    const projectWithSpecialName = {
      ...mockProject,
      name: "My Project! (v2.0) - [FINAL] 🚀",
    };

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithSpecialName);

    const result = await getProject("project-123");

    expect(result.name).toBe("My Project! (v2.0) - [FINAL] 🚀");
  });

  test("handles concurrent requests for same project", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);

    // Simulate multiple concurrent requests
    const promises = Array(5)
      .fill(0)
      .map(() => getProject("project-123"));

    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result.id).toBe("project-123");
    });

    // Should have been called 5 times
    expect(prisma.project.findUnique).toHaveBeenCalledTimes(5);
  });
});