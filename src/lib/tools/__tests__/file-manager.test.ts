import { test, expect, describe } from "vitest";
import { VirtualFileSystem } from "@/lib/file-system";
import { buildFileManagerTool } from "../file-manager";

describe("FileManagerTool", () => {
  test("creates file manager tool with correct description and parameters", () => {
    const fileSystem = new VirtualFileSystem();
    const tool = buildFileManagerTool(fileSystem);

    expect(tool.description).toContain("Rename or delete files or folders");
    expect(tool.parameters).toBeDefined();
  });

  describe("rename command", () => {
    test("successfully renames a file", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "content");
      const tool = buildFileManagerTool(fileSystem);

      const result = await tool.execute({
        command: "rename",
        path: "/test.txt",
        new_path: "/renamed.txt",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully renamed /test.txt to /renamed.txt",
      });
      expect(fileSystem.exists("/test.txt")).toBe(false);
      expect(fileSystem.exists("/renamed.txt")).toBe(true);
    });

    test("successfully renames a directory", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createDirectory("/src");
      fileSystem.createFile("/src/index.ts", "content");
      const tool = buildFileManagerTool(fileSystem);

      const result = await tool.execute({
        command: "rename",
        path: "/src",
        new_path: "/app",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully renamed /src to /app",
      });
      expect(fileSystem.exists("/src")).toBe(false);
      expect(fileSystem.exists("/app")).toBe(true);
      expect(fileSystem.exists("/app/index.ts")).toBe(true);
    });

    test("fails when new_path is not provided", async () => {
      const fileSystem = new VirtualFileSystem();
      const tool = buildFileManagerTool(fileSystem);

      const result = await tool.execute({
        command: "rename",
        path: "/test.txt",
      });

      expect(result).toEqual({
        success: false,
        error: "new_path is required for rename command",
      });
    });

    test("fails when source file doesn't exist", async () => {
      const fileSystem = new VirtualFileSystem();
      const tool = buildFileManagerTool(fileSystem);

      const result = await tool.execute({
        command: "rename",
        path: "/nonexistent.txt",
        new_path: "/renamed.txt",
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to rename /nonexistent.txt to /renamed.txt",
      });
    });

    test("fails when destination already exists", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/source.txt", "source");
      fileSystem.createFile("/dest.txt", "dest");
      const tool = buildFileManagerTool(fileSystem);

      const result = await tool.execute({
        command: "rename",
        path: "/source.txt",
        new_path: "/dest.txt",
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to rename /source.txt to /dest.txt",
      });
    });

    test("creates parent directories when renaming", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "content");
      const tool = buildFileManagerTool(fileSystem);

      const result = await tool.execute({
        command: "rename",
        path: "/test.txt",
        new_path: "/new/path/test.txt",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully renamed /test.txt to /new/path/test.txt",
      });
      expect(fileSystem.exists("/new")).toBe(true);
      expect(fileSystem.exists("/new/path")).toBe(true);
      expect(fileSystem.exists("/new/path/test.txt")).toBe(true);
    });
  });

  describe("delete command", () => {
    test("successfully deletes a file", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test.txt", "content");
      const tool = buildFileManagerTool(fileSystem);

      const result = await tool.execute({
        command: "delete",
        path: "/test.txt",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully deleted /test.txt",
      });
      expect(fileSystem.exists("/test.txt")).toBe(false);
    });

    test("successfully deletes a directory recursively", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createDirectory("/src");
      fileSystem.createFile("/src/index.ts", "content");
      fileSystem.createDirectory("/src/components");
      fileSystem.createFile("/src/components/Button.tsx", "button");
      const tool = buildFileManagerTool(fileSystem);

      const result = await tool.execute({
        command: "delete",
        path: "/src",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully deleted /src",
      });
      expect(fileSystem.exists("/src")).toBe(false);
      expect(fileSystem.exists("/src/index.ts")).toBe(false);
      expect(fileSystem.exists("/src/components")).toBe(false);
      expect(fileSystem.exists("/src/components/Button.tsx")).toBe(false);
    });

    test("fails when file doesn't exist", async () => {
      const fileSystem = new VirtualFileSystem();
      const tool = buildFileManagerTool(fileSystem);

      const result = await tool.execute({
        command: "delete",
        path: "/nonexistent.txt",
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to delete /nonexistent.txt",
      });
    });

    test("fails when trying to delete root directory", async () => {
      const fileSystem = new VirtualFileSystem();
      const tool = buildFileManagerTool(fileSystem);

      const result = await tool.execute({
        command: "delete",
        path: "/",
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to delete /",
      });
      expect(fileSystem.exists("/")).toBe(true);
    });
  });

  describe("invalid commands", () => {
    test("returns error for invalid command", async () => {
      const fileSystem = new VirtualFileSystem();
      const tool = buildFileManagerTool(fileSystem);

      const result = await tool.execute({
        command: "invalid" as any,
        path: "/test.txt",
      });

      expect(result).toEqual({
        success: false,
        error: "Invalid command",
      });
    });
  });

  describe("edge cases", () => {
    test("handles empty paths gracefully", async () => {
      const fileSystem = new VirtualFileSystem();
      const tool = buildFileManagerTool(fileSystem);

      const result = await tool.execute({
        command: "delete",
        path: "",
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to delete ",
      });
    });

    test("handles special characters in paths", async () => {
      const fileSystem = new VirtualFileSystem();
      fileSystem.createFile("/test file.txt", "content");
      const tool = buildFileManagerTool(fileSystem);

      const result = await tool.execute({
        command: "rename",
        path: "/test file.txt",
        new_path: "/test-file.txt",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully renamed /test file.txt to /test-file.txt",
      });
    });
  });
});