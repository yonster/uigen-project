import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import {
  setHasAnonWork,
  getHasAnonWork,
  getAnonWorkData,
  clearAnonWork,
} from "../anon-work-tracker";

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(global, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
});

// Mock window object
Object.defineProperty(global, "window", {
  value: {
    sessionStorage: mockSessionStorage,
  },
  writable: true,
});

describe("anon-work-tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("setHasAnonWork", () => {
    test("sets storage when messages are present", () => {
      const messages = [
        { role: "user", content: "Create a button" },
        { role: "assistant", content: "I'll create a button for you" },
      ];
      const fileSystemData = {};

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith("uigen_has_anon_work", "true");
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "uigen_anon_data",
        JSON.stringify({ messages, fileSystemData })
      );
    });

    test("sets storage when file system has more than root directory", () => {
      const messages: any[] = [];
      const fileSystemData = {
        "/": { type: "directory" },
        "/App.jsx": { type: "file", content: "export default function App() {}" },
      };

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith("uigen_has_anon_work", "true");
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "uigen_anon_data",
        JSON.stringify({ messages, fileSystemData })
      );
    });

    test("does not set storage when no meaningful content", () => {
      const messages: any[] = [];
      const fileSystemData = { "/": { type: "directory" } }; // Only root directory

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    test("does not set storage when file system is empty", () => {
      const messages: any[] = [];
      const fileSystemData = {};

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    test("handles server-side rendering gracefully", () => {
      // Temporarily remove window
      const originalWindow = global.window;
      delete (global as any).window;

      const messages = [{ role: "user", content: "Hello" }];
      const fileSystemData = {};

      // Should not throw
      expect(() => setHasAnonWork(messages, fileSystemData)).not.toThrow();
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();

      // Restore window
      global.window = originalWindow;
    });

    test("sets storage with complex data structures", () => {
      const messages = [
        {
          role: "user",
          content: "Create a complex component",
          timestamp: Date.now(),
        },
        {
          role: "assistant",
          content: "I'll create that for you",
          toolCalls: [
            {
              type: "file_create",
              args: { path: "/Component.jsx", content: "export default function Component() {}" },
            },
          ],
        },
      ];
      const fileSystemData = {
        "/": { type: "directory" },
        "/Component.jsx": { type: "file", content: "export default function Component() {}" },
        "/styles.css": { type: "file", content: "body { margin: 0; }" },
      };

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith("uigen_has_anon_work", "true");
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "uigen_anon_data",
        JSON.stringify({ messages, fileSystemData })
      );
    });

    test("overwrites existing data", () => {
      const messages1 = [{ role: "user", content: "First message" }];
      const fileSystemData1 = {};

      const messages2 = [{ role: "user", content: "Second message" }];
      const fileSystemData2 = {};

      setHasAnonWork(messages1, fileSystemData1);
      setHasAnonWork(messages2, fileSystemData2);

      expect(mockSessionStorage.setItem).toHaveBeenCalledTimes(4); // 2 calls per invocation
      expect(mockSessionStorage.setItem).toHaveBeenLastCalledWith(
        "uigen_anon_data",
        JSON.stringify({ messages: messages2, fileSystemData: fileSystemData2 })
      );
    });
  });

  describe("getHasAnonWork", () => {
    test("returns true when storage has anon work flag", () => {
      mockSessionStorage.getItem.mockReturnValue("true");

      const result = getHasAnonWork();

      expect(result).toBe(true);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("uigen_has_anon_work");
    });

    test("returns false when storage does not have anon work flag", () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const result = getHasAnonWork();

      expect(result).toBe(false);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("uigen_has_anon_work");
    });

    test("returns false when storage has non-true value", () => {
      mockSessionStorage.getItem.mockReturnValue("false");

      const result = getHasAnonWork();

      expect(result).toBe(false);
    });

    test("handles server-side rendering gracefully", () => {
      // Temporarily remove window
      const originalWindow = global.window;
      delete (global as any).window;

      const result = getHasAnonWork();

      expect(result).toBe(false);
      expect(mockSessionStorage.getItem).not.toHaveBeenCalled();

      // Restore window
      global.window = originalWindow;
    });
  });

  describe("getAnonWorkData", () => {
    test("returns parsed data when storage contains valid JSON", () => {
      const mockData = {
        messages: [{ role: "user", content: "Hello" }],
        fileSystemData: { "/App.jsx": { content: "export default function App() {}" } },
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(mockData));

      const result = getAnonWorkData();

      expect(result).toEqual(mockData);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("uigen_anon_data");
    });

    test("returns null when storage is empty", () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const result = getAnonWorkData();

      expect(result).toBeNull();
    });

    test("returns null when storage contains invalid JSON", () => {
      mockSessionStorage.getItem.mockReturnValue("{ invalid json");

      const result = getAnonWorkData();

      expect(result).toBeNull();
    });

    test("returns null when storage contains non-string data", () => {
      mockSessionStorage.getItem.mockReturnValue("");

      const result = getAnonWorkData();

      expect(result).toBeNull();
    });

    test("handles server-side rendering gracefully", () => {
      // Temporarily remove window
      const originalWindow = global.window;
      delete (global as any).window;

      const result = getAnonWorkData();

      expect(result).toBeNull();
      expect(mockSessionStorage.getItem).not.toHaveBeenCalled();

      // Restore window
      global.window = originalWindow;
    });

    test("handles complex nested data structures", () => {
      const complexData = {
        messages: [
          {
            role: "assistant",
            content: "I'll create components",
            toolCalls: [
              {
                type: "file_create",
                args: { path: "/Button.jsx" },
                result: { success: true },
              },
            ],
          },
        ],
        fileSystemData: {
          "/": { type: "directory" },
          "/components": { type: "directory" },
          "/components/Button.jsx": {
            type: "file",
            content: "export default function Button(props) { return <button {...props} />; }",
          },
        },
      };

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(complexData));

      const result = getAnonWorkData();

      expect(result).toEqual(complexData);
    });

    test("preserves data types in parsed JSON", () => {
      const dataWithTypes = {
        messages: [
          {
            role: "user",
            content: "Test message",
            timestamp: 1672531200000, // Number
            metadata: {
              source: "chat", // String
              urgent: true, // Boolean
              tags: ["test", "demo"], // Array
            },
          },
        ],
        fileSystemData: {
          count: 42, // Number
          enabled: false, // Boolean
          items: [1, 2, 3], // Array of numbers
        },
      };

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(dataWithTypes));

      const result = getAnonWorkData();

      expect(result).toEqual(dataWithTypes);
      expect(typeof result?.messages[0].timestamp).toBe("number");
      expect(typeof result?.messages[0].metadata.urgent).toBe("boolean");
      expect(Array.isArray(result?.messages[0].metadata.tags)).toBe(true);
    });

    test("handles circular references gracefully", () => {
      // Create circular reference data (which JSON.stringify would have failed on)
      // This test simulates what happens when invalid JSON is stored
      mockSessionStorage.getItem.mockReturnValue("{ malformed");

      const result = getAnonWorkData();

      expect(result).toBeNull();
    });
  });

  describe("clearAnonWork", () => {
    test("removes both storage keys", () => {
      clearAnonWork();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("uigen_has_anon_work");
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("uigen_anon_data");
    });

    test("handles server-side rendering gracefully", () => {
      // Temporarily remove window
      const originalWindow = global.window;
      delete (global as any).window;

      // Should not throw
      expect(() => clearAnonWork()).not.toThrow();
      expect(mockSessionStorage.removeItem).not.toHaveBeenCalled();

      // Restore window
      global.window = originalWindow;
    });

    test("can be called multiple times safely", () => {
      clearAnonWork();
      clearAnonWork();
      clearAnonWork();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledTimes(6); // 2 calls × 3 invocations
    });
  });

  describe("integration workflow", () => {
    test("complete workflow: set, get, clear", () => {
      const messages = [{ role: "user", content: "Create a button" }];
      const fileSystemData = {
        "/": { type: "directory" },
        "/Button.jsx": { type: "file", content: "export default function Button() {}" },
      };

      // Initially no anon work
      mockSessionStorage.getItem.mockReturnValue(null);
      expect(getHasAnonWork()).toBe(false);
      expect(getAnonWorkData()).toBeNull();

      // Set anon work
      setHasAnonWork(messages, fileSystemData);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith("uigen_has_anon_work", "true");

      // Mock storage returns for get operations
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === "uigen_has_anon_work") return "true";
        if (key === "uigen_anon_data") return JSON.stringify({ messages, fileSystemData });
        return null;
      });

      // Check anon work exists
      expect(getHasAnonWork()).toBe(true);
      expect(getAnonWorkData()).toEqual({ messages, fileSystemData });

      // Clear anon work
      clearAnonWork();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("uigen_has_anon_work");
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("uigen_anon_data");

      // Mock storage returns null after clearing
      mockSessionStorage.getItem.mockReturnValue(null);
      expect(getHasAnonWork()).toBe(false);
      expect(getAnonWorkData()).toBeNull();
    });

    test("handles edge case where flag exists but data doesn't", () => {
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === "uigen_has_anon_work") return "true";
        if (key === "uigen_anon_data") return null;
        return null;
      });

      expect(getHasAnonWork()).toBe(true);
      expect(getAnonWorkData()).toBeNull();
    });

    test("handles edge case where data exists but flag doesn't", () => {
      const mockData = { messages: [], fileSystemData: {} };
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === "uigen_has_anon_work") return null;
        if (key === "uigen_anon_data") return JSON.stringify(mockData);
        return null;
      });

      expect(getHasAnonWork()).toBe(false);
      expect(getAnonWorkData()).toEqual(mockData);
    });
  });

  describe("storage key constants", () => {
    test("uses consistent storage keys", () => {
      const messages = [{ role: "user", content: "Test" }];
      const fileSystemData = { "/test.txt": { content: "test" } };

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "uigen_has_anon_work",
        expect.any(String)
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "uigen_anon_data",
        expect.any(String)
      );

      getHasAnonWork();
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("uigen_has_anon_work");

      getAnonWorkData();
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("uigen_anon_data");

      clearAnonWork();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("uigen_has_anon_work");
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("uigen_anon_data");
    });
  });
});