import http from 'http';
import { handleBackendApiRequest, ensureDatabase } from './apiRouter';
import { getDatabaseStatus } from '../config/database';

const PORT = parseInt(process.env.PORT || '3001', 10);

export const server = http.createServer(async (req, res) => {
  // Enable CORS for local cross-origin calls if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-patient-id, x-user-role');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const handled = await handleBackendApiRequest(req, res);
  if (!handled) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }
});

if (process.env.NODE_ENV !== 'test' && !process.env.VITE) {
  // Connect to database before opening listener
  ensureDatabase().then((connected) => {
    const dbStatus = getDatabaseStatus();
    if (connected) {
      console.log(`[CarePrep Backend] MongoDB Atlas Connected (${dbStatus.databaseName || 'active'})`);
    } else {
      console.warn(`[CarePrep Backend] Running in detached DB mode: ${dbStatus.error || 'MONGODB_URI not set'}`);
    }
    server.listen(PORT, () => {
      console.log(`[CarePrep API Server] Listening on http://localhost:${PORT}`);
    });
  }).catch((err) => {
    console.error('[CarePrep Backend] Database bootstrap failure:', err);
    server.listen(PORT, () => {
      console.log(`[CarePrep API Server] Listening on http://localhost:${PORT}`);
    });
  });
}

