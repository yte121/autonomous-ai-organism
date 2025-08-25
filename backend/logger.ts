import pino from 'pino';

// Create a default logger instance.
// In a real production environment, you might have different transports
// for different environments (e.g., sending logs to a service like DataDog).
// For now, we'll use pino-pretty if not in a production-like environment.
const logger = pino({
  level: 'info',
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

export { logger };
