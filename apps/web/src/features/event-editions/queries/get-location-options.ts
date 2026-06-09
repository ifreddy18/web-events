import { prisma } from "@/server/db/prisma";

export async function getLocationOptions() {
	return prisma.location.findMany({
		where: {
			deletedAt: null,
		},

		orderBy: {
			country: "asc",
		},

		select: {
			id: true,
			country: true,
			city: true,
			venueName: true,
		},
	});
}
