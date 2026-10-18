import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: r("./client"),
  publicDir: r("./client/public"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": r("./client/src"),
      "@shared": r("./shared"),
      "@content": r("./content"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  build: {
    outDir: r("./dist/client"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router"],
          charts: ["recharts"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-alert-dialog", "@radix-ui/react-select", "@radix-ui/react-tabs", "@tanstack/react-query", "lucide-react"],
        },
      },
    },
  },
});
