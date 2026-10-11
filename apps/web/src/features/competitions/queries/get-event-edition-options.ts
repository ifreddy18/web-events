import { prisma } from "@/server/db/prisma";

export async function getEventEditionOptions() {
	const editions = await prisma.eventEdition.findMany({
		where: {
			deletedAt: null,
		},
		orderBy: {
			startsAt: "desc",
		},
		select: {
			id: true,
			name: true,
		},
	});

	return editions.map((edition) => ({
		value: edition.id,
		label: edition.name,
	}));
}
