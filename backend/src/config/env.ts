import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from candidate paths so env variables are found regardless of CWD
const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../backend/.env'),
];

for (const envPath of candidatePaths) {
  dotenv.config({ path: envPath });
}

const booleanSchema = z.preprocess((val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(lower)) return true;
    if (['false', '0', 'no', 'off'].includes(lower)) return false;
  }
  return false;
}, z.boolean().default(false));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('postgresql://postgres:postgrespassword@localhost:5432/outboxlabs?schema=public'),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: booleanSchema.default(false),
  WORKER_CONCURRENCY: z.coerce.number().default(10),
  MIN_DELAY_BETWEEN_EMAILS_MS: z.coerce.number().default(2000),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().default(200),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().default('outboxlabs-local-dev-secret'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  ETHEREAL_HOST: z.string().default('smtp.ethereal.email'),
  ETHEREAL_PORT: z.coerce.number().default(587),
  ETHEREAL_USER: z.string().optional(),
  ETHEREAL_PASSWORD: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  throw new Error('Invalid environment variables');
}

const configData = _env.data;

// If REDIS_URL is provided, auto-extract connection params
if (configData.REDIS_URL) {
  try {
    const parsed = new URL(configData.REDIS_URL);
    configData.REDIS_HOST = parsed.hostname;
    configData.REDIS_PORT = parseInt(parsed.port || '6379', 10);
    if (parsed.password) {
      configData.REDIS_PASSWORD = decodeURIComponent(parsed.password);
    }
    if (parsed.protocol === 'rediss:') {
      configData.REDIS_TLS = true;
    }
  } catch (e) {
    // Ignore URL parse error
  }
}

// Fail-safe: reject obvious placeholder values while allowing local Docker-based development.
const INVALID_HOSTS = ['my-upstash-endpoint', 'example-redis-host', 'example.com'];
if (INVALID_HOSTS.includes(configData.REDIS_HOST)) {
  console.error(
    `❌ REDIS_HOST is set to "${configData.REDIS_HOST}" which is invalid.\n` +
    `   Use a real Redis host or localhost for local Docker-based development.\n` +
    `   Example: REDIS_HOST="localhost" or REDIS_HOST="your-instance.upstash.io"`
  );
  throw new Error(`REDIS_HOST="${configData.REDIS_HOST}" is not a valid Redis host.`);
}

// Safe diagnostic log (never exposes password)
console.log('✅ Environment loaded:');
console.log(`   REDIS_HOST = ${configData.REDIS_HOST}`);
console.log(`   REDIS_PORT = ${configData.REDIS_PORT}`);
console.log(`   REDIS_TLS  = ${configData.REDIS_TLS}`);
console.log(`   REDIS_PASSWORD = ${configData.REDIS_PASSWORD ? 'configured' : 'NOT configured'}`);

export const config = configData;
