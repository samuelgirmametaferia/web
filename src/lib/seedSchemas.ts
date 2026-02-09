import { z } from "zod";

export const guySchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  active: z.boolean().optional().default(true),
});

export const guysSchema = z.array(guySchema);

export const girlSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  active: z.boolean().optional().default(true),
});

export const girlsSchema = z.array(girlSchema);

export type GuySeed = z.infer<typeof guySchema>;
export type GirlSeed = z.infer<typeof girlSchema>;
