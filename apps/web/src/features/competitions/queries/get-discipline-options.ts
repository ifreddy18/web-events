import { prisma } from "@/server/db/prisma";

export async function getDisciplineOptions() {
	const disciplines = await prisma.discipline.findMany({
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

	return disciplines.map((discipline) => ({
		value: discipline.id,
		label: discipline.name,
	}));
}
