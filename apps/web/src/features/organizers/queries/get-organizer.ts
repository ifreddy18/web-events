import { prisma } from "@/server/db/prisma";

export async function getOrganizer(id: string) {
	return prisma.organizer.findFirst({
		where: {
			id,
			deletedAt: null,
		},
	});
}
