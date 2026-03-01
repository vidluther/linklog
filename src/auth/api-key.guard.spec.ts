import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createHash } from "crypto";
import { ApiKeyGuard } from "./api-key.guard.js";

describe("ApiKeyGuard", () => {
  let guard: ApiKeyGuard;
  let reflector: Reflector;
  let supabase: Record<string, unknown>;

  const RAW_KEY = "lb_" + "a".repeat(64);
  const KEY_HASH = createHash("sha256").update(RAW_KEY).digest("hex");
  const USER_ID = "user-uuid-1";
  const USERNAME = "alice";

  function buildSupabaseMock(opts: {
    apiKeyRow?: Record<string, unknown> | null;
    apiKeyError?: Record<string, unknown> | null;
    profileRow?: Record<string, unknown> | null;
    profileError?: Record<string, unknown> | null;
  }) {
    const {
      apiKeyRow = { user_id: USER_ID },
      apiKeyError = null,
      profileRow = { username: USERNAME },
      profileError = null,
    } = opts;

    // Each .from() call returns a chainable builder
    const apiKeyBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: apiKeyRow, error: apiKeyError }),
      update: vi.fn().mockReturnThis(),
    };

    const profileBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: profileRow, error: profileError }),
    };

    // update chain for last_used_at (fire-and-forget)
    const updateBuilder = {
      eq: vi.fn().mockReturnThis(),
      // resolves silently
      then: vi.fn(),
    };

    const fromMock = vi.fn((table: string) => {
      if (table === "api_keys")
        return { ...apiKeyBuilder, update: vi.fn(() => updateBuilder) };
      if (table === "profiles") return profileBuilder;
      return {};
    });

    return { from: fromMock };
  }

  function createMockContext(
    opts: {
      headers?: Record<string, string>;
      params?: Record<string, string>;
      isPublic?: boolean;
    } = {},
  ): ExecutionContext {
    const { headers = {}, params = {}, isPublic = false } = opts;
    const req = { headers, params, user: undefined as unknown };
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      _req: req,
      _isPublic: isPublic,
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = new Reflector();
    supabase = buildSupabaseMock({});
    guard = new ApiKeyGuard(reflector, supabase as never);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  it("should allow access for @Public() routes without querying DB", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
    const ctx = createMockContext({ isPublic: true });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(
      (supabase as { from: ReturnType<typeof vi.fn> }).from,
    ).not.toHaveBeenCalled();
  });

  it("should throw 401 when x-api-key header is missing", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    const ctx = createMockContext({ headers: {} });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      "Missing x-api-key header",
    );
  });

  it("should throw 401 when key hash is not found in api_keys table", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    supabase = buildSupabaseMock({
      apiKeyRow: null,
      apiKeyError: { code: "PGRST116", message: "no rows" },
    });
    guard = new ApiKeyGuard(reflector, supabase as never);
    const ctx = createMockContext({ headers: { "x-api-key": RAW_KEY } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow("Invalid API key");
  });

  it("should throw 401 on unexpected DB error when looking up key", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    supabase = buildSupabaseMock({
      apiKeyRow: null,
      apiKeyError: { code: "500", message: "DB exploded" },
    });
    guard = new ApiKeyGuard(reflector, supabase as never);
    const ctx = createMockContext({ headers: { "x-api-key": RAW_KEY } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it("should throw 403 when username param does not match key owner", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    const ctx = createMockContext({
      headers: { "x-api-key": RAW_KEY },
      params: { username: "bob" }, // key belongs to 'alice'
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      "API key does not match the requested user",
    );
  });

  it("should attach request.user and return true for valid key with matching username", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    const ctx = createMockContext({
      headers: { "x-api-key": RAW_KEY },
      params: { username: USERNAME },
    });
    const req = ctx.switchToHttp().getRequest();

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(req.user).toEqual({ userId: USER_ID, username: USERNAME });
  });

  it("should attach request.user and return true when no username param (non-user-scoped route)", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    const ctx = createMockContext({
      headers: { "x-api-key": RAW_KEY },
      params: {},
    });
    const req = ctx.switchToHttp().getRequest();

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(req.user).toEqual({ userId: USER_ID, username: USERNAME });
  });

  it("should update last_used_at asynchronously (fire-and-forget)", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);

    // Rebuild mock so we can check the update call
    const updateEqMock = vi.fn().mockReturnThis();
    const updateMock = vi.fn(() => ({ eq: updateEqMock }));

    const singleApiKeyMock = vi.fn().mockResolvedValue({
      data: { user_id: USER_ID },
      error: null,
    });
    const singleProfileMock = vi.fn().mockResolvedValue({
      data: { username: USERNAME },
      error: null,
    });

    const fromMock = vi.fn((table: string) => {
      if (table === "api_keys") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: singleApiKeyMock,
          update: updateMock,
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: singleProfileMock,
      };
    });

    guard = new ApiKeyGuard(reflector, { from: fromMock } as never);

    const ctx = createMockContext({
      headers: { "x-api-key": RAW_KEY },
      params: { username: USERNAME },
    });

    await guard.canActivate(ctx);

    expect(updateMock).toHaveBeenCalledWith({
      last_used_at: expect.any(String),
    });
    expect(updateEqMock).toHaveBeenCalledWith("key_hash", KEY_HASH);
  });
});
