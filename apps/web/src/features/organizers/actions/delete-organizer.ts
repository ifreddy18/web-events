"use server";

import { prisma } from "@/server/db/prisma";

export async function updateOrganizer(id: string) {
	await prisma.organizer.update({
		where: { id },
		data: {
			isActive: false,
		},
	});
}
