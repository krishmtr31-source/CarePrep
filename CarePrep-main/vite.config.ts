import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleGeminiApiRequest } from './src/backend/server/geminiApiHandler';

function geminiApiPlugin(): Plugin {
  return {
    name: 'gemini-api-middleware-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/ai/')) {
          const handled = await handleGeminiApiRequest(req, res);
          if (handled) return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/ai/')) {
          const handled = await handleGeminiApiRequest(req, res);
          if (handled) return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), geminiApiPlugin()],
  server: {
    port: 3000,
    open: false
  }
});
