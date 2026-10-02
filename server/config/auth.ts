const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

export { JWT_SECRET };

export const JWT_EXPIRES_IN = "7d";