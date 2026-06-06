"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";

export async function deleteLocation(id: string) {
	await prisma.location.update({
		where: {
			id,
		},

		data: {
			deletedAt: new Date(),
		},
	});

	revalidatePath("/admin/locations");
}
