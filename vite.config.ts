import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleBackendApiRequest } from './src/backend/server/apiRouter';

function backendApiPlugin(env: Record<string, string>): Plugin {
  // Sync server environment variables with process.env for backend middleware
  if (env.MONGODB_URI && !process.env.MONGODB_URI) {
    process.env.MONGODB_URI = env.MONGODB_URI;
  }
  if (env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }
  if (env.GEMINI_MODEL && !process.env.GEMINI_MODEL) {
    process.env.GEMINI_MODEL = env.GEMINI_MODEL;
  }

  return {
    name: 'backend-api-middleware-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/')) {
          const handled = await handleBackendApiRequest(req, res);
          if (handled) return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/')) {
          const handled = await handleBackendApiRequest(req, res);
          if (handled) return;
        }
        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), backendApiPlugin(env)],
    server: {
      port: 5173,
      open: false,
      watch: {
        usePolling: true,
        interval: 1000
      }
    }
  };
});

