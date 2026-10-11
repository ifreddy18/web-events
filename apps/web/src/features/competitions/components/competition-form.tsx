"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Combobox } from "@/components/form/combobox";
import { FormError } from "@/components/form/form-error";

import { generateSlug } from "@/lib/slug";

import { COMPETITION_STATUS_OPTIONS } from "@/constants/competition-status";

import {
	competitionSchema,
	type CompetitionFormValues,
} from "../schemas/competition.schema";

import { createCompetition } from "../actions/create-competition";
import { updateCompetition } from "../actions/update-competition";

type Option = {
	value: string;
	label: string;
};

type CompetitionFormProps = Readonly<{
	defaultValues?: Partial<CompetitionFormValues>;
	competitionId?: string;

	eventEditionOptions: Option[];
	disciplineOptions: Option[];
}>;

export function CompetitionForm({
	defaultValues,
	competitionId,
	eventEditionOptions,
	disciplineOptions,
}: CompetitionFormProps) {
	const router = useRouter();

	const [isPending, startTransition] = useTransition();
	const [serverError, setServerError] = useState("");

	const form = useForm<CompetitionFormValues>({
		resolver: zodResolver(competitionSchema),

		defaultValues: {
			eventEditionId: "",
			disciplineId: "",

			name: "",
			slug: "",

			description: "",

			status: "ACTIVE",

			...defaultValues,
		},
	});

	const name = useWatch({
		control: form.control,
		name: "name",
	});

	const eventEditionId = useWatch({
		control: form.control,
		name: "eventEditionId",
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
		if (!slugTouched && name) {
			form.setValue("slug", generateSlug(name));
		}
	}, [name, slugTouched, form]);

	async function onSubmit(values: CompetitionFormValues) {
		startTransition(async () => {
			try {
				if (competitionId) {
					await updateCompetition(competitionId, values);
				} else {
					await createCompetition(values);
				}

				router.push("/admin/competitions");
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
					htmlFor="eventEditionId"
					className="mb-2 block text-sm font-medium"
				>
					Event Edition
				</label>

				<Combobox
					value={eventEditionId}
					onChange={(value) => form.setValue("eventEditionId", value)}
					options={eventEditionOptions}
					placeholder="Select event edition"
				/>

				<FormError message={form.formState.errors.eventEditionId?.message} />
			</div>

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
					options={disciplineOptions}
					placeholder="Select discipline"
				/>

				<FormError message={form.formState.errors.disciplineId?.message} />
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
				<label htmlFor="description" className="mb-2 block text-sm font-medium">
					Description
				</label>

				<Textarea {...form.register("description")} />
			</div>

			<div>
				<label htmlFor="status" className="mb-2 block text-sm font-medium">
					Status
				</label>

				<Combobox
					value={status}
					onChange={(value) =>
						form.setValue("status", value as CompetitionFormValues["status"])
					}
					options={COMPETITION_STATUS_OPTIONS.map((option) => ({
						value: option.value,
						label: option.label,
					}))}
					placeholder="Select status"
				/>
			</div>

			{serverError && <FormError message={serverError} />}

			<Button type="submit" disabled={isPending}>
				{isPending
					? "Saving..."
					: competitionId
						? "Update Competition"
						: "Create Competition"}
			</Button>
		</form>
	);
}
