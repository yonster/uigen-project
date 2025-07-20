import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { createProject } from "../create-project";

// Mock the dependencies
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      create: vi.fn(),
    },
  },
}));

const { getSession } = await import("@/lib/auth");
const { prisma } = await import("@/lib/prisma");

describe("createProject", () => {
  const mockSession = {
    userId: "user-123",
    email: "test@example.com",
    expiresAt: new Date(),
  };

  const mockProject = {
    id: "project-123",
    name: "Test Project",
    userId: "user-123",
    messages: "[]",
    data: "{}",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("successfully creates a project for authenticated user", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.create).mockResolvedValue(mockProject);

    const input = {
      name: "Test Project",
      messages: [{ role: "user", content: "Hello" }],
      data: { files: { "/test.txt": "content" } },
    };

    const result = await createProject(input);

    expect(getSession).toHaveBeenCalled();
    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "Test Project",
        userId: "user-123",
        messages: JSON.stringify([{ role: "user", content: "Hello" }]),
        data: JSON.stringify({ files: { "/test.txt": "content" } }),
      },
    });
    expect(result).toEqual(mockProject);
  });

  test("throws error when user is not authenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const input = {
      name: "Test Project",
      messages: [],
      data: {},
    };

    await expect(createProject(input)).rejects.toThrow("Unauthorized");
    expect(prisma.project.create).not.toHaveBeenCalled();
  });

  test("handles complex message array", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.create).mockResolvedValue(mockProject);

    const complexMessages = [
      { role: "user", content: "Create a button component" },
      { role: "assistant", content: "I'll create a button component for you" },
      { role: "user", content: "Make it red" },
    ];

    const input = {
      name: "Button Project",
      messages: complexMessages,
      data: {},
    };

    await createProject(input);

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "Button Project",
        userId: "user-123",
        messages: JSON.stringify(complexMessages),
        data: JSON.stringify({}),
      },
    });
  });

  test("handles complex data object", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.create).mockResolvedValue(mockProject);

    const complexData = {
      files: {
        "/src/Button.tsx": "export const Button = () => <button>Click me</button>",
        "/src/App.tsx": "import { Button } from './Button';\nexport const App = () => <Button />;",
      },
      dependencies: ["react", "typescript"],
      config: {
        theme: "dark",
        primaryColor: "blue",
      },
    };

    const input = {
      name: "Complex Project",
      messages: [],
      data: complexData,
    };

    await createProject(input);

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "Complex Project",
        userId: "user-123",
        messages: JSON.stringify([]),
        data: JSON.stringify(complexData),
      },
    });
  });

  test("handles empty arrays and objects", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.create).mockResolvedValue(mockProject);

    const input = {
      name: "Empty Project",
      messages: [],
      data: {},
    };

    await createProject(input);

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "Empty Project",
        userId: "user-123",
        messages: "[]",
        data: "{}",
      },
    });
  });

  test("handles project names with special characters", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.create).mockResolvedValue({
      ...mockProject,
      name: "My Awesome Project! (v2.0) - [FINAL]",
    });

    const input = {
      name: "My Awesome Project! (v2.0) - [FINAL]",
      messages: [],
      data: {},
    };

    await createProject(input);

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "My Awesome Project! (v2.0) - [FINAL]",
        userId: "user-123",
        messages: "[]",
        data: "{}",
      },
    });
  });

  test("propagates database errors", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.create).mockRejectedValue(new Error("Database connection failed"));

    const input = {
      name: "Test Project",
      messages: [],
      data: {},
    };

    await expect(createProject(input)).rejects.toThrow("Database connection failed");
  });

  test("handles null and undefined values in data", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.create).mockResolvedValue(mockProject);

    const inputWithNulls = {
      name: "Null Test Project",
      messages: [{ role: "user", content: null }] as any,
      data: { nullValue: null, undefinedValue: undefined },
    };

    await createProject(inputWithNulls);

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "Null Test Project",
        userId: "user-123",
        messages: JSON.stringify([{ role: "user", content: null }]),
        data: JSON.stringify({ nullValue: null }),
      },
    });
  });

  test("handles very long project names", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.create).mockResolvedValue(mockProject);

    const longName = "A".repeat(1000);
    const input = {
      name: longName,
      messages: [],
      data: {},
    };

    await createProject(input);

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: longName,
        userId: "user-123",
        messages: "[]",
        data: "{}",
      },
    });
  });

  test("handles large data objects", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.create).mockResolvedValue(mockProject);

    const largeData = {
      files: {} as Record<string, string>,
    };

    // Create 100 files with content
    for (let i = 0; i < 100; i++) {
      largeData.files[`/file${i}.txt`] = `Content for file ${i}\n`.repeat(100);
    }

    const input = {
      name: "Large Project",
      messages: [],
      data: largeData,
    };

    await createProject(input);

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "Large Project",
        userId: "user-123",
        messages: "[]",
        data: JSON.stringify(largeData),
      },
    });
  });

  test("handles circular references in data gracefully", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);

    const circularData: any = { name: "test" };
    circularData.self = circularData; // Create circular reference

    const input = {
      name: "Circular Project",
      messages: [],
      data: circularData,
    };

    // This should throw a JSON.stringify error due to circular reference
    await expect(createProject(input)).rejects.toThrow();
  });

  test("handles session with different userId", async () => {
    const differentSession = {
      userId: "different-user-456",
      email: "different@example.com",
      expiresAt: new Date(),
    };

    vi.mocked(getSession).mockResolvedValue(differentSession);
    vi.mocked(prisma.project.create).mockResolvedValue({
      ...mockProject,
      userId: "different-user-456",
    });

    const input = {
      name: "Different User Project",
      messages: [],
      data: {},
    };

    await createProject(input);

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "Different User Project",
        userId: "different-user-456",
        messages: "[]",
        data: "{}",
      },
    });
  });
});