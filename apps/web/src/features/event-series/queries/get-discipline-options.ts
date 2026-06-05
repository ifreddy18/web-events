import { prisma } from "@/server/db/prisma";

export async function getDisciplineOptions() {
	return prisma.discipline.findMany({
		where: {
			deletedAt: null,
		},

		orderBy: {
			name: "asc",
		},

		select: {
			id: true,
			name: true,
		},
	});
}
