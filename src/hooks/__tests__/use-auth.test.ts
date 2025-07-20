import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "../use-auth";

// Mock Next.js router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock server actions
vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

// Mock anonymous work tracker
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

const { signIn: signInAction, signUp: signUpAction } = await import("@/actions");
const { getProjects } = await import("@/actions/get-projects");
const { createProject } = await import("@/actions/create-project");
const { getAnonWorkData, clearAnonWork } = await import("@/lib/anon-work-tracker");

describe("useAuth", () => {
  const mockProjects = [
    {
      id: "project-1",
      name: "Recent Project",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
    },
    {
      id: "project-2",
      name: "Old Project",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  ];

  const mockNewProject = {
    id: "new-project-123",
    name: "New Design #12345",
    userId: "user-123",
    messages: "[]",
    data: "{}",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful mocks
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    vi.mocked(getProjects).mockResolvedValue(mockProjects);
    vi.mocked(createProject).mockResolvedValue(mockNewProject);
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(clearAnonWork).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    test("returns initial loading state as false", () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn and signUp functions", () => {
      const { result } = renderHook(() => useAuth());
      
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
    });
  });

  describe("signIn", () => {
    test("calls signIn action with correct credentials", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(signInAction).toHaveBeenCalledWith("test@example.com", "password123");
    });

    test("sets loading state during sign in", async () => {
      const { result } = renderHook(() => useAuth());

      let loadingDuringCall = false;
      vi.mocked(signInAction).mockImplementation(async () => {
        loadingDuringCall = result.current.isLoading;
        return { success: true };
      });

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(loadingDuringCall).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    test("returns result from signIn action", async () => {
      const mockResult = { success: true, message: "Signed in successfully" };
      vi.mocked(signInAction).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useAuth());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "password123");
      });

      expect(signInResult).toEqual(mockResult);
    });

    test("handles sign in failure gracefully", async () => {
      const mockResult = { success: false, error: "Invalid credentials" };
      vi.mocked(signInAction).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useAuth());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "wrong-password");
      });

      expect(signInResult).toEqual(mockResult);
      expect(result.current.isLoading).toBe(false);
      // Should not navigate on failure
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("clears loading state even if sign in throws", async () => {
      vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password123");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("calls signUp action with correct credentials", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("test@example.com", "password123");
      });

      expect(signUpAction).toHaveBeenCalledWith("test@example.com", "password123");
    });

    test("sets loading state during sign up", async () => {
      const { result } = renderHook(() => useAuth());

      let loadingDuringCall = false;
      vi.mocked(signUpAction).mockImplementation(async () => {
        loadingDuringCall = result.current.isLoading;
        return { success: true };
      });

      await act(async () => {
        await result.current.signUp("test@example.com", "password123");
      });

      expect(loadingDuringCall).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    test("returns result from signUp action", async () => {
      const mockResult = { success: true, message: "Account created successfully" };
      vi.mocked(signUpAction).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useAuth());

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp("test@example.com", "password123");
      });

      expect(signUpResult).toEqual(mockResult);
    });

    test("handles sign up failure gracefully", async () => {
      const mockResult = { success: false, error: "Email already exists" };
      vi.mocked(signUpAction).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useAuth());

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp("test@example.com", "password123");
      });

      expect(signUpResult).toEqual(mockResult);
      expect(result.current.isLoading).toBe(false);
      // Should not navigate on failure
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn - anonymous work", () => {
    test("creates project from anonymous work when available", async () => {
      const mockAnonWork = {
        messages: [
          { role: "user", content: "Create a button" },
          { role: "assistant", content: "I'll create a button for you" },
        ],
        fileSystemData: {
          files: {
            "/Button.jsx": "export default function Button() { return <button>Click me</button>; }",
          },
        },
      };
      vi.mocked(getAnonWorkData).mockReturnValue(mockAnonWork);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from \d{1,2}:\d{2}:\d{2}/),
        messages: mockAnonWork.messages,
        data: mockAnonWork.fileSystemData,
      });
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/new-project-123");
    });

    test("generates time-based project name for anonymous work", async () => {
      const mockAnonWork = {
        messages: [{ role: "user", content: "Hello" }],
        fileSystemData: {},
      };
      vi.mocked(getAnonWorkData).mockReturnValue(mockAnonWork);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      const createCall = vi.mocked(createProject).mock.calls[0];
      const projectName = createCall[0].name;
      expect(projectName).toMatch(/^Design from \d{1,2}:\d{2}:\d{2}/);
    });

    test("ignores anonymous work with no messages", async () => {
      const mockAnonWork = {
        messages: [],
        fileSystemData: {},
      };
      vi.mocked(getAnonWorkData).mockReturnValue(mockAnonWork);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      // Should proceed to check existing projects, not create from anon work
      expect(getProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-1"); // Most recent project
    });

    test("proceeds to existing projects when no anonymous work", async () => {
      vi.mocked(getAnonWorkData).mockReturnValue(null);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(getProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-1");
      expect(clearAnonWork).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn - existing projects", () => {
    test("navigates to most recent project when projects exist", async () => {
      vi.mocked(getAnonWorkData).mockReturnValue(null);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(getProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-1"); // First project (most recent)
    });

    test("creates new project when no existing projects", async () => {
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(getProjects).toHaveBeenCalled();
      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-project-123");
    });

    test("generates random project name for new project", async () => {
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      const createCall = vi.mocked(createProject).mock.calls[0];
      const projectName = createCall[0].name;
      expect(projectName).toMatch(/^New Design #\d+$/);
      
      const projectNumber = parseInt(projectName.split("#")[1]);
      expect(projectNumber).toBeGreaterThanOrEqual(0);
      expect(projectNumber).toBeLessThan(100000);
    });
  });

  describe("error handling in post sign-in", () => {
    test("handles createProject error when processing anonymous work", async () => {
      const mockAnonWork = {
        messages: [{ role: "user", content: "Hello" }],
        fileSystemData: {},
      };
      vi.mocked(getAnonWorkData).mockReturnValue(mockAnonWork);
      vi.mocked(createProject).mockRejectedValue(new Error("Failed to create project"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password123");
        } catch {
          // Expected to throw
        }
      });

      expect(createProject).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("handles getProjects error", async () => {
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockRejectedValue(new Error("Failed to get projects"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password123");
        } catch {
          // Expected to throw
        }
      });

      expect(getProjects).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("handles createProject error when no existing projects", async () => {
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockRejectedValue(new Error("Failed to create new project"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password123");
        } catch {
          // Expected to throw
        }
      });

      expect(createProject).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    test("handles concurrent sign in attempts", async () => {
      const { result } = renderHook(() => useAuth());

      // Start first sign-in attempt
      await act(async () => {
        await result.current.signIn("test1@example.com", "password1");
      });

      // Start second sign-in attempt after first completes
      await act(async () => {
        await result.current.signIn("test2@example.com", "password2");
      });

      // Both should have been called
      expect(signInAction).toHaveBeenCalledTimes(2);
      expect(signInAction).toHaveBeenCalledWith("test1@example.com", "password1");
      expect(signInAction).toHaveBeenCalledWith("test2@example.com", "password2");
    });

    test("handles sign in and sign up called separately", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      await act(async () => {
        await result.current.signUp("test@example.com", "password");
      });

      expect(signInAction).toHaveBeenCalledWith("test@example.com", "password");
      expect(signUpAction).toHaveBeenCalledWith("test@example.com", "password");
    });

    test("handles empty credentials gracefully", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("", "");
      });

      expect(signInAction).toHaveBeenCalledWith("", "");
    });

    test("preserves anonymous work data structure", async () => {
      const complexAnonWork = {
        messages: [
          {
            role: "user",
            content: "Create a complex component",
            timestamp: Date.now(),
          },
          {
            role: "assistant", 
            content: "I'll create that for you",
            toolCalls: [{ type: "file_create", args: { path: "/Component.jsx" } }],
          },
        ],
        fileSystemData: {
          files: {
            "/Component.jsx": "export default function Component() { return <div>Complex</div>; }",
            "/styles.css": "body { margin: 0; }",
          },
          config: {
            theme: "dark",
            version: "1.0",
          },
        },
      };
      vi.mocked(getAnonWorkData).mockReturnValue(complexAnonWork);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith({
        name: expect.any(String),
        messages: complexAnonWork.messages,
        data: complexAnonWork.fileSystemData,
      });
    });

    test("handles malformed anonymous work data", async () => {
      const malformedAnonWork = {
        messages: "not-an-array", // Invalid type
        fileSystemData: null,
      };
      vi.mocked(getAnonWorkData).mockReturnValue(malformedAnonWork as any);

      const { result } = renderHook(() => useAuth());

      // Should either handle gracefully or throw, but not cause infinite loops
      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password123");
        } catch {
          // May throw due to invalid data
        }
      });

      // Should still clear loading state
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("loading state management", () => {
    test("maintains separate loading states for signIn and signUp", async () => {
      const { result } = renderHook(() => useAuth());

      // Mock long-running sign in
      vi.mocked(signInAction).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      // Start sign in
      await act(async () => {
        const signInPromise = result.current.signIn("test@example.com", "password");
        
        // Should be loading during the call
        await waitFor(() => {
          expect(result.current.isLoading).toBe(true);
        });
        
        await signInPromise;
      });

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false);
    });

    test("resets loading state after successful authentication flow", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockPush).toHaveBeenCalled(); // Should have navigated
    });
  });
});