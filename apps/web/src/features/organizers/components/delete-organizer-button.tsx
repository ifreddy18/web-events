"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteOrganizer } from "../actions/delete-organizer";

type DeleteOrganizerButtonProps = Readonly<{
	organizerId: string;
}>;

export function DeleteOrganizerButton({
	organizerId,
}: DeleteOrganizerButtonProps) {
	const router = useRouter();

	const [isPending, startTransition] = useTransition();

	function handleDelete() {
		const confirmed = window.confirm("Delete organizer?");

		if (!confirmed) return;

		startTransition(async () => {
			await deleteOrganizer(organizerId);

			router.refresh();
		});
	}

	return (
		<button
			type="button"
			onClick={handleDelete}
			disabled={isPending}
			className="text-sm text-red-500 cursor-pointer"
		>
			{isPending ? "Deleting..." : "Delete"}
		</button>
	);
}
