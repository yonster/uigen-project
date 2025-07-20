import { test, expect, describe } from "vitest";
import { cn } from "../utils";

describe("cn utility", () => {
  test("merges single class string", () => {
    expect(cn("bg-red-500")).toBe("bg-red-500");
  });

  test("merges multiple class strings", () => {
    expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
  });

  test("handles class arrays", () => {
    expect(cn(["bg-red-500", "text-white"])).toBe("bg-red-500 text-white");
  });

  test("handles conditional classes", () => {
    expect(cn("bg-red-500", false && "hidden", "text-white")).toBe("bg-red-500 text-white");
    expect(cn("bg-red-500", true && "hidden", "text-white")).toBe("bg-red-500 hidden text-white");
  });

  test("handles object syntax", () => {
    expect(cn({
      "bg-red-500": true,
      "text-white": false,
      "hidden": true
    })).toBe("bg-red-500 hidden");
  });

  test("handles mixed inputs", () => {
    expect(cn(
      "base-class",
      ["array-class1", "array-class2"],
      { "conditional-class": true, "false-class": false },
      false && "hidden",
      "final-class"
    )).toBe("base-class array-class1 array-class2 conditional-class final-class");
  });

  test("deduplicates classes", () => {
    expect(cn("bg-red-500", "bg-red-500")).toBe("bg-red-500");
  });

  test("handles Tailwind conflicts with twMerge", () => {
    // twMerge should resolve conflicts by keeping the last one
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  test("handles empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn("", null, undefined)).toBe("");
  });

  test("handles whitespace normalization", () => {
    expect(cn("  bg-red-500  ", "  text-white  ")).toBe("bg-red-500 text-white");
  });

  test("handles complex Tailwind combinations", () => {
    // Test responsive classes
    expect(cn("block", "md:hidden", "lg:block")).toBe("block md:hidden lg:block");
    
    // Test pseudo-classes
    expect(cn("hover:bg-red-500", "focus:bg-blue-500")).toBe("hover:bg-red-500 focus:bg-blue-500");
  });

  test("handles variant conflicts correctly", () => {
    // Test that more specific variants take precedence
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
    expect(cn("m-4", "mx-2")).toBe("m-4 mx-2"); // mx-2 should override margin-x from m-4
    expect(cn("mx-2", "m-4")).toBe("m-4"); // m-4 should override mx-2 completely
  });

  test("handles dark mode classes", () => {
    expect(cn("bg-white", "dark:bg-gray-900")).toBe("bg-white dark:bg-gray-900");
  });

  test("handles arbitrary values", () => {
    expect(cn("bg-[#ff0000]", "text-[12px]")).toBe("bg-[#ff0000] text-[12px]");
    expect(cn("bg-red-500", "bg-[#ff0000]")).toBe("bg-[#ff0000]");
  });

  test("handles complex component className patterns", () => {
    // Common pattern: base classes + conditional modifiers
    const isActive = true;
    const variant = "primary";
    const size = "lg";
    
    expect(cn(
      "inline-flex items-center justify-center rounded-md font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2",
      {
        "bg-primary text-primary-foreground hover:bg-primary/90": variant === "primary",
        "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
        "h-10 px-4 py-2": size === "default",
        "h-11 px-8": size === "lg",
        "ring-2 ring-primary": isActive
      }
    )).toBe("inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 ring-2 ring-primary");
  });

  test("handles null and undefined gracefully", () => {
    expect(cn(null)).toBe("");
    expect(cn(undefined)).toBe("");
    expect(cn("bg-red-500", null, "text-white", undefined)).toBe("bg-red-500 text-white");
  });

  test("handles nested arrays", () => {
    expect(cn(["bg-red-500", ["text-white", "font-bold"]])).toBe("bg-red-500 text-white font-bold");
  });

  test("handles numbers gracefully", () => {
    expect(cn("bg-red-500", 0, "text-white")).toBe("bg-red-500 text-white");
    expect(cn("bg-red-500", 1, "text-white")).toBe("bg-red-500 1 text-white");
  });

  test("stress test with many classes", () => {
    const classes = Array.from({ length: 100 }, (_, i) => `class-${i}`);
    const result = cn(...classes);
    
    // Should contain all classes
    classes.forEach(cls => {
      expect(result).toContain(cls);
    });
  });

  test("real-world button component example", () => {
    const buttonClasses = cn(
      // Base styles
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      
      // Variant styles
      "bg-primary text-primary-foreground hover:bg-primary/90",
      
      // Size styles
      "h-10 px-4 py-2",
      
      // State styles
      { "opacity-50 cursor-not-allowed": false }
    );

    expect(buttonClasses).toContain("inline-flex");
    expect(buttonClasses).toContain("bg-primary");
    expect(buttonClasses).toContain("disabled:opacity-50"); // This is part of the base classes
  });
});