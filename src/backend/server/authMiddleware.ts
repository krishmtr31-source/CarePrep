import { IncomingMessage } from 'http';

export interface AuthenticatedUser {
  userId: string;
  role: 'patient' | 'doctor' | 'admin';
}

/**
 * Extracts the authenticated user identity from request headers.
 * Supports standard Bearer Authorization tokens as well as CarePrep session headers:
 * - Authorization: Bearer sih_demo_jwt_<userId>_<timestamp>
 * - x-user-id / x-patient-id
 * - x-user-role
 * 
 * NEVER TRUSTS query parameters for authorization.
 */
export function getAuthenticatedUser(req: IncomingMessage): AuthenticatedUser | null {
  const authHeader = req.headers['authorization'];
  const userIdHeader = req.headers['x-user-id'] || req.headers['x-patient-id'];
  const userRoleHeader = req.headers['x-user-role'];

  // 1. Try parsing Bearer token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    
    // Check if token format is `sih_demo_jwt_<userId>_<timestamp>`
    const match = token.match(/^sih_demo_jwt_(.+)_(\d+)$/);
    if (match && match[1]) {
      const extractedId = match[1];
      const role: 'patient' | 'doctor' | 'admin' = extractedId.includes('doc') ? 'doctor' : 'patient';
      return {
        userId: extractedId,
        role: (userRoleHeader as any) || role
      };
    }
  }

  // 2. Try explicit header identification
  if (typeof userIdHeader === 'string' && userIdHeader.trim()) {
    const role: 'patient' | 'doctor' | 'admin' = 
      userRoleHeader === 'doctor' || userIdHeader.includes('doc') ? 'doctor' : 'patient';
    return {
      userId: userIdHeader.trim(),
      role
    };
  }

  return null;
}

/**
 * Helper to send standardized JSON responses.
 */
export function sendJson(res: any, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

/**
 * Helper to parse request JSON body safely.
 */
export async function parseJsonBody(req: IncomingMessage, maxBytes = 1e6): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > maxBytes) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', err => reject(err));
  });
}
