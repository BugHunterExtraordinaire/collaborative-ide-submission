import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProduction,
  
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  EXECUTION_LAYER_URL: process.env.EXECUTION_LAYER_URL || 'http://localhost:5000',
  
  MONGODB_URL: process.env.MONGO_URI || 'mongodb://localhost:27017/collaborative-ide',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  JWT_SECRET: process.env.JWT_SECRET || (isProduction ? undefined : 'dev_secret_key'),
  JWT_LIFETIME: process.env.JWT_LIFETIME || '6h',
};

if (config.isProduction && !config.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET environment variable is missing in production.");
  process.exit(1);
}
