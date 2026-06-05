"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { generateSlug } from "@/lib/slug";

import {
	eventSeriesSchema,
	type EventSeriesFormValues,
} from "../schemas/event-series.schema";

import { createEventSeries } from "../actions/create-event-series";
import { updateEventSeries } from "../actions/update-event-series";
import { Combobox } from "@/components/form/combobox";
import { FormError } from "@/components/form/form-error";
import { EVENT_SERIES_STATUS_OPTIONS } from "../constants/event-series-status";

type EventSeriesFormProps = Readonly<{
	defaultValues?: Partial<EventSeriesFormValues>;
	eventSeriesId?: string;

	organizers: {
		id: string;
		name: string;
	}[];

	disciplines: {
		id: string;
		name: string;
	}[];
}>;

export function EventSeriesForm({
	defaultValues,
	eventSeriesId,
	organizers,
	disciplines,
}: EventSeriesFormProps) {
	const router = useRouter();

	const [isPending, startTransition] = useTransition();
	const [serverError, setServerError] = useState("");

	const form = useForm<EventSeriesFormValues>({
		resolver: zodResolver(eventSeriesSchema),

		defaultValues: {
			organizerId: "",
			disciplineId: "",
			name: "",
			slug: "",
			description: "",
			officialWebsite: "",
			instagram: "",
			status: "ACTIVE",
			...defaultValues,
		},
	});

	const name = useWatch({
		control: form.control,
		name: "name",
	});

	const organizerId = useWatch({
		control: form.control,
		name: "organizerId",
	});

	const disciplineId = useWatch({
		control: form.control,
		name: "disciplineId",
	});

	const status = useWatch({
		control: form.control,
		name: "status",
	});

	const slugTouched = form.formState.dirtyFields.slug;

	useEffect(() => {
		if (!slugTouched) {
			form.setValue("slug", generateSlug(name));
		}
	}, [name, slugTouched, form]);

	async function onSubmit(values: EventSeriesFormValues) {
		startTransition(async () => {
			try {
				if (eventSeriesId) {
					await updateEventSeries(eventSeriesId, values);
				} else {
					await createEventSeries(values);
				}

				router.push("/admin/event-series");

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
			{/* Organizer */}

			<div>
				<label htmlFor="organizerId" className="mb-2 block text-sm font-medium">
					Organizer
				</label>

				<Combobox
					value={organizerId}
					onChange={(value) => form.setValue("organizerId", value)}
					options={organizers.map((organizer) => ({
						value: organizer.id,
						label: organizer.name,
					}))}
					placeholder="Select organizer"
					searchPlaceholder="Search organizer..."
				/>

				<FormError message={form.formState.errors.organizerId?.message} />
			</div>

			{/* Discipline */}

			<div>
				<label
					htmlFor="disciplineId"
					className="mb-2 block text-sm font-medium"
				>
					Discipline
				</label>

				<Combobox
					value={disciplineId}
					onChange={(value) => form.setValue("disciplineId", value)}
					options={disciplines.map((discipline) => ({
						value: discipline.id,
						label: discipline.name,
					}))}
					placeholder="Select discipline"
					searchPlaceholder="Search discipline..."
				/>

				<FormError message={form.formState.errors.disciplineId?.message} />
			</div>

			{/* Name */}

			<div>
				<label htmlFor="name" className="mb-2 block text-sm font-medium">
					Name
				</label>

				<Input id="name" {...form.register("name")} />

				<FormError message={form.formState.errors.name?.message} />
			</div>

			{/* Slug */}

			<div>
				<label htmlFor="slug" className="mb-2 block text-sm font-medium">
					Slug
				</label>

				<Input id="slug" {...form.register("slug")} />

				<FormError message={form.formState.errors.slug?.message} />
			</div>

			{/* Description */}

			<div>
				<label htmlFor="description" className="mb-2 block text-sm font-medium">
					Description
				</label>

				<Textarea id="description" {...form.register("description")} />
			</div>

			{/* Website */}

			<div>
				<label
					htmlFor="officialWebsite"
					className="mb-2 block text-sm font-medium"
				>
					Official Website
				</label>

				<Input id="officialWebsite" {...form.register("officialWebsite")} />

				<FormError message={form.formState.errors.officialWebsite?.message} />
			</div>

			{/* Instagram */}

			<div>
				<label htmlFor="instagram" className="mb-2 block text-sm font-medium">
					Instagram
				</label>

				<Input id="instagram" {...form.register("instagram")} />
			</div>

			{/* Status */}

			<div>
				<label htmlFor="status" className="mb-2 block text-sm font-medium">
					Status
				</label>

				<Select
					value={status}
					onValueChange={(value) =>
						form.setValue("status", value as EventSeriesFormValues["status"])
					}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>

					<SelectContent>
						{EVENT_SERIES_STATUS_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{serverError && <p className="text-sm text-red-500">{serverError}</p>}

			<Button type="submit" disabled={isPending}>
				{isPending
					? "Saving..."
					: eventSeriesId
						? "Update Event Series"
						: "Create Event Series"}
			</Button>
		</form>
	);
}
