import { z } from "zod";

export const FlagCreateSchema = z.object({
  spot_id: z.string().min(1),
  reason: z.enum(["INAPPROPRIATE", "WRONG_INFO", "DISCRIMINATION", "PRIVACY"]),
  note: z.string().max(1000).optional(),
});

export const FlagUpdateSchema = z.object({
  status: z.enum(["OPEN", "CLOSED"]).optional(),
  note: z.string().max(1000).optional(),
}).refine(
  (data) => data.status !== undefined || data.note !== undefined,
  {
    message: "status か note のいずれかを指定してください。",
  }
);

export type FlagCreateInput = z.infer<typeof FlagCreateSchema>;
export type FlagUpdateInput = z.infer<typeof FlagUpdateSchema>;
