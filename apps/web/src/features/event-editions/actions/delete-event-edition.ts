"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";

export async function deleteEventEdition(id: string) {
	await prisma.eventEdition.update({
		where: {
			id,
		},

		data: {
			deletedAt: new Date(),
		},
	});

	revalidatePath("/admin/event-editions");
}
