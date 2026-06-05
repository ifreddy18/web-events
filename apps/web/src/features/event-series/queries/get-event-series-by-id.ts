import { prisma } from "@/server/db/prisma";

export async function getEventSeriesById(id: string) {
	return prisma.eventSeries.findFirst({
		where: {
			id,
			deletedAt: null,
		},

		include: {
			organizer: true,
			discipline: true,
		},
	});
}
