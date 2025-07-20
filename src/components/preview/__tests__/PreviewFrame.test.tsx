import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PreviewFrame } from "../PreviewFrame";

// Mock the file system context
const mockGetAllFiles = vi.fn();
const mockRefreshTrigger = 0;

vi.mock("@/lib/contexts/file-system-context", () => ({
  useFileSystem: () => ({
    getAllFiles: mockGetAllFiles,
    refreshTrigger: mockRefreshTrigger,
  }),
}));

// Mock the JSX transformer
vi.mock("@/lib/transform/jsx-transformer", () => ({
  createImportMap: vi.fn(),
  createPreviewHTML: vi.fn(),
}));

const { createImportMap: mockCreateImportMap, createPreviewHTML: mockCreatePreviewHTML } = vi.mocked(
  await import("@/lib/transform/jsx-transformer")
);

describe("PreviewFrame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    mockCreateImportMap.mockReturnValue({
      importMap: {},
      styles: "",
      errors: [],
    });
    mockCreatePreviewHTML.mockReturnValue("<html><body>Preview</body></html>");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("first load state", () => {
    test("shows welcome message on first load with no files", () => {
      mockGetAllFiles.mockReturnValue(new Map());

      render(<PreviewFrame />);

      expect(screen.getByText("Welcome to UI Generator")).toBeInTheDocument();
      expect(screen.getByText("Start building React components with AI assistance")).toBeInTheDocument();
      expect(screen.getByText("Ask the AI to create your first component to see it live here")).toBeInTheDocument();
    });

    test("shows welcome icon on first load", () => {
      mockGetAllFiles.mockReturnValue(new Map());

      render(<PreviewFrame />);

      const icon = screen.getByRole("img", { hidden: true });
      expect(icon).toHaveClass("h-8 w-8 text-blue-600");
    });
  });

  describe("error states", () => {
    test("shows error message when no files after first load", () => {
      // First render with files to clear first load state
      const filesWithContent = new Map([
        ["/App.jsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(filesWithContent);

      const { rerender } = render(<PreviewFrame />);

      // Second render with no files
      mockGetAllFiles.mockReturnValue(new Map());
      rerender(<PreviewFrame />);

      expect(screen.getByText("No Preview Available")).toBeInTheDocument();
      expect(screen.getByText("No files to preview")).toBeInTheDocument();
    });

    test("shows error when no valid entry point found", () => {
      const filesWithoutEntryPoint = new Map([
        ["/styles.css", "body { margin: 0; }"],
        ["/utils.js", "export const helper = () => {};"]
      ]);
      mockGetAllFiles.mockReturnValue(filesWithoutEntryPoint);

      render(<PreviewFrame />);

      expect(screen.getByText("No Preview Available")).toBeInTheDocument();
      expect(screen.getByText("No React component found. Create an App.jsx or index.jsx file to get started.")).toBeInTheDocument();
    });

    test("shows error when preview generation throws", () => {
      const files = new Map([
        ["/App.jsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);
      mockCreateImportMap.mockImplementation(() => {
        throw new Error("Transform error");
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<PreviewFrame />);

      expect(screen.getByText("No Preview Available")).toBeInTheDocument();
      expect(screen.getByText("Transform error")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test("shows generic error message for non-Error exceptions", () => {
      const files = new Map([
        ["/App.jsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);
      mockCreateImportMap.mockImplementation(() => {
        throw "String error";
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<PreviewFrame />);

      expect(screen.getByText("No Preview Available")).toBeInTheDocument();
      expect(screen.getByText("Unknown preview error")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test("shows AlertCircle icon in error state", () => {
      mockGetAllFiles.mockReturnValue(new Map([
        ["/styles.css", "body { margin: 0; }"]
      ]));

      render(<PreviewFrame />);

      const alertIcon = screen.getByRole("img", { hidden: true });
      expect(alertIcon).toHaveClass("h-8 w-8 text-gray-400");
    });
  });

  describe("entry point detection", () => {
    test("uses /App.jsx as default entry point", () => {
      const files = new Map([
        ["/App.jsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      expect(mockCreatePreviewHTML).toHaveBeenCalledWith(
        "/App.jsx",
        expect.any(Object),
        expect.any(String),
        expect.any(Array)
      );
    });

    test("finds App.tsx as entry point", () => {
      const files = new Map([
        ["/App.tsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      expect(mockCreatePreviewHTML).toHaveBeenCalledWith(
        "/App.tsx",
        expect.any(Object),
        expect.any(String),
        expect.any(Array)
      );
    });

    test("finds index.jsx as entry point", () => {
      const files = new Map([
        ["/index.jsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      expect(mockCreatePreviewHTML).toHaveBeenCalledWith(
        "/index.jsx",
        expect.any(Object),
        expect.any(String),
        expect.any(Array)
      );
    });

    test("finds index.tsx as entry point", () => {
      const files = new Map([
        ["/index.tsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      expect(mockCreatePreviewHTML).toHaveBeenCalledWith(
        "/index.tsx",
        expect.any(Object),
        expect.any(String),
        expect.any(Array)
      );
    });

    test("finds /src/App.jsx as entry point", () => {
      const files = new Map([
        ["/src/App.jsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      expect(mockCreatePreviewHTML).toHaveBeenCalledWith(
        "/src/App.jsx",
        expect.any(Object),
        expect.any(String),
        expect.any(Array)
      );
    });

    test("finds /src/App.tsx as entry point", () => {
      const files = new Map([
        ["/src/App.tsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      expect(mockCreatePreviewHTML).toHaveBeenCalledWith(
        "/src/App.tsx",
        expect.any(Object),
        expect.any(String),
        expect.any(Array)
      );
    });

    test("uses first JSX file when no standard entry point found", () => {
      const files = new Map([
        ["/components/Button.jsx", "export default function Button() { return <button>Click</button>; }"],
        ["/components/Header.tsx", "export default function Header() { return <header>Header</header>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      expect(mockCreatePreviewHTML).toHaveBeenCalledWith(
        "/components/Button.jsx",
        expect.any(Object),
        expect.any(String),
        expect.any(Array)
      );
    });

    test("prioritizes standard entry points over other JSX files", () => {
      const files = new Map([
        ["/components/Button.jsx", "export default function Button() { return <button>Click</button>; }"],
        ["/App.jsx", "export default function App() { return <div>App</div>; }"],
        ["/utils.js", "export const helper = () => {};"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      expect(mockCreatePreviewHTML).toHaveBeenCalledWith(
        "/App.jsx",
        expect.any(Object),
        expect.any(String),
        expect.any(Array)
      );
    });

    test("maintains current entry point if it still exists", () => {
      const files = new Map([
        ["/App.jsx", "export default function App() { return <div>App</div>; }"],
        ["/components/Button.jsx", "export default function Button() { return <button>Click</button>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      const { rerender } = render(<PreviewFrame />);

      // Change files to only have the current entry point
      const updatedFiles = new Map([
        ["/App.jsx", "export default function App() { return <div>Updated App</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(updatedFiles);

      rerender(<PreviewFrame />);

      expect(mockCreatePreviewHTML).toHaveBeenLastCalledWith(
        "/App.jsx",
        expect.any(Object),
        expect.any(String),
        expect.any(Array)
      );
    });
  });

  describe("iframe rendering", () => {
    test("renders iframe with correct props when preview is successful", () => {
      const files = new Map([
        ["/App.jsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      const iframe = screen.getByTitle("Preview");
      expect(iframe).toBeInstanceOf(HTMLIFrameElement);
      expect(iframe).toHaveClass("w-full h-full border-0 bg-white");
    });

    test("sets iframe sandbox attributes correctly", () => {
      const files = new Map([
        ["/App.jsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      const iframe = screen.getByTitle("Preview") as HTMLIFrameElement;
      expect(iframe.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin allow-forms");
    });

    test("sets iframe srcdoc with preview HTML", () => {
      const files = new Map([
        ["/App.jsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);
      mockCreatePreviewHTML.mockReturnValue("<html><body>Custom Preview</body></html>");

      render(<PreviewFrame />);

      const iframe = screen.getByTitle("Preview") as HTMLIFrameElement;
      expect(iframe.srcdoc).toBe("<html><body>Custom Preview</body></html>");
    });

    test("calls createImportMap with files", () => {
      const files = new Map([
        ["/App.jsx", "export default function App() { return <div>Hello</div>; }"],
        ["/Button.jsx", "export default function Button() { return <button>Click</button>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      expect(mockCreateImportMap).toHaveBeenCalledWith(files);
    });

    test("calls createPreviewHTML with correct parameters", () => {
      const files = new Map([
        ["/App.jsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);
      
      const mockImportMap = { imports: { "react": "/react.js" } };
      const mockStyles = "body { margin: 0; }";
      const mockErrors = ["Warning: Something"];
      
      mockCreateImportMap.mockReturnValue({
        importMap: mockImportMap,
        styles: mockStyles,
        errors: mockErrors,
      });

      render(<PreviewFrame />);

      expect(mockCreatePreviewHTML).toHaveBeenCalledWith(
        "/App.jsx",
        mockImportMap,
        mockStyles,
        mockErrors
      );
    });
  });

  describe("refresh behavior", () => {
    test("updates preview when refresh trigger changes", () => {
      const files = new Map([
        ["/App.jsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      const { rerender } = render(<PreviewFrame />);

      expect(mockCreateImportMap).toHaveBeenCalledTimes(1);

      // Simulate refresh trigger change
      vi.mocked(mockRefreshTrigger as any).mockReturnValue(1);
      rerender(<PreviewFrame />);

      expect(mockCreateImportMap).toHaveBeenCalledTimes(2);
    });

    test("clears errors when files are added after error state", () => {
      // Start with no files (error state)
      mockGetAllFiles.mockReturnValue(new Map());
      const { rerender } = render(<PreviewFrame />);

      expect(screen.getByText("Welcome to UI Generator")).toBeInTheDocument();

      // Add files
      const files = new Map([
        ["/App.jsx", "export default function App() { return <div>Hello</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);
      rerender(<PreviewFrame />);

      expect(screen.getByTitle("Preview")).toBeInTheDocument();
      expect(screen.queryByText("No Preview Available")).not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    test("handles empty file content", () => {
      const files = new Map([
        ["/App.jsx", ""]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      expect(mockCreateImportMap).toHaveBeenCalledWith(files);
      expect(screen.getByTitle("Preview")).toBeInTheDocument();
    });

    test("handles files with no JSX extension", () => {
      const files = new Map([
        ["/App.js", "export default function App() { return <div>Hello</div>; }"],
        ["/styles.css", "body { margin: 0; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      expect(screen.getByText("No Preview Available")).toBeInTheDocument();
      expect(screen.getByText("No React component found. Create an App.jsx or index.jsx file to get started.")).toBeInTheDocument();
    });

    test("handles multiple possible entry points by priority", () => {
      const files = new Map([
        ["/index.tsx", "export default function Index() { return <div>Index</div>; }"],
        ["/App.jsx", "export default function App() { return <div>App</div>; }"],
        ["/index.jsx", "export default function Index() { return <div>Index JSX</div>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      // Should prioritize /App.jsx over index files
      expect(mockCreatePreviewHTML).toHaveBeenCalledWith(
        "/App.jsx",
        expect.any(Object),
        expect.any(String),
        expect.any(Array)
      );
    });

    test("handles very large number of files", () => {
      const files = new Map();
      for (let i = 0; i < 1000; i++) {
        files.set(`/component${i}.jsx`, `export default function Component${i}() { return <div>Component ${i}</div>; }`);
      }
      files.set("/App.jsx", "export default function App() { return <div>App</div>; }");
      
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      expect(mockCreateImportMap).toHaveBeenCalledWith(files);
      expect(screen.getByTitle("Preview")).toBeInTheDocument();
    });

    test("handles files with special characters in paths", () => {
      const files = new Map([
        ["/App (copy).jsx", "export default function App() { return <div>Hello</div>; }"],
        ["/Button-component.jsx", "export default function Button() { return <button>Click</button>; }"]
      ]);
      mockGetAllFiles.mockReturnValue(files);

      render(<PreviewFrame />);

      // Should use the first JSX file found since no standard entry point exists
      expect(mockCreatePreviewHTML).toHaveBeenCalledWith(
        "/App (copy).jsx",
        expect.any(Object),
        expect.any(String),
        expect.any(Array)
      );
    });
  });
});