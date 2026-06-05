import { z } from "zod";

export const eventSeriesSchema = z.object({
	organizerId: z.uuid(),

	disciplineId: z.uuid(),

	name: z.string().trim().min(2).max(120),

	slug: z.string().trim().min(2).max(120),

	description: z.string().optional(),

	officialWebsite: z.url().optional().or(z.literal("")),

	instagram: z.string().optional(),

	status: z.enum(["ACTIVE", "ARCHIVED", "CANCELLED"]),
});

export type EventSeriesFormValues = z.infer<typeof eventSeriesSchema>;
