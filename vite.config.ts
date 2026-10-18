import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig(({ mode }) => {
  // Same .env as the API server, so HOST and PORT only need setting once.
  const env = loadEnv(mode, r("."), "");
  return {
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
      // Loopback unless HOST says otherwise (HOST=0.0.0.0 to open it from a phone on the Wi-Fi).
      host: env.HOST || "127.0.0.1",
      port: 5173,
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${env.PORT || 3000}`,
          // Keep the browser's Host header. The API checks Origin against it to block
          // cross-site requests, and the string shorthand would rewrite it to the target.
          changeOrigin: false,
        },
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
  };
});
