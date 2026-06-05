"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import { deleteEventSeries } from "../actions/delete-event-series";

type DeleteEventSeriesButtonProps = Readonly<{
	eventSeriesId: string;
}>;

export function DeleteEventSeriesButton({
	eventSeriesId,
}: DeleteEventSeriesButtonProps) {
	const router = useRouter();

	const [isPending, startTransition] = useTransition();

	function handleDelete() {
		const confirmed = window.confirm("Delete event series?");

		if (!confirmed) return;

		startTransition(async () => {
			await deleteEventSeries(eventSeriesId);

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
