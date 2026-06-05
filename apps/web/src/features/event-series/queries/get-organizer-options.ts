import { prisma } from "@/server/db/prisma";

export async function getOrganizerOptions() {
	return prisma.organizer.findMany({
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
