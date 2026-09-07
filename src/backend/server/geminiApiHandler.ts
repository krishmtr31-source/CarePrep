import { ServerGeminiProvider } from '../../ai-services/llm/providers/ServerGeminiProvider';
import { IncomingMessage, ServerResponse } from 'http';
import { getGeminiModelName, getGeminiApiKey } from '../config/geminiConfig';
import { classifyGeminiError, sanitizeLogMessage, isGeminiMockModeEnabled } from '../utils/geminiErrorHandler';

let cachedGeminiProvider: ServerGeminiProvider | null = null;

function getGeminiProvider(): ServerGeminiProvider {
  if (!cachedGeminiProvider) {
    cachedGeminiProvider = new ServerGeminiProvider({
      apiKey: getGeminiApiKey(),
      modelName: getGeminiModelName()
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
      if (isGeminiMockModeEnabled()) {
        res.statusCode = 200;
        res.end(JSON.stringify({
          isConnected: true,
          providerName: 'GEMINI',
          modelName: `${getGeminiModelName()} (MOCK_MODE)`,
          statusLabel: `Gemini ${getGeminiModelName()} (Mock Dev Mode Active)`,
          isMockMode: true,
          timestamp: new Date().toISOString()
        }));
        return true;
      }

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
      const classified = classifyGeminiError(err);
      console.warn(`[GeminiApiHandler] Health check warning: [${classified.code}] ${classified.sanitizedDiagnostic}`);
      res.statusCode = 200;
      res.end(JSON.stringify({
        isConnected: false,
        providerName: 'GEMINI',
        modelName: getGeminiModelName(),
        statusLabel: 'Deterministic Fallback Active',
        code: classified.code,
        error: classified.message
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
          res.end(JSON.stringify({ 
            error: 'Invalid request: missing text parameter',
            code: 400
          }));
          return;
        }

        const provider = getGeminiProvider();
        if (!provider.isConfigured() && !isGeminiMockModeEnabled()) {
          res.statusCode = 503;
          res.end(JSON.stringify({
            error: 'Gemini service not configured on server.',
            code: 503,
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
        const classified = classifyGeminiError(err);
        console.warn(`[GeminiApiHandler] /api/ai/interpret error: [${classified.code}] ${classified.sanitizedDiagnostic}`);
        res.statusCode = classified.httpStatus;
        res.end(JSON.stringify({
          success: false,
          code: classified.code,
          error: classified.message,
          fallbackAvailable: true
        }));
      }
    });

    return true;
  }

  // 3. Document Extraction endpoint: POST /api/ai/document
  // Legacy compatibility route. Canonical implementation is medicalDocumentService.ts.
  if (url === '/api/ai/document' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    let body = '';

    req.on('data', chunk => {
      body += chunk;
      if (body.length > 20e6) {
        req.destroy(); // 20MB payload safety guard for medical PDFs / images
      }
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const rawText = typeof payload.rawText === 'string' ? payload.rawText : '';
        const fileName = typeof payload.fileName === 'string' ? payload.fileName : 'document';
        const fileData = typeof payload.fileData === 'string' ? payload.fileData : undefined;
        const mimeType = typeof payload.mimeType === 'string' ? payload.mimeType : undefined;

        if (!rawText.trim() && !fileData) {
          res.statusCode = 400;
          res.end(JSON.stringify({ 
            error: 'Invalid request: missing document content (rawText or fileData)',
            code: 400
          }));
          return;
        }

        // Delegate to canonical medicalDocumentService
        const { medicalDocumentService, adaptToLegacyGeminiAnalysis } = await import('../services/medicalDocumentService');
        
        if (!medicalDocumentService.isConfigured() && !isGeminiMockModeEnabled()) {
          res.statusCode = 503;
          res.end(JSON.stringify({
            error: 'Gemini service not configured on server (missing GEMINI_API_KEY).',
            code: 503,
            fallbackAvailable: true
          }));
          return;
        }

        const extraction = await medicalDocumentService.analyzeDocument({
          fileName,
          fileData,
          mimeType: mimeType || (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
          rawText
        });

        // Convert canonical extraction into legacy GeminiMedicalDocumentAnalysis shape for caller compatibility
        const legacyAdaptedData = adaptToLegacyGeminiAnalysis(extraction, fileName);

        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          data: legacyAdaptedData,
          canonicalData: extraction,
          provider: 'GEMINI',
          model: medicalDocumentService.getModelName()
        }));
      } catch (err: any) {
        const classified = classifyGeminiError(err);
        console.warn(`[GeminiApiHandler] /api/ai/document error: [${classified.code}] ${classified.sanitizedDiagnostic}`);
        res.statusCode = classified.httpStatus;
        res.end(JSON.stringify({
          success: false,
          code: classified.code,
          error: classified.message,
          fallbackAvailable: true
        }));
      }
    });

    return true;
  }

  // 4. Clinical Red-Flag Detection endpoint: POST /api/ai/red-flags
  if (url === '/api/ai/red-flags' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    let body = '';

    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy(); // 1MB safety guard
      }
    });

    req.on('end', async () => {
      try {
        let payload: any;
        try {
          payload = JSON.parse(body || '{}');
        } catch (jsonErr) {
          res.statusCode = 400;
          res.end(JSON.stringify({
            success: false,
            error: 'Malformed JSON payload.',
            code: 400
          }));
          return;
        }

        if (typeof payload !== 'object' || payload === null) {
          res.statusCode = 400;
          res.end(JSON.stringify({
            success: false,
            error: 'Invalid request payload: expected JSON object.',
            code: 400
          }));
          return;
        }

        const { redFlagService } = await import('../services/redFlagService');

        if (!redFlagService.isConfigured() && !isGeminiMockModeEnabled()) {
          res.statusCode = 503;
          res.end(JSON.stringify({
            success: false,
            code: 'AI_SERVICE_UNAVAILABLE',
            error: 'AI symptom screening is temporarily unavailable. You can continue your intake and your responses will still be available for your healthcare provider.',
            fallbackAvailable: true
          }));
          return;
        }

        const analysis = await redFlagService.analyzeIntake(payload);

        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          analysis
        }));
      } catch (err: any) {
        const classified = classifyGeminiError(err);
        console.warn(`[GeminiApiHandler] /api/ai/red-flags error: [${classified.code}] ${classified.sanitizedDiagnostic}`);
        res.statusCode = classified.httpStatus;
        res.end(JSON.stringify({
          success: false,
          code: classified.code,
          error: classified.message,
          fallbackAvailable: true
        }));
      }
    });

    return true;
  }

  return false;
}
