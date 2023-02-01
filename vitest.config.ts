/// <reference types="vitest" />

import babel from "@vitejs/plugin-react"
import path from "path"
import { defineConfig } from "vite"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const babelConfig = require("./.babel.mjs.json")

export default defineConfig({
  plugins: [babel({ babel: babelConfig })],
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
