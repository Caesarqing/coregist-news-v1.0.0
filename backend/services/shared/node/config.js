const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

module.exports = {
  port: numberFromEnv('PORT', 8000),
  mongoUri: process.env.MONGODB_URI || '',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@127.0.0.1:5672/',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-secret-change-me',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'coregistnews-news',
  allowUnverifiedFirebaseTokens: process.env.ALLOW_UNVERIFIED_FIREBASE_TOKENS === 'true',
  accessTokenExpiresSeconds: numberFromEnv('ACCESS_TOKEN_EXPIRES_SECONDS', 7 * 24 * 60 * 60),
  refreshTokenExpiresSeconds: numberFromEnv('REFRESH_TOKEN_EXPIRES_SECONDS', 30 * 24 * 60 * 60),
  resetCodeExpiresMinutes: numberFromEnv('RESET_CODE_EXPIRES_MINUTES', 10),
};
