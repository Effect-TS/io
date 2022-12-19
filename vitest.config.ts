/// <reference types="vitest" />
import { effectPlugin } from "@effect/vite-plugin"
import path from "path"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [effectPlugin({ tsconfig: "tsconfig.test.json", babel: { plugins: [["annotate-pure-calls"]] } })],
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
