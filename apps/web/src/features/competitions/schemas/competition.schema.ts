import { z } from "zod";

export const competitionSchema = z.object({
	eventEditionId: z.uuid(),

	disciplineId: z.uuid(),

	name: z.string().trim().min(2).max(120),

	slug: z.string().trim().min(2).max(120),

	description: z.string().optional(),

	status: z.enum(["ACTIVE", "CANCELLED", "COMPLETED"]),
});

export type CompetitionFormValues = z.infer<typeof competitionSchema>;
