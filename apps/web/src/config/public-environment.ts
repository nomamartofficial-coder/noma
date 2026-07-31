import { loadPublicEnvironment } from '@noma/config/public';

export const publicEnvironment = loadPublicEnvironment({
  NEXT_PUBLIC_NOMA_ENV: process.env.NEXT_PUBLIC_NOMA_ENV,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  VERCEL_ENV: process.env.VERCEL_ENV,
});
