import { ExecutionContext } from "@nestjs/common";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { CurrentUser } from "./current-user.decorator.js";

// Helper: invoke the param decorator factory to get the data extraction function
function getDecoratorFactory(
  decorator: () => ParameterDecorator,
): (ctx: ExecutionContext) => unknown {
  class TestClass {
    testMethod(@decorator() _user: unknown) {}
  }

  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestClass,
    "testMethod",
  );
  const entry = Object.values(
    args as Record<
      string,
      { factory: (data: unknown, ctx: ExecutionContext) => unknown }
    >,
  )[0];
  return (ctx: ExecutionContext) => entry.factory(undefined, ctx);
}

function createMockContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe("@CurrentUser() decorator", () => {
  const extract = getDecoratorFactory(CurrentUser);

  it("returns request.user when set", () => {
    const user = { userId: "abc-123", username: "vid" };
    const ctx = createMockContext(user);

    expect(extract(ctx)).toEqual(user);
  });

  it("returns undefined when request.user is not set", () => {
    const ctx = createMockContext(undefined);

    expect(extract(ctx)).toBeUndefined();
  });

  it("returns the full user object shape", () => {
    const user = { userId: "uuid-here", username: "alice" };
    const ctx = createMockContext(user);
    const result = extract(ctx) as typeof user;

    expect(result.userId).toBe("uuid-here");
    expect(result.username).toBe("alice");
  });
});
