import { z } from "zod";

export const eventEditionSchema = z.object({
	eventSeriesId: z.uuid(),

	locationId: z.uuid().optional().or(z.literal("")),

	year: z.number().int().min(1900).max(2100),

	name: z.string().trim().min(2).max(150),

	slug: z.string().trim().min(2).max(150),

	startsAt: z.string().min(1, "Start date is required"),

	endsAt: z.string().optional().or(z.literal("")),

	registrationOpenAt: z.string().optional().or(z.literal("")),

	registrationCloseAt: z.string().optional().or(z.literal("")),

	registrationUrl: z.url().optional().or(z.literal("")),

	resultsUrl: z.url().optional().or(z.literal("")),

	status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]),
});

export type EventEditionFormValues = z.infer<typeof eventEditionSchema>;
