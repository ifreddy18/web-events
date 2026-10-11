import { prisma } from "@/server/db/prisma";

export async function getCompetition(id: string) {
	return prisma.competition.findFirst({
		where: {
			id,
			deletedAt: null,
		},
	});
}
