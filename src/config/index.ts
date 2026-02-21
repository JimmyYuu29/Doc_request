import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  APP_PORT: z.coerce.number().default(3000),
  APP_BASE_URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('8h'),
  TOKEN_SECRET: z.string().min(16),
  TOKEN_EXPIRY_DAYS: z.coerce.number().default(7),

  DATABASE_URL: z.string(),

  PA_FLOW_SEND_REQUESTS: z.string().default(''),
  PA_FLOW_SEND_OTP: z.string().default(''),
  PA_FLOW_ARCHIVE_FILES: z.string().default(''),
  PA_FLOW_REMINDERS: z.string().default(''),

  SP_SITE_URL: z.string().default(''),
  SP_LIBRARY_NAME: z.string().default('Evidencias'),

  OTP_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  OTP_EXPIRY_MINUTES: z.coerce.number().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(3),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  port: env.APP_PORT,
  baseUrl: env.APP_BASE_URL,
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },

  token: {
    secret: env.TOKEN_SECRET,
    expiryDays: env.TOKEN_EXPIRY_DAYS,
  },

  database: {
    url: env.DATABASE_URL,
  },

  powerAutomate: {
    sendRequests: env.PA_FLOW_SEND_REQUESTS,
    sendOtp: env.PA_FLOW_SEND_OTP,
    archiveFiles: env.PA_FLOW_ARCHIVE_FILES,
    reminders: env.PA_FLOW_REMINDERS,
  },

  sharepoint: {
    siteUrl: env.SP_SITE_URL,
    libraryName: env.SP_LIBRARY_NAME,
  },

  otp: {
    enabled: env.OTP_ENABLED,
    expiryMinutes: env.OTP_EXPIRY_MINUTES,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
  },

  upload: {
    dir: env.UPLOAD_DIR,
    maxFileSizeMB: env.MAX_FILE_SIZE_MB,
    maxFileSizeBytes: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
} as const;
