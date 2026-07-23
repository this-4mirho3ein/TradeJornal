import { z } from "zod";

export const metricCardSchema = z.object({
  label: z.string(),
  value: z.string(),
  hint: z.string().optional(),
  tone: z.enum(["neutral", "profit", "loss"]).default("neutral"),
});

export type MetricCardData = z.infer<typeof metricCardSchema>;