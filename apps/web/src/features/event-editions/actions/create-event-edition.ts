"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";

import {
	eventEditionSchema,
	type EventEditionFormValues,
} from "../schemas/event-edition.schema";

export async function createEventEdition(values: EventEditionFormValues) {
	const data = eventEditionSchema.parse(values);

	await prisma.eventEdition.create({
		data: {
			eventSeriesId: data.eventSeriesId,

			locationId: data.locationId || null,

			year: data.year,

			name: data.name,

			slug: data.slug,

			startsAt: new Date(data.startsAt),

			endsAt: data.endsAt ? new Date(data.endsAt) : null,

			registrationOpenAt: data.registrationOpenAt
				? new Date(data.registrationOpenAt)
				: null,

			registrationCloseAt: data.registrationCloseAt
				? new Date(data.registrationCloseAt)
				: null,

			registrationUrl: data.registrationUrl || null,

			resultsUrl: data.resultsUrl || null,

			status: data.status,
		},
	});

	revalidatePath("/admin/event-editions");
}
