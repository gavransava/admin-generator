import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * `@apidevtools/openapi-schemas` and `@jsdevtools/ono` end their CJS
 * modules with:
 *
 *   exports.default = someValue;
 *   if (typeof module === "object" && typeof module.exports === "object") {
 *     module.exports = Object.assign(module.exports.default, module.exports);
 *   }
 *
 * Rollup's `commonjs` plugin rewrites the `exports.default = ...` line
 * into a synthetic ESM `export default`, but leaves the trailing
 * `Object.assign(module.exports.default, ...)` alone. In the browser
 * bundle `module.exports.default` is undefined, so init crashes with
 * `Cannot convert undefined or null to object`.
 *
 * We strip the trailing `if` block from these two files during Vite's
 * `load` step — the ESM `default` re-export already covers the intent.
 */
function stripCjsDefaultInteropHack(): Plugin {
  const TARGETS = ["@apidevtools/openapi-schemas", "@jsdevtools/ono"];
  return {
    name: "strip-cjs-default-interop-hack",
    transform(code, id) {
      if (!TARGETS.some((t) => id.includes(t))) return null;
      const stripped = code.replace(
        /if\s*\(\s*typeof\s+module\s*===?\s*["']object["']\s*&&\s*typeof\s+module\.exports\s*===?\s*["']object["']\s*\)\s*\{[\s\S]*?module\.exports\s*=\s*Object\.assign\(\s*module\.exports\.default\s*,\s*module\.exports\s*\)\s*;?[\s\S]*?\}/,
        "/* CJS default-interop hack removed for browser build */",
      );
      if (stripped === code) return null;
      return { code: stripped, map: null };
    },
  };
}

export default defineConfig({
  base: "/studio/",
  plugins: [react(), stripCjsDefaultInteropHack()],
  server: {
    port: 5174,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
