import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Minimal SPA build config to produce a static index.html in dist/client
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    outDir: "dist/client",
    emptyOutDir: false,
  },
});
