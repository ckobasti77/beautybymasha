import { defineConfig } from "vitest/config";

/** _ref/ je citanka, ne deo projekta — njegovi testovi se ne pokrecu. */
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "convex/**/*.test.ts", "components/**/*.test.ts?(x)"],
    exclude: ["_ref/**", "node_modules/**", ".next/**"],
    // lib/* testovi rade u node-u; convex-test fajlovi traze edge-runtime i to
    // deklarisu sami (`// @vitest-environment edge-runtime` na vrhu fajla).
    environment: "node",
    server: { deps: { inline: ["convex-test"] } },
  },
});
