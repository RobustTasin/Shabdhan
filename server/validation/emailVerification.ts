import { z } from "zod";

export const sendVerificationSchema = z.object({
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

export const verifyEmailSchema = z.object({
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
