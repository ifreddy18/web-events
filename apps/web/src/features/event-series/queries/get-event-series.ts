import { prisma } from "@/server/db/prisma";

export async function getEventSeries() {
	return prisma.eventSeries.findMany({
		where: {
			deletedAt: null,
		},

		include: {
			organizer: {
				select: {
					name: true,
				},
			},

			discipline: {
				select: {
					name: true,
				},
			},
		},

		orderBy: {
			name: "asc",
		},
	});
}
