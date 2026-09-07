import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const DEFAULT_USER = 'avinashjha7810_db_user';
const DEFAULT_PASS = 'V45Ity1dHnY9Gb5ep';
const DEFAULT_DB = 'careprep';

/**
 * Resolves the MongoDB connection string.
 * Prioritizes MONGODB_URI environment variable, and falls back to
 * constructing standard Atlas SRV URI using the provided credentials.
 */
export function getMongoUri(): string {
  if (process.env.MONGODB_URI && process.env.MONGODB_URI.trim() !== '') {
    return process.env.MONGODB_URI.trim();
  }

  const user = encodeURIComponent(process.env.MONGODB_USER || DEFAULT_USER);
  const pass = encodeURIComponent(process.env.MONGODB_PASSWORD || DEFAULT_PASS);
  const db = process.env.MONGODB_DB_NAME || DEFAULT_DB;
  const host = process.env.MONGODB_HOST || 'cluster0.mongodb.net';

  return `mongodb+srv://${user}:${pass}@${host}/${db}?retryWrites=true&w=majority`;
}

interface ConnectionOptions {
  autoIndex?: boolean;
  maxPoolSize?: number;
  serverSelectionTimeoutMS?: number;
}

const DEFAULT_OPTIONS: ConnectionOptions = {
  autoIndex: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000 // 5s timeout for fast failover/reporting
};

let isConnected = false;

/**
 * Connect to MongoDB database
 */
export async function connectDB(customUri?: string, options?: ConnectionOptions): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const uri = customUri || getMongoUri();
  // Mask password for safe logging
  const maskedUri = uri.replace(/:([^@]+)@/, ':****@');

  try {
    console.log(`[Database] Connecting to MongoDB: ${maskedUri}`);

    // Set connection event listeners once
    if (mongoose.connection.listeners('error').length === 0) {
      mongoose.connection.on('connected', () => {
        isConnected = true;
        console.log('[Database] MongoDB connection established successfully.');
      });

      mongoose.connection.on('error', (err) => {
        console.error('[Database] MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        isConnected = false;
        console.warn('[Database] MongoDB disconnected.');
      });

      mongoose.connection.on('reconnected', () => {
        isConnected = true;
        console.log('[Database] MongoDB reconnected.');
      });
    }

    const conn = await mongoose.connect(uri, {
      ...DEFAULT_OPTIONS,
      ...options
    });

    isConnected = true;
    return conn;
  } catch (error) {
    isConnected = false;
    console.error('[Database] Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] MongoDB connection closed.');
  }
}

/**
 * Get current MongoDB connection state
 */
export function getConnectionStatus(): {
  isConnected: boolean;
  readyState: number;
  stateLabel: string;
  host?: string;
  name?: string;
  databaseName?: string;
  error?: string;
} {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const readyState = mongoose.connection.readyState;

  return {
    isConnected: readyState === 1,
    readyState,
    stateLabel: states[readyState] || 'unknown',
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    databaseName: mongoose.connection.name,
    error: readyState === 1 ? undefined : 'MongoDB not connected'
  };
}

export const getDatabaseStatus = getConnectionStatus;

// Graceful process exit handling
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});

export default {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  getDatabaseStatus,
  getMongoUri
};

