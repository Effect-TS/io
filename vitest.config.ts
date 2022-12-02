/// <reference types="vitest" />
import path from "path"
import { defineConfig } from "vite"
import { tsPlugin } from "./plugins/vitePlugin"

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  plugins: [tsPlugin({})],
  test: {
    include: ["./test/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["./test/utils/**/*.ts", "./test/**/*.init.ts"],
    globals: true
  },
  resolve: {
    alias: {
      "@effect/io/test": path.join(__dirname, "test"),
      "@effect/io": path.join(__dirname, "src")
    }
  }
})
