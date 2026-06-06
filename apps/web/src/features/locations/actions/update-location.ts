"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";

import {
	locationSchema,
	type LocationFormValues,
} from "../schemas/location.schema";

export async function updateLocation(id: string, values: LocationFormValues) {
	const data = locationSchema.parse(values);

	await prisma.location.update({
		where: {
			id,
		},

		data: {
			country: data.country,

			state: data.state || null,

			city: data.city || null,

			venueName: data.venueName || null,

			address: data.address || null,

			slug: data.slug,

			latitude: data.latitude ?? null,

			longitude: data.longitude ?? null,
		},
	});

	revalidatePath("/admin/locations");
}
