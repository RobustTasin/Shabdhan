import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(
      /^[A-Za-z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .max(255, "Email must be at most 255 characters")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .max(255, "Email must be at most 255 characters")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(1, "Password is required"),
});
