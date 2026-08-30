import http from 'http';
import { handleGeminiApiRequest } from './geminiApiHandler';

const PORT = parseInt(process.env.PORT || '3001', 10);

export const server = http.createServer(async (req, res) => {
  // Enable CORS for local cross-origin calls if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const handled = await handleGeminiApiRequest(req, res);
  if (!handled) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }
});

if (process.env.NODE_ENV !== 'test' && !process.env.VITE) {
  server.listen(PORT, () => {
    console.log(`[CarePrep Gemini API Server] Listening on http://localhost:${PORT}`);
  });
}
