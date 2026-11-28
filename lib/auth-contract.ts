import { z } from "zod";
export const phoneSchema = z.string().regex(/^\+861[3-9]\d{9}$/);
export const otpRequestSchema = z.object({ phone: phoneSchema });
export const otpVerifySchema = z.object({
  phone: phoneSchema,
  token: z.string().regex(/^\d{6}$/),
});
export type AuthStatus = {
  configured: boolean;
  userId?: string;
  userLabel?: string;
};
