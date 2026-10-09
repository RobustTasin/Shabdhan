const configuredJwtSecret = process.env.JWT_SECRET;

if (!configuredJwtSecret) {
  throw new Error("JWT_SECRET is not configured");
}

const JWT_SECRET: string = configuredJwtSecret;

export { JWT_SECRET };

export const JWT_EXPIRES_IN = "7d";