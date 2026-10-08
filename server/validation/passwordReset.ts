import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z
    .string({
      error: "Please provide a valid email address",
    })
    .trim()
    .email("Please provide a valid email address")
    .max(255, "Email must be at most 255 characters")
    .transform((value) => value.toLowerCase()),

  destination: z
    .enum(["user", "admin"])
    .default("user"),
});

export const verifyResetCodeSchema = z.object({
  email: z
    .string({
      error: "Please provide a valid email address",
    })
    .trim()
    .email("Please provide a valid email address")
    .max(255, "Email must be at most 255 characters")
    .transform((value) => value.toLowerCase()),

  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export const resetPasswordSchema = z.object({
  email: z
    .string({
      error: "Please provide a valid email address",
    })
    .trim()
    .email("Please provide a valid email address")
    .max(255, "Email must be at most 255 characters")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});
