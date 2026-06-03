import { z } from "zod";

export const organizerSchema = z.object({
	name: z.string().min(2, "Name is required"),

	slug: z.string().min(2),

	website: z.string().url().optional().or(z.literal("")),

	instagram: z.string().optional(),

	isActive: z.boolean(),
});

export type OrganizerFormValues = z.infer<typeof organizerSchema>;
