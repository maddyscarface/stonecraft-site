/** True on any non-production deployment (records created here are flagged sandbox). */
export const isSandbox = () => process.env.VERCEL_ENV !== "production";
