import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock server-only to avoid import error
vi.mock("server-only", () => ({}));

// Import after mocking server-only
import { createSession, getSession, deleteSession, verifySession } from "../auth";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock jose library
vi.mock("jose", () => ({
  SignJWT: vi.fn(),
  jwtVerify: vi.fn(),
}));

const mockCookies = vi.fn();
const mockSignJWT = vi.fn();
const mockJwtVerify = vi.fn();

// Get the mocked modules
const { cookies } = await import("next/headers");
const { SignJWT, jwtVerify } = await import("jose");

vi.mocked(cookies).mockImplementation(mockCookies);
vi.mocked(SignJWT).mockImplementation(() => mockSignJWT as any);
vi.mocked(jwtVerify).mockImplementation(mockJwtVerify as any);

describe("Auth", () => {
  const mockCookieStore = {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue(mockCookieStore);
    
    // Setup SignJWT mock chain
    const signJWTInstance = {
      setProtectedHeader: vi.fn().mockReturnThis(),
      setExpirationTime: vi.fn().mockReturnThis(),
      setIssuedAt: vi.fn().mockReturnThis(),
      sign: vi.fn().mockResolvedValue("mock-token"),
    };
    
    mockSignJWT.mockReturnValue(signJWTInstance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createSession", () => {
    test("creates a session with correct parameters", async () => {
      const userId = "user-123";
      const email = "test@example.com";

      await createSession(userId, email);

      // Verify SignJWT was called with correct payload
      expect(mockSignJWT).toHaveBeenCalledWith({
        userId,
        email,
        expiresAt: expect.any(Date),
      });

      // Verify JWT methods were called
      const jwtInstance = mockSignJWT.mock.results[0].value;
      expect(jwtInstance.setProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
      expect(jwtInstance.setExpirationTime).toHaveBeenCalledWith("7d");
      expect(jwtInstance.setIssuedAt).toHaveBeenCalled();
      expect(jwtInstance.sign).toHaveBeenCalled();

      // Verify cookie was set
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        "mock-token",
        {
          httpOnly: true,
          secure: false, // process.env.NODE_ENV is not "production" in tests
          sameSite: "lax",
          expires: expect.any(Date),
          path: "/",
        }
      );
    });

    test("sets secure cookie in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        await createSession("user-123", "test@example.com");

        expect(mockCookieStore.set).toHaveBeenCalledWith(
          "auth-token",
          "mock-token",
          expect.objectContaining({
            secure: true,
          })
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test("creates session with 7-day expiration", async () => {
      const beforeCall = Date.now();
      await createSession("user-123", "test@example.com");
      const afterCall = Date.now();

      const setCall = mockCookieStore.set.mock.calls[0];
      const cookieOptions = setCall[2];
      const expiresTime = cookieOptions.expires.getTime();

      // Should be roughly 7 days from now (within 1 second tolerance)
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      expect(expiresTime).toBeGreaterThanOrEqual(beforeCall + sevenDays - 1000);
      expect(expiresTime).toBeLessThanOrEqual(afterCall + sevenDays + 1000);
    });
  });

  describe("getSession", () => {
    test("returns session when valid token exists", async () => {
      const mockPayload = {
        userId: "user-123",
        email: "test@example.com",
        expiresAt: new Date(),
      };

      mockCookieStore.get.mockReturnValue({ value: "valid-token" });
      mockJwtVerify.mockResolvedValue({ payload: mockPayload });

      const session = await getSession();

      expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
      expect(mockJwtVerify).toHaveBeenCalledWith("valid-token", expect.any(Uint8Array));
      expect(session).toEqual(mockPayload);
    });

    test("returns null when no token exists", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const session = await getSession();

      expect(session).toBeNull();
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    test("returns null when token verification fails", async () => {
      mockCookieStore.get.mockReturnValue({ value: "invalid-token" });
      mockJwtVerify.mockRejectedValue(new Error("Invalid token"));

      const session = await getSession();

      expect(session).toBeNull();
      expect(mockJwtVerify).toHaveBeenCalledWith("invalid-token", expect.any(Uint8Array));
    });

    test("returns null when cookie has no value", async () => {
      mockCookieStore.get.mockReturnValue({ value: null });

      const session = await getSession();

      expect(session).toBeNull();
    });

    test("handles different JWT verification errors", async () => {
      mockCookieStore.get.mockReturnValue({ value: "expired-token" });
      
      // Test various JWT errors
      const errors = [
        new Error("Token expired"),
        new Error("Invalid signature"),
        new Error("Malformed token"),
      ];

      for (const error of errors) {
        mockJwtVerify.mockRejectedValueOnce(error);
        const session = await getSession();
        expect(session).toBeNull();
      }
    });
  });

  describe("deleteSession", () => {
    test("deletes the auth cookie", async () => {
      await deleteSession();

      expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
    });

    test("calls cookies function to get cookie store", async () => {
      await deleteSession();

      expect(mockCookies).toHaveBeenCalled();
    });
  });

  describe("verifySession", () => {
    test("returns session when valid token exists in request", async () => {
      const mockPayload = {
        userId: "user-123",
        email: "test@example.com",
        expiresAt: new Date(),
      };

      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: "valid-token" }),
        },
      } as unknown as NextRequest;

      mockJwtVerify.mockResolvedValue({ payload: mockPayload });

      const session = await verifySession(mockRequest);

      expect(mockRequest.cookies.get).toHaveBeenCalledWith("auth-token");
      expect(mockJwtVerify).toHaveBeenCalledWith("valid-token", expect.any(Uint8Array));
      expect(session).toEqual(mockPayload);
    });

    test("returns null when no token exists in request", async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue(undefined),
        },
      } as unknown as NextRequest;

      const session = await verifySession(mockRequest);

      expect(session).toBeNull();
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    test("returns null when token verification fails", async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: "invalid-token" }),
        },
      } as unknown as NextRequest;

      mockJwtVerify.mockRejectedValue(new Error("Invalid token"));

      const session = await verifySession(mockRequest);

      expect(session).toBeNull();
    });

    test("handles cookie with no value", async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: null }),
        },
      } as unknown as NextRequest;

      const session = await verifySession(mockRequest);

      expect(session).toBeNull();
    });

    test("handles missing cookie object", async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest;

      const session = await verifySession(mockRequest);

      expect(session).toBeNull();
    });
  });

  describe("JWT Secret handling", () => {
    test("uses development secret when JWT_SECRET is not set", async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      try {
        await createSession("user-123", "test@example.com");

        const jwtInstance = mockSignJWT.mock.results[0].value;
        const signCall = jwtInstance.sign.mock.calls[0];
        const secretUsed = signCall[0];

        // Should use development secret when env var is not set
        expect(secretUsed).toEqual(new TextEncoder().encode("development-secret-key"));
      } finally {
        if (originalSecret) {
          process.env.JWT_SECRET = originalSecret;
        }
      }
    });

    test("uses environment JWT_SECRET when available", async () => {
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = "custom-secret-key";

      try {
        await createSession("user-123", "test@example.com");

        const jwtInstance = mockSignJWT.mock.results[0].value;
        const signCall = jwtInstance.sign.mock.calls[0];
        const secretUsed = signCall[0];

        expect(secretUsed).toEqual(new TextEncoder().encode("custom-secret-key"));
      } finally {
        if (originalSecret) {
          process.env.JWT_SECRET = originalSecret;
        } else {
          delete process.env.JWT_SECRET;
        }
      }
    });
  });

  describe("SessionPayload interface compliance", () => {
    test("createSession generates payload with correct structure", async () => {
      const userId = "user-123";
      const email = "test@example.com";

      await createSession(userId, email);

      const payload = mockSignJWT.mock.calls[0][0];
      
      expect(payload).toHaveProperty("userId", userId);
      expect(payload).toHaveProperty("email", email);
      expect(payload).toHaveProperty("expiresAt");
      expect(payload.expiresAt).toBeInstanceOf(Date);
    });

    test("getSession returns payload with correct typing", async () => {
      const mockPayload = {
        userId: "user-123",
        email: "test@example.com",
        expiresAt: new Date("2024-12-31"),
      };

      mockCookieStore.get.mockReturnValue({ value: "valid-token" });
      mockJwtVerify.mockResolvedValue({ payload: mockPayload });

      const session = await getSession();

      expect(session).toEqual({
        userId: "user-123",
        email: "test@example.com",
        expiresAt: expect.any(Date),
      });
    });
  });

  describe("Edge cases and error conditions", () => {
    test("handles undefined cookie store methods gracefully", async () => {
      const incompleteCookieStore = {
        set: vi.fn(),
        // Missing get and delete methods
      };
      
      mockCookies.mockResolvedValue(incompleteCookieStore as any);

      // Should not throw, but will fail when trying to call missing methods
      await expect(getSession()).rejects.toThrow();
    });

    test("handles malformed JWT payload", async () => {
      mockCookieStore.get.mockReturnValue({ value: "valid-token" });
      mockJwtVerify.mockResolvedValue({ 
        payload: "not-an-object" // Invalid payload type
      });

      const session = await getSession();
      
      // Should still return the payload even if it's malformed
      // The type casting in the actual code handles this
      expect(session).toBe("not-an-object");
    });

    test("handles async cookie operations", async () => {
      // Simulate slow cookie operations
      mockCookies.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockCookieStore), 10))
      );

      const startTime = Date.now();
      await createSession("user-123", "test@example.com");
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(10);
      expect(mockCookieStore.set).toHaveBeenCalled();
    });
  });
});