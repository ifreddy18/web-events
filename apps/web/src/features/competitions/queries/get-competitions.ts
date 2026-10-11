import { prisma } from "@/server/db/prisma";

export async function getCompetitions() {
	return prisma.competition.findMany({
		where: {
			deletedAt: null,
		},

		orderBy: {
			createdAt: "desc",
		},

		include: {
			eventEdition: {
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
	});
}
