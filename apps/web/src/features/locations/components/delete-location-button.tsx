"use client";

import { useTransition } from "react";

import { deleteLocation } from "../actions/delete-location";

type DeleteLocationButtonProps = Readonly<{
	locationId: string;
}>;

export function DeleteLocationButton({
	locationId,
}: DeleteLocationButtonProps) {
	const [isPending, startTransition] = useTransition();

	function handleDelete() {
		const confirmed = globalThis.confirm("Are you sure?");

		if (!confirmed) {
			return;
		}

		startTransition(async () => {
			await deleteLocation(locationId);
		});
	}

	return (
		<button
			type="button"
			onClick={handleDelete}
			disabled={isPending}
			className="text-sm text-red-500"
		>
			Delete
		</button>
	);
}
