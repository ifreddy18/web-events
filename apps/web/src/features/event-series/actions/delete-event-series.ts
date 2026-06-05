"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";

export async function deleteEventSeries(id: string) {
	await prisma.eventSeries.update({
		where: {
			id,
		},
		data: {
			deletedAt: new Date(),
		},
	});

	revalidatePath("/admin/event-series");
}
