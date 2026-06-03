import { z } from "zod";

export const organizerSchema = z.object({
	name: z.string().trim().min(2, "Name is required").max(120),

	slug: z
		.string()
		.trim()
		.min(2)
		.max(120)
		.regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),

	description: z.string().optional(),

	website: z.url("Invalid URL").optional().or(z.literal("")),

	instagram: z.string().optional(),

	logoUrl: z.url("Invalid URL").optional().or(z.literal("")),
});

export type OrganizerFormValues = z.infer<typeof organizerSchema>;
