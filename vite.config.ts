import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  server: {
    port: 5173,
    host: true, // expõe na rede local para amigos acessarem
    allowedHosts: [".ngrok-free.dev"],
    fs: {
      // permite importar arquivos de shared/ (fora da root do client)
      allow: [".."],
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
