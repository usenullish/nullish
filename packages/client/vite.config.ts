import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    // React compiler setup - https://react.dev/learn/react-compiler/installation
    babel({
      presets: [reactCompilerPreset()],
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    // Vite inlines small assets (e.g. fonts) as data: URLs, which our CSP blocks.
    assetsInlineLimit: 0,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
