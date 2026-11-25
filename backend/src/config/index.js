'use strict';

const env = process.env;

module.exports = {
  port: Number(env.PORT) || 3001,
  jwtSecret: env.JWT_SECRET || 'rateiojusto-segredo-dev',
  jwtExpiresIn: env.JWT_EXPIRES_IN || '2h',
  bcryptRounds: Number(env.BCRYPT_ROUNDS) || 10,
  corsOrigin: env.CORS_ORIGIN || '*',
  enableTestRoutes: env.ENABLE_TEST_ROUTES
    ? env.ENABLE_TEST_ROUTES === 'true'
    : env.NODE_ENV !== 'production',
};
