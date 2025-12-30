import { z } from "zod";

export const GeocodeRequestSchema = z.object({
  text: z.string().min(3, "住所・地名を入力してください。"),
});

export type GeocodeRequestInput = z.infer<typeof GeocodeRequestSchema>;
