// Safari/Firefox expose `browser` on globalThis; Chrome does not.
// This augmentation lets the runtime shim (`globalThis.browser ?? globalThis.chrome`) type-check.
declare namespace globalThis {
  var browser: typeof chrome | undefined;
}
