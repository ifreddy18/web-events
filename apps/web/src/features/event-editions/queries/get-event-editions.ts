import { prisma } from "@/server/db/prisma";

export async function getEventEditions() {
	return prisma.eventEdition.findMany({
		where: {
			deletedAt: null,
		},

		include: {
			eventSeries: {
				select: {
					name: true,
				},
			},

			location: {
				select: {
					country: true,
					city: true,
					venueName: true,
				},
			},
		},

		orderBy: {
			startsAt: "desc",
		},
	});
}
