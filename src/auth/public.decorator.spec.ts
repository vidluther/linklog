import { IS_PUBLIC_KEY, Public } from "./public.decorator";

describe("Public decorator", () => {
  it("should set IS_PUBLIC_KEY metadata to true", () => {
    // Apply the decorator to a test target
    @Public()
    class TestClass {}

    const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, TestClass);
    expect(metadata).toBe(true);
  });

  it("should export the correct metadata key", () => {
    expect(IS_PUBLIC_KEY).toBe("isPublic");
  });
});
