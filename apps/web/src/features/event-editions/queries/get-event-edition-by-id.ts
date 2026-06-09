import { prisma } from "@/server/db/prisma";

export async function getEventEditionById(id: string) {
	return prisma.eventEdition.findUnique({
		where: {
			id,
		},
	});
}
