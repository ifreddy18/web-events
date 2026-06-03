import { prisma } from "@/server/db/prisma";

export async function getOrganizers() {
	return prisma.organizer.findMany({
		where: {
			deletedAt: null,
		},
		orderBy: {
			name: "asc",
		},
	});
}
