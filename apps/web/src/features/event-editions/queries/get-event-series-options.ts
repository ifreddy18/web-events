import { prisma } from "@/server/db/prisma";

export async function getEventSeriesOptions() {
	return prisma.eventSeries.findMany({
		where: {
			deletedAt: null,
		},

		orderBy: {
			name: "asc",
		},

		select: {
			id: true,
			name: true,
			slug: true,
		},
	});
}
