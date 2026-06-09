"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Combobox } from "@/components/form/combobox";
import { FormError } from "@/components/form/form-error";

import { generateSlug } from "@/lib/slug";

import {
	eventEditionSchema,
	type EventEditionFormValues,
} from "../schemas/event-edition.schema";

import { createEventEdition } from "../actions/create-event-edition";
import { updateEventEdition } from "../actions/update-event-edition";

import { EVENT_EDITION_STATUS_OPTIONS } from "@/constants/event-edition-status";

type Option = {
	value: string;
	label: string;
};

type EventEditionFormProps = Readonly<{
	defaultValues?: Partial<EventEditionFormValues>;
	eventEditionId?: string;

	eventSeriesOptions: Option[];
	locationOptions: Option[];
}>;

export function EventEditionForm({
	defaultValues,
	eventEditionId,
	eventSeriesOptions,
	locationOptions,
}: EventEditionFormProps) {
	const router = useRouter();

	const [isPending, startTransition] = useTransition();
	const [serverError, setServerError] = useState("");

	const form = useForm<EventEditionFormValues>({
		resolver: zodResolver(eventEditionSchema),

		defaultValues: {
			eventSeriesId: "",
			locationId: "",

			year: new Date().getFullYear(),

			name: "",
			slug: "",

			startsAt: "",

			endsAt: "",

			registrationOpenAt: "",
			registrationCloseAt: "",

			registrationUrl: "",
			resultsUrl: "",

			status: "DRAFT",

			...defaultValues,
		},
	});

	const selectedEventSeriesId = useWatch({
		control: form.control,
		name: "eventSeriesId",
	});

	const year = useWatch({ control: form.control, name: "year" });
	const name = useWatch({ control: form.control, name: "name" });
	const locationId = useWatch({ control: form.control, name: "locationId" });
	const status = useWatch({ control: form.control, name: "status" });

	const nameTouched = form.formState.dirtyFields.name;
	const slugTouched = form.formState.dirtyFields.slug;

	const selectedSeries = useMemo(
		() =>
			eventSeriesOptions.find(
				(option) => option.value === selectedEventSeriesId,
			),
		[eventSeriesOptions, selectedEventSeriesId],
	);

	useEffect(() => {
		if (!nameTouched && selectedSeries && year) {
			form.setValue("name", `${selectedSeries.label} ${year}`);
		}
	}, [selectedSeries, year, nameTouched, form]);

	useEffect(() => {
		if (!slugTouched && name) {
			form.setValue("slug", generateSlug(name));
		}
	}, [name, slugTouched, form]);

	async function onSubmit(values: EventEditionFormValues) {
		startTransition(async () => {
			try {
				if (eventEditionId) {
					await updateEventEdition(eventEditionId, values);
				} else {
					await createEventEdition(values);
				}

				router.push("/admin/event-editions");

				router.refresh();
			} catch (error) {
				setServerError(
					error instanceof Error ? error.message : "Unexpected error",
				);
			}
		});
	}

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
			<div>
				<label
					htmlFor="eventSeriesId"
					className="mb-2 block text-sm font-medium"
				>
					Event Series
				</label>

				<Combobox
					value={selectedEventSeriesId}
					onChange={(value) => form.setValue("eventSeriesId", value)}
					options={eventSeriesOptions}
					placeholder="Select event series"
				/>

				<FormError message={form.formState.errors.eventSeriesId?.message} />
			</div>

			<div>
				<label htmlFor="locationId" className="mb-2 block text-sm font-medium">
					Location
				</label>

				<Combobox
					value={locationId ?? ""}
					onChange={(value) => form.setValue("locationId", value)}
					options={locationOptions}
					placeholder="Select location"
				/>
			</div>

			<div>
				<label htmlFor="year" className="mb-2 block text-sm font-medium">
					Year
				</label>

				<Input
					type="number"
					{...form.register("year", {
						valueAsNumber: true,
					})}
				/>
				<FormError message={form.formState.errors.year?.message} />
			</div>

			<div>
				<label htmlFor="name" className="mb-2 block text-sm font-medium">
					Name
				</label>

				<Input {...form.register("name")} />

				<FormError message={form.formState.errors.name?.message} />
			</div>

			<div>
				<label htmlFor="slug" className="mb-2 block text-sm font-medium">
					Slug
				</label>

				<Input {...form.register("slug")} />

				<FormError message={form.formState.errors.slug?.message} />
			</div>

			<div>
				<label htmlFor="startsAt" className="mb-2 block text-sm font-medium">
					Starts At
				</label>

				<Input type="datetime-local" {...form.register("startsAt")} />
				<FormError message={form.formState.errors.startsAt?.message} />
			</div>

			<div>
				<label htmlFor="endsAt" className="mb-2 block text-sm font-medium">
					Ends At
				</label>

				<Input type="datetime-local" {...form.register("endsAt")} />
			</div>

			<div>
				<label
					htmlFor="registrationOpenAt"
					className="mb-2 block text-sm font-medium"
				>
					Registration Open
				</label>

				<Input type="datetime-local" {...form.register("registrationOpenAt")} />
			</div>

			<div>
				<label
					htmlFor="registrationCloseAt"
					className="mb-2 block text-sm font-medium"
				>
					Registration Close
				</label>

				<Input
					type="datetime-local"
					{...form.register("registrationCloseAt")}
				/>
			</div>

			<div>
				<label
					htmlFor="registrationUrl"
					className="mb-2 block text-sm font-medium"
				>
					Registration URL
				</label>

				<Input {...form.register("registrationUrl")} />
				<FormError message={form.formState.errors.registrationUrl?.message} />
			</div>

			<div>
				<label htmlFor="resultsUrl" className="mb-2 block text-sm font-medium">
					Results URL
				</label>

				<Input {...form.register("resultsUrl")} />
				<FormError message={form.formState.errors.resultsUrl?.message} />
			</div>

			<div>
				<label htmlFor="status" className="mb-2 block text-sm font-medium">
					Status
				</label>

				<Combobox
					value={status}
					onChange={(value) =>
						form.setValue("status", value as EventEditionFormValues["status"])
					}
					options={EVENT_EDITION_STATUS_OPTIONS.map((option) => ({
						value: option.value,
						label: option.label,
					}))}
					placeholder="Select status"
				/>
				<FormError message={form.formState.errors.status?.message} />
			</div>

			{serverError && <FormError message={serverError} />}

			<Button type="submit" disabled={isPending}>
				{isPending
					? "Saving..."
					: eventEditionId
						? "Update Event Edition"
						: "Create Event Edition"}
			</Button>
		</form>
	);
}
