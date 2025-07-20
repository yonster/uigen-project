import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeaderActions } from "../HeaderActions";

// Mock Next.js router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock server actions
vi.mock("@/actions", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

// Mock UI components
vi.mock("@/components/auth/AuthDialog", () => ({
  AuthDialog: ({ open, onOpenChange, defaultMode }: any) => (
    <div data-testid="auth-dialog" data-open={open} data-mode={defaultMode}>
      <button onClick={() => onOpenChange(false)}>Close</button>
    </div>
  ),
}));

const { signOut } = await import("@/actions");
const { getProjects } = await import("@/actions/get-projects");
const { createProject } = await import("@/actions/create-project");

const mockProjects = [
  {
    id: "project-1",
    name: "First Project",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
  },
  {
    id: "project-2",
    name: "Second Project",
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-03"),
  },
  {
    id: "project-3",
    name: "My Awesome Project",
    createdAt: new Date("2024-01-03"),
    updatedAt: new Date("2024-01-04"),
  },
];

describe("HeaderActions", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProjects).mockResolvedValue(mockProjects);
    vi.mocked(createProject).mockResolvedValue({
      id: "new-project-123",
      name: "Design #12345",
      userId: "user-123",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("when user is not authenticated", () => {
    test("renders sign in and sign up buttons", () => {
      render(<HeaderActions user={null} />);

      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
    });

    test("opens auth dialog in signin mode when sign in clicked", async () => {
      const user = userEvent.setup();
      render(<HeaderActions user={null} />);

      await user.click(screen.getByRole("button", { name: "Sign In" }));

      const dialog = screen.getByTestId("auth-dialog");
      expect(dialog).toHaveAttribute("data-open", "true");
      expect(dialog).toHaveAttribute("data-mode", "signin");
    });

    test("opens auth dialog in signup mode when sign up clicked", async () => {
      const user = userEvent.setup();
      render(<HeaderActions user={null} />);

      await user.click(screen.getByRole("button", { name: "Sign Up" }));

      const dialog = screen.getByTestId("auth-dialog");
      expect(dialog).toHaveAttribute("data-open", "true");
      expect(dialog).toHaveAttribute("data-mode", "signup");
    });

    test("closes auth dialog when onOpenChange called", async () => {
      const user = userEvent.setup();
      render(<HeaderActions user={null} />);

      await user.click(screen.getByRole("button", { name: "Sign In" }));
      
      // Dialog should be open
      expect(screen.getByTestId("auth-dialog")).toHaveAttribute("data-open", "true");

      // Click close button in dialog
      await user.click(screen.getByRole("button", { name: "Close" }));

      await waitFor(() => {
        expect(screen.getByTestId("auth-dialog")).toHaveAttribute("data-open", "false");
      });
    });
  });

  describe("when user is authenticated", () => {
    test("renders new design and sign out buttons", () => {
      render(<HeaderActions user={mockUser} />);

      expect(screen.getByRole("button", { name: "New Design" })).toBeInTheDocument();
      expect(screen.getByRole("button", { title: "Sign out" })).toBeInTheDocument();
    });

    test("calls signOut when sign out button clicked", async () => {
      const user = userEvent.setup();
      render(<HeaderActions user={mockUser} />);

      await user.click(screen.getByRole("button", { title: "Sign out" }));

      expect(signOut).toHaveBeenCalled();
    });

    test("creates new project and navigates when new design clicked", async () => {
      const user = userEvent.setup();
      render(<HeaderActions user={mockUser} />);

      await user.click(screen.getByRole("button", { name: "New Design" }));

      await waitFor(() => {
        expect(createProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^Design #\d+$/),
          messages: [],
          data: {},
        });
      });

      expect(mockPush).toHaveBeenCalledWith("/new-project-123");
    });

    test("generates random project name for new design", async () => {
      const user = userEvent.setup();
      render(<HeaderActions user={mockUser} />);

      await user.click(screen.getByRole("button", { name: "New Design" }));

      await waitFor(() => {
        expect(createProject).toHaveBeenCalled();
      });

      const createCall = vi.mocked(createProject).mock.calls[0];
      const projectName = createCall[0].name;
      expect(projectName).toMatch(/^Design #\d+$/);
      expect(parseInt(projectName.split("#")[1])).toBeGreaterThanOrEqual(0);
      expect(parseInt(projectName.split("#")[1])).toBeLessThan(100000);
    });

    describe("with projectId", () => {
      test("loads projects on mount when user and projectId provided", async () => {
        render(<HeaderActions user={mockUser} projectId="project-1" />);

        await waitFor(() => {
          expect(getProjects).toHaveBeenCalled();
        });
      });

      test("displays current project name in selector", async () => {
        render(<HeaderActions user={mockUser} projectId="project-1" />);

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toHaveTextContent("First Project");
        });
      });

      test("displays 'Select Project' when current project not found", async () => {
        render(<HeaderActions user={mockUser} projectId="nonexistent-project" />);

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toHaveTextContent("Select Project");
        });
      });

      test("opens project selector popover when clicked", async () => {
        const user = userEvent.setup();
        render(<HeaderActions user={mockUser} projectId="project-1" />);

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("combobox"));

        expect(screen.getByPlaceholder("Search projects...")).toBeInTheDocument();
        expect(screen.getByText("First Project")).toBeInTheDocument();
        expect(screen.getByText("Second Project")).toBeInTheDocument();
        expect(screen.getByText("My Awesome Project")).toBeInTheDocument();
      });

      test("filters projects based on search query", async () => {
        const user = userEvent.setup();
        render(<HeaderActions user={mockUser} projectId="project-1" />);

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("combobox"));
        
        const searchInput = screen.getByPlaceholder("Search projects...");
        await user.type(searchInput, "awesome");

        expect(screen.getByText("My Awesome Project")).toBeInTheDocument();
        expect(screen.queryByText("First Project")).not.toBeInTheDocument();
        expect(screen.queryByText("Second Project")).not.toBeInTheDocument();
      });

      test("navigates to selected project", async () => {
        const user = userEvent.setup();
        render(<HeaderActions user={mockUser} projectId="project-1" />);

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("combobox"));
        await user.click(screen.getByText("Second Project"));

        expect(mockPush).toHaveBeenCalledWith("/project-2");
      });

      test("closes popover and clears search when project selected", async () => {
        const user = userEvent.setup();
        render(<HeaderActions user={mockUser} projectId="project-1" />);

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("combobox"));
        
        const searchInput = screen.getByPlaceholder("Search projects...");
        await user.type(searchInput, "second");
        
        await user.click(screen.getByText("Second Project"));

        // Popover should close, so search input should not be visible
        await waitFor(() => {
          expect(screen.queryByPlaceholder("Search projects...")).not.toBeInTheDocument();
        });
      });

      test("refreshes projects when popover opens", async () => {
        const user = userEvent.setup();
        render(<HeaderActions user={mockUser} projectId="project-1" />);

        await waitFor(() => {
          expect(getProjects).toHaveBeenCalledTimes(1);
        });

        await user.click(screen.getByRole("combobox"));

        await waitFor(() => {
          expect(getProjects).toHaveBeenCalledTimes(2);
        });
      });

      test("displays 'No projects found' when no projects match search", async () => {
        const user = userEvent.setup();
        render(<HeaderActions user={mockUser} projectId="project-1" />);

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("combobox"));
        
        const searchInput = screen.getByPlaceholder("Search projects...");
        await user.type(searchInput, "nonexistent");

        expect(screen.getByText("No projects found.")).toBeInTheDocument();
      });

      test("handles case insensitive search", async () => {
        const user = userEvent.setup();
        render(<HeaderActions user={mockUser} projectId="project-1" />);

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("combobox"));
        
        const searchInput = screen.getByPlaceholder("Search projects...");
        await user.type(searchInput, "AWESOME");

        expect(screen.getByText("My Awesome Project")).toBeInTheDocument();
      });
    });

    describe("without projectId", () => {
      test("does not load projects when projectId not provided", () => {
        render(<HeaderActions user={mockUser} />);

        expect(getProjects).not.toHaveBeenCalled();
      });

      test("does not show project selector when projectId not provided", () => {
        render(<HeaderActions user={mockUser} />);

        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      });
    });

    describe("error handling", () => {
      test("handles getProjects error gracefully", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.mocked(getProjects).mockRejectedValue(new Error("Failed to fetch projects"));

        render(<HeaderActions user={mockUser} projectId="project-1" />);

        await waitFor(() => {
          expect(consoleSpy).toHaveBeenCalledWith(new Error("Failed to fetch projects"));
        });

        consoleSpy.mockRestore();
      });

      test("handles createProject error gracefully", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.mocked(createProject).mockRejectedValue(new Error("Failed to create project"));

        const user = userEvent.setup();
        render(<HeaderActions user={mockUser} />);

        await user.click(screen.getByRole("button", { name: "New Design" }));

        // Should not navigate on error
        expect(mockPush).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      test("handles signOut error gracefully", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.mocked(signOut).mockRejectedValue(new Error("Failed to sign out"));

        const user = userEvent.setup();
        render(<HeaderActions user={mockUser} />);

        await user.click(screen.getByRole("button", { title: "Sign out" }));

        // Should still attempt to sign out
        expect(signOut).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe("loading states", () => {
      test("hides project selector during initial loading", () => {
        render(<HeaderActions user={mockUser} projectId="project-1" />);

        // Project selector should not be visible during initial loading
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      });

      test("shows project selector after loading completes", async () => {
        render(<HeaderActions user={mockUser} projectId="project-1" />);

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });
      });

      test("shows project selector after loading fails", async () => {
        vi.mocked(getProjects).mockRejectedValue(new Error("Failed"));
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        render(<HeaderActions user={mockUser} projectId="project-1" />);

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        consoleSpy.mockRestore();
      });
    });

    describe("accessibility", () => {
      test("has proper ARIA labels", async () => {
        render(<HeaderActions user={mockUser} projectId="project-1" />);

        await waitFor(() => {
          const combobox = screen.getByRole("combobox");
          expect(combobox).toBeInTheDocument();
        });

        const signOutButton = screen.getByRole("button", { name: "Sign out" });
        expect(signOutButton).toHaveAttribute("title", "Sign out");
      });

      test("supports keyboard navigation in project selector", async () => {
        const user = userEvent.setup();
        render(<HeaderActions user={mockUser} projectId="project-1" />);

        await waitFor(() => {
          expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        const combobox = screen.getByRole("combobox");
        await user.click(combobox);

        // Should be able to navigate with keyboard
        const searchInput = screen.getByPlaceholder("Search projects...");
        expect(searchInput).toHaveFocus();
      });
    });
  });
});