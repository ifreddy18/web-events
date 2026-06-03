"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";

export async function deleteOrganizer(id: string) {
	await prisma.organizer.update({
		where: {
			id,
		},
		data: {
			deletedAt: new Date(),
		},
	});

	revalidatePath("/admin/organizers");
}
