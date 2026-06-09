"use client";

import { useTransition } from "react";

import { deleteEventEdition } from "../actions/delete-event-edition";

type DeleteEventEditionButtonProps = Readonly<{
	eventEditionId: string;
}>;

export function DeleteEventEditionButton({
	eventEditionId,
}: DeleteEventEditionButtonProps) {
	const [isPending, startTransition] = useTransition();

	function handleDelete() {
		const confirmed = window.confirm("Delete this event edition?");

		if (!confirmed) {
			return;
		}

		startTransition(async () => {
			await deleteEventEdition(eventEditionId);
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
