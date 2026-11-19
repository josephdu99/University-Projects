import { z } from "zod";

/** Shown next to every password box, and true of the rule below. */
export const PASSWORD_MIN = 10;
export const PASSWORD_HINT = `At least ${PASSWORD_MIN} characters`;

/** The one password rule, for every way an account gets made. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(200)
  .refine((p) => !/^\d+$/.test(p), "Don't use only numbers")
  .refine(
    (p) => !["password123", "12345678910", "qwertyuiop"].includes(p.toLowerCase()),
    "That password is too common",
  );
