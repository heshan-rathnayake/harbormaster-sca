import base from "@harbormaster/eslint-config/base";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["src/generated/", "dist/", "dist-relay/"]),
  base,
  {
    languageOptions: {
      parserOptions: {
        // Nest injects dependencies by the types in constructor signatures, so
        // the lint rule must not turn those imports into type-only imports.
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
      },
    },
  },
]);
