"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

import {
	organizerSchema,
	OrganizerFormValues,
} from "../schemas/organizer.schema";

export async function updateOrganizer(id: string, values: OrganizerFormValues) {
	try {
		const data = organizerSchema.parse(values);

		await prisma.organizer.update({
			where: {
				id,
			},
			data: {
				name: data.name,
				slug: data.slug,
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
	revalidatePath(`/admin/organizers/${id}/edit`);
}
