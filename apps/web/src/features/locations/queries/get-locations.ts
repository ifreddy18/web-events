import { prisma } from "@/server/db/prisma";

export async function getLocations() {
	return prisma.location.findMany({
		where: {
			deletedAt: null,
		},

		orderBy: [
			{
				country: "asc",
			},
			{
				city: "asc",
			},
		],
	});
}
