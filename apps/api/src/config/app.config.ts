import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.API_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-for-dev-verification',
}));
