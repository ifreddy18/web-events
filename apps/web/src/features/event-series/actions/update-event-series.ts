"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";

import {
	eventSeriesSchema,
	type EventSeriesFormValues,
} from "../schemas/event-series.schema";

export async function updateEventSeries(
	id: string,
	values: EventSeriesFormValues,
) {
	const data = eventSeriesSchema.parse(values);

	try {
		await prisma.eventSeries.update({
			where: {
				id,
			},

			data: {
				organizerId: data.organizerId,

				disciplineId: data.disciplineId,

				name: data.name,

				slug: data.slug,

				description: data.description || null,

				officialWebsite: data.officialWebsite || null,

				instagram: data.instagram || null,

				status: data.status,
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

	revalidatePath("/admin/event-series");
}
