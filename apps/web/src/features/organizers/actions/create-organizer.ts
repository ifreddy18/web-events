"use server";

import { prisma } from "@/server/db/prisma";
import { organizerSchema } from "../schemas/organizer.schema";

export async function createOrganizer(data: unknown) {
	const parsed = organizerSchema.parse(data);

	await prisma.organizer.create({
		data: parsed,
	});
}
