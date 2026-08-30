import { ServerGeminiProvider } from '../../ai-services/llm/providers/ServerGeminiProvider';
import { IncomingMessage, ServerResponse } from 'http';

let cachedGeminiProvider: ServerGeminiProvider | null = null;

function getGeminiProvider(): ServerGeminiProvider {
  if (!cachedGeminiProvider) {
    cachedGeminiProvider = new ServerGeminiProvider({
      apiKey: process.env.GEMINI_API_KEY,
      modelName: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    });
  }
  return cachedGeminiProvider;
}

export async function handleGeminiApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = req.url?.split('?')[0] || '';

  // 1. Health check endpoint: GET /api/ai/health
  if (url === '/api/ai/health' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    try {
      const provider = getGeminiProvider();
      const isConnected = await provider.testConnection();

      res.statusCode = 200;
      res.end(JSON.stringify({
        isConnected,
        providerName: 'GEMINI',
        modelName: provider.getModelName(),
        statusLabel: isConnected ? `Gemini ${provider.getModelName()} Connected` : 'Deterministic Fallback Active',
        timestamp: new Date().toISOString()
      }));
      return true;
    } catch (err: any) {
      res.statusCode = 200;
      res.end(JSON.stringify({
        isConnected: false,
        providerName: 'GEMINI',
        modelName: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        statusLabel: 'Deterministic Fallback Active',
        error: err.message
      }));
      return true;
    }
  }

  // 2. Interpretation endpoint: POST /api/ai/interpret
  if (url === '/api/ai/interpret' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    let body = '';

    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy(); // 1MB payload safety guard
      }
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const text = typeof payload.text === 'string' ? payload.text : '';
        const language = ['en', 'hi', 'ta'].includes(payload.language) ? payload.language : 'en';
        const context = typeof payload.context === 'string' ? payload.context : undefined;

        if (!text.trim()) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing text parameter' }));
          return;
        }

        const provider = getGeminiProvider();
        if (!provider.isConfigured()) {
          res.statusCode = 503;
          res.end(JSON.stringify({
            error: 'GEMINI_API_KEY is not configured on server.',
            fallbackAvailable: true
          }));
          return;
        }

        const interpretation = await provider.interpretPatientUtterance(text, language, context);

        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          data: interpretation,
          provider: 'GEMINI',
          model: provider.getModelName()
        }));
      } catch (err: any) {
        console.warn('[GeminiApiHandler] Server interpretation error:', err.message);
        res.statusCode = 500;
        res.end(JSON.stringify({
          error: err.message || 'Gemini inference failed',
          fallbackAvailable: true
        }));
      }
    });

    return true;
  }

  return false;
}
