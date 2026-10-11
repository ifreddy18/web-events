"use client";

import { useTransition } from "react";

import { deleteCompetition } from "../actions/delete-competition";

type DeleteCompetitionButtonProps = Readonly<{
	competitionId: string;
}>;

export function DeleteCompetitionButton({
	competitionId,
}: DeleteCompetitionButtonProps) {
	const [isPending, startTransition] = useTransition();

	function handleDelete() {
		const confirmed = window.confirm("Are you sure?");

		if (!confirmed) {
			return;
		}

		startTransition(async () => {
			await deleteCompetition(competitionId);
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
