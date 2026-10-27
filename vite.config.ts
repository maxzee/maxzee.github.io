import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  build: {
    outDir: "dist",
    target: "es2022",
    // three.js lives in its own lazily loaded chunk
    chunkSizeWarningLimit: 700,
  },
});
