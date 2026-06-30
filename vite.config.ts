import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: [".."],
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          warning.code === "MODULE_LEVEL_DIRECTIVE" &&
          warning.message.includes("framer-motion") &&
          warning.message.includes('"use client"')
        ) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("react")) return "react";
          if (id.includes("socket.io-client") || id.includes("engine.io-client")) {
            return "socket";
          }
          return "vendor";
        },
      },
    },
  },
});
