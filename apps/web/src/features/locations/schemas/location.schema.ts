import { z } from "zod";

export const locationSchema = z.object({
	country: z.string().trim().min(2),

	state: z.string().optional(),

	city: z.string().optional(),

	venueName: z.string().optional(),

	address: z.string().optional(),

	slug: z.string().trim().min(2),

	latitude: z.number().optional(),

	longitude: z.number().optional(),
});

export type LocationFormValues = z.infer<typeof locationSchema>;
