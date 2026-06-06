import { prisma } from "@/server/db/prisma";

export async function getLocationById(id: string) {
	return prisma.location.findUnique({
		where: {
			id,
		},
	});
}
