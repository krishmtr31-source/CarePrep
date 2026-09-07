/**
 * Centralized Gemini AI Configuration
 * Single source of truth for model identifiers and backend AI settings.
 */

import fs from 'fs';
import path from 'path';

function loadEnvFallback() {
  try {
    if (typeof process !== 'undefined' && process.cwd) {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
          if (match) {
            const key = match[1].trim();
            const val = match[2].trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    }
  } catch {
    // ignore in browser or restricted environments
  }
}

// Auto-populate on server import
loadEnvFallback();

export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

/**
 * Returns the configured Gemini model name.
 * Respects GEMINI_MODEL environment variable, defaulting to 'gemini-3.6-flash'.
 */
export function getGeminiModelName(): string {
  if (typeof process !== 'undefined' && process.env?.GEMINI_MODEL && process.env.GEMINI_MODEL.trim()) {
    return process.env.GEMINI_MODEL.trim();
  }
  return DEFAULT_GEMINI_MODEL;
}

/**
 * Returns the server-side Gemini API key.
 * Strictly available only in server contexts; never exposed to clients.
 */
export function getGeminiApiKey(): string | undefined {
  if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY.trim();
  }
  return undefined;
}

/**
 * Returns whether mock mode is explicitly enabled for development/testing.
 * Defaults to FALSE in production.
 */
export function isGeminiMockMode(): boolean {
  if (typeof process === 'undefined' || !process.env) return false;
  return process.env.GEMINI_MOCK_MODE === 'true';
}

