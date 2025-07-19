import { test, expect, afterEach, describe } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallDisplay } from "../ToolCallDisplay";

afterEach(() => {
  cleanup();
});

describe("ToolCallDisplay", () => {
  test("shows loading state for incomplete tool calls", () => {
    const toolInvocation = {
      toolName: "str_replace_editor",
      state: "call" as const,
      args: { command: "create", path: "/src/components/Card.tsx" }
    };

    render(<ToolCallDisplay toolInvocation={toolInvocation} />);
    
    expect(screen.getByText("Creating Card.tsx")).toBeDefined();
    // Check for loading spinner (Loader2 icon)
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  test("shows completed state for finished tool calls", () => {
    const toolInvocation = {
      toolName: "str_replace_editor",
      state: "result" as const,
      args: { command: "create", path: "/src/components/Card.tsx" },
      result: "File created successfully"
    };

    render(<ToolCallDisplay toolInvocation={toolInvocation} />);
    
    expect(screen.getByText("Creating Card.tsx")).toBeDefined();
    // Check for success indicator (green dot)
    expect(document.querySelector('.bg-emerald-500')).toBeTruthy();
  });

  describe("str_replace_editor tool messages", () => {
    test("shows 'Creating' message for create command", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result" as const,
        args: { command: "create", path: "/src/Button.tsx" },
        result: "success"
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Creating Button.tsx")).toBeDefined();
    });

    test("shows 'Editing' message for str_replace command", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result" as const,
        args: { command: "str_replace", path: "/src/components/Form.tsx" },
        result: "success"
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Editing Form.tsx")).toBeDefined();
    });

    test("shows 'Viewing' message for view command", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result" as const,
        args: { command: "view", path: "/package.json" },
        result: "success"
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Viewing package.json")).toBeDefined();
    });

    test("shows 'Updating' message for insert command", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result" as const,
        args: { command: "insert", path: "/src/utils.ts" },
        result: "success"
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Updating utils.ts")).toBeDefined();
    });

    test("shows 'Working with' message for unknown command", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result" as const,
        args: { command: "unknown", path: "/src/test.js" },
        result: "success"
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Working with test.js")).toBeDefined();
    });

    test("handles paths without filename gracefully", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result" as const,
        args: { command: "create", path: "/" },
        result: "success"
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Creating /")).toBeDefined();
    });

    test("handles missing path gracefully", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result" as const,
        args: { command: "create" },
        result: "success"
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Creating file")).toBeDefined();
    });
  });

  describe("file_manager tool messages", () => {
    test("shows 'Renaming' message for rename command", () => {
      const toolInvocation = {
        toolName: "file_manager",
        state: "result" as const,
        args: { 
          command: "rename", 
          path: "/src/old-component.tsx",
          new_path: "/src/new-component.tsx"
        },
        result: "success"
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Renaming old-component.tsx to new-component.tsx")).toBeDefined();
    });

    test("shows 'Deleting' message for delete command", () => {
      const toolInvocation = {
        toolName: "file_manager",
        state: "result" as const,
        args: { command: "delete", path: "/src/temp-file.js" },
        result: "success"
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Deleting temp-file.js")).toBeDefined();
    });

    test("shows 'Managing' message for unknown command", () => {
      const toolInvocation = {
        toolName: "file_manager",
        state: "result" as const,
        args: { command: "unknown", path: "/src/file.ts" },
        result: "success"
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Managing file.ts")).toBeDefined();
    });
  });

  test("handles unknown tool names gracefully", () => {
    const toolInvocation = {
      toolName: "unknown_tool_name",
      state: "result" as const,
      args: {},
      result: "success"
    };

    render(<ToolCallDisplay toolInvocation={toolInvocation} />);
    expect(screen.getByText("Unknown Tool Name")).toBeDefined();
  });

  test("applies custom className", () => {
    const toolInvocation = {
      toolName: "str_replace_editor",
      state: "result" as const,
      args: { command: "create", path: "/test.js" },
      result: "success"
    };

    const { container } = render(
      <ToolCallDisplay toolInvocation={toolInvocation} className="custom-class" />
    );
    
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });

  test("has proper accessibility structure", () => {
    const toolInvocation = {
      toolName: "str_replace_editor",
      state: "result" as const,
      args: { command: "create", path: "/test.js" },
      result: "success"
    };

    render(<ToolCallDisplay toolInvocation={toolInvocation} />);
    
    // Ensure the component renders with proper structure
    const container = screen.getByText("Creating test.js").closest('div');
    expect(container).toBeTruthy();
    expect(container?.className).toContain('inline-flex');
    expect(container?.className).toContain('items-center');
  });
});