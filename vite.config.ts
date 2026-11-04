import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    // Preserve Calcite's native light-dark() tokens, including inline stylesheets.
    cssTarget: ["chrome124", "edge124", "firefox128", "safari18"],
  },
});
