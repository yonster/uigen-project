import { test, expect, describe } from "vitest";
import { VirtualFileSystem } from "@/lib/file-system";
import { buildStrReplaceTool } from "../str-replace";

describe("StrReplaceTool", () => {
  test("creates str replace tool with correct properties", () => {
    const fileSystem = new VirtualFileSystem();
    const tool = buildStrReplaceTool(fileSystem);

    expect(tool.id).toBe("str_replace_editor");
    expect(tool.parameters).toBeDefined();
    expect(tool.execute).toBeDefined();
  });

  describe("view command", () => {
    test("views file content with line numbers", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "line1\nline2\nline3");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "view",
        path: "/test.txt",
      });

      expect(result).toBe("1\tline1\n2\tline2\n3\tline3");
    });

    test("views file with range", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "line1\nline2\nline3\nline4\nline5");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "view",
        path: "/test.txt",
        view_range: [2, 4],
      });

      expect(result).toBe("2\tline2\n3\tline3\n4\tline4");
    });

    test("views file with range to end", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "line1\nline2\nline3");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "view",
        path: "/test.txt",
        view_range: [2, -1],
      });

      expect(result).toBe("2\tline2\n3\tline3");
    });

    test("views directory contents", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createDirectory("/src");
      fileSystem.createFile("/src/index.ts", "");
      fileSystem.createDirectory("/src/components");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "view",
        path: "/src",
      });

      expect(result).toBe("[DIR] components\n[FILE] index.ts");
    });

    test("views empty directory", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createDirectory("/empty");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "view",
        path: "/empty",
      });

      expect(result).toBe("(empty directory)");
    });

    test("views empty file", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/empty.txt", "");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "view",
        path: "/empty.txt",
      });

      expect(result).toBe("1\t");
    });

    test("returns error for non-existent file", async () => {
      const fileSystem = new VirtualFileSystem();
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "view",
        path: "/nonexistent.txt",
      });

      expect(result).toBe("File not found: /nonexistent.txt");
    });
  });

  describe("create command", () => {
    test("creates new file with content", async () => {
      const fileSystem = new VirtualFileSystem();
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "create",
        path: "/test.txt",
        file_text: "Hello World",
      });

      expect(result).toBe("File created: /test.txt");
      expect(fileSystem.exists("/test.txt")).toBe(true);
      expect(fileSystem.readFile("/test.txt")).toBe("Hello World");
    });

    test("creates new file with empty content when file_text is not provided", async () => {
      const fileSystem = new VirtualFileSystem();
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "create",
        path: "/empty.txt",
      });

      expect(result).toBe("File created: /empty.txt");
      expect(fileSystem.exists("/empty.txt")).toBe(true);
      expect(fileSystem.readFile("/empty.txt")).toBe("");
    });

    test("creates file with parent directories", async () => {
      const fileSystem = new VirtualFileSystem();
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "create",
        path: "/src/components/Button.tsx",
        file_text: "export const Button = () => {};",
      });

      expect(result).toBe("File created: /src/components/Button.tsx");
      expect(fileSystem.exists("/src")).toBe(true);
      expect(fileSystem.exists("/src/components")).toBe(true);
      expect(fileSystem.exists("/src/components/Button.tsx")).toBe(true);
      expect(fileSystem.readFile("/src/components/Button.tsx")).toBe(
        "export const Button = () => {};"
      );
    });

    test("returns error when file already exists", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "existing content");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "create",
        path: "/test.txt",
        file_text: "new content",
      });

      expect(result).toBe("Error: File already exists: /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe("existing content");
    });
  });

  describe("str_replace command", () => {
    test("replaces string in file", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "Hello world! Hello universe!");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "str_replace",
        path: "/test.txt",
        old_str: "Hello",
        new_str: "Hi",
      });

      expect(result).toBe("Replaced 2 occurrence(s) of the string in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe("Hi world! Hi universe!");
    });

    test("replaces string with empty string (deletion)", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "foo bar foo baz");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "str_replace",
        path: "/test.txt",
        old_str: "foo ",
        new_str: "",
      });

      expect(result).toBe("Replaced 2 occurrence(s) of the string in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe("bar baz");
    });

    test("handles empty old_str gracefully", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "content");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "str_replace",
        path: "/test.txt",
        old_str: "",
        new_str: "replacement",
      });

      expect(result).toBe('Error: String not found in file: ""');
    });

    test("handles undefined old_str", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "content");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "str_replace",
        path: "/test.txt",
        new_str: "replacement",
      });

      expect(result).toBe('Error: String not found in file: ""');
    });

    test("handles undefined new_str", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "Hello world");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "str_replace",
        path: "/test.txt",
        old_str: "Hello",
      });

      expect(result).toBe("Replaced 1 occurrence(s) of the string in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe(" world");
    });

    test("returns error for non-existent file", async () => {
      const fileSystem = new VirtualFileSystem();
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "str_replace",
        path: "/nonexistent.txt",
        old_str: "old",
        new_str: "new",
      });

      expect(result).toBe("Error: File not found: /nonexistent.txt");
    });

    test("returns error when trying to edit directory", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createDirectory("/src");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "str_replace",
        path: "/src",
        old_str: "old",
        new_str: "new",
      });

      expect(result).toBe("Error: Cannot edit a directory: /src");
    });

    test("returns error when string not found", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "Hello world");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "str_replace",
        path: "/test.txt",
        old_str: "nonexistent",
        new_str: "replacement",
      });

      expect(result).toBe('Error: String not found in file: "nonexistent"');
    });
  });

  describe("insert command", () => {
    test("inserts text at specified line", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "line1\nline2\nline3");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "insert",
        path: "/test.txt",
        insert_line: 1,
        new_str: "inserted line",
      });

      expect(result).toBe("Text inserted at line 1 in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe(
        "line1\ninserted line\nline2\nline3"
      );
    });

    test("inserts at beginning of file", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "line1\nline2");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "insert",
        path: "/test.txt",
        insert_line: 0,
        new_str: "first line",
      });

      expect(result).toBe("Text inserted at line 0 in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe(
        "first line\nline1\nline2"
      );
    });

    test("inserts at end of file", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "line1\nline2");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "insert",
        path: "/test.txt",
        insert_line: 2,
        new_str: "last line",
      });

      expect(result).toBe("Text inserted at line 2 in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe(
        "line1\nline2\nlast line"
      );
    });

    test("handles undefined insert_line as 0", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "content");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "insert",
        path: "/test.txt",
        new_str: "inserted",
      });

      expect(result).toBe("Text inserted at line 0 in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe("inserted\ncontent");
    });

    test("handles undefined new_str as empty string", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "line1\nline2");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "insert",
        path: "/test.txt",
        insert_line: 1,
      });

      expect(result).toBe("Text inserted at line 1 in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe("line1\n\nline2");
    });

    test("returns error for non-existent file", async () => {
      const fileSystem = new VirtualFileSystem();
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "insert",
        path: "/nonexistent.txt",
        insert_line: 0,
        new_str: "text",
      });

      expect(result).toBe("Error: File not found: /nonexistent.txt");
    });

    test("returns error when trying to insert in directory", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createDirectory("/src");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "insert",
        path: "/src",
        insert_line: 0,
        new_str: "text",
      });

      expect(result).toBe("Error: Cannot edit a directory: /src");
    });
  });

  describe("undo_edit command", () => {
    test("returns error message for unsupported undo command", async () => {
      const fileSystem = new VirtualFileSystem();
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "undo_edit",
        path: "/test.txt",
      });

      expect(result).toBe(
        "Error: undo_edit command is not supported in this version. Use str_replace to revert changes."
      );
    });
  });

  describe("edge cases and error handling", () => {
    test("handles complex multiline replacement", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.tsx", `function Component() {
  return <div>Hello</div>;
}`);
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "str_replace",
        path: "/test.tsx",
        old_str: "return <div>Hello</div>;",
        new_str: "return (\n    <div>\n      <h1>Hello World</h1>\n    </div>\n  );",
      });

      expect(result).toBe("Replaced 1 occurrence(s) of the string in /test.tsx");
      expect(fileSystem.readFile("/test.tsx")).toContain("Hello World");
    });

    test("handles special regex characters in search string", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.js", "const regex = /[a-z]+/g;");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "str_replace",
        path: "/test.js",
        old_str: "/[a-z]+/g",
        new_str: "/[A-Za-z]+/g",
      });

      expect(result).toBe("Replaced 1 occurrence(s) of the string in /test.js");
      expect(fileSystem.readFile("/test.js")).toBe(
        "const regex = /[A-Za-z]+/g;"
      );
    });

    test("handles very large line numbers gracefully", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "line1\nline2");
      const tool = buildStrReplaceTool(fileSystem);

      const result = await tool.execute({
        command: "insert",
        path: "/test.txt",
        insert_line: 1000,
        new_str: "text",
      });

      expect(result).toBe("Error: Invalid line number: 1000. File has 2 lines.");
    });
  });
});