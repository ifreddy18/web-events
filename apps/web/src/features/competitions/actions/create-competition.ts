"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";

import {
	competitionSchema,
	type CompetitionFormValues,
} from "../schemas/competition.schema";

export async function createCompetition(values: CompetitionFormValues) {
	const data = competitionSchema.parse(values);

	await prisma.competition.create({
		data: {
			eventEditionId: data.eventEditionId,
			disciplineId: data.disciplineId,

			name: data.name,
			slug: data.slug,

			description: data.description || null,

			status: data.status,
		},
	});

	revalidatePath("/admin/competitions");
}
