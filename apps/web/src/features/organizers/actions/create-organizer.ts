"use server";
import { revalidatePath } from "next/cache";

import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

import {
	organizerSchema,
	OrganizerFormValues,
} from "../schemas/organizer.schema";

export async function createOrganizer(values: OrganizerFormValues) {
	try {
		const data = organizerSchema.parse(values);

		await prisma.organizer.create({
			data: {
				...data,
				description: data.description || null,
				website: data.website || null,
				instagram: data.instagram || null,
				logoUrl: data.logoUrl || null,
			},
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new Error("Slug already exists");
		}

		throw error;
	}

	revalidatePath("/admin/organizers");
}
