"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

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
		<Button
			type="button"
			variant="destructive"
			size="sm"
			disabled={isPending}
			onClick={handleDelete}
		>
			Delete
		</Button>
	);
}
