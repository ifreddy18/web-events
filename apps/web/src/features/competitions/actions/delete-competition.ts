"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";

export async function deleteCompetition(id: string) {
	await prisma.competition.update({
		where: {
			id,
		},

		data: {
			deletedAt: new Date(),
		},
	});

	revalidatePath("/admin/competitions");
}
