"use server";

import { prisma } from "@/server/db/prisma";
import { organizerSchema } from "../schemas/organizer.schema";

export async function updateOrganizer(id: string, data: unknown) {
	const parsed = organizerSchema.parse(data);

	await prisma.organizer.update({
		where: { id },
		data: parsed,
	});
}
