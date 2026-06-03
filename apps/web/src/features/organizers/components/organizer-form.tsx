"use client";

import { useTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { generateSlug } from "@/lib/slug";

import {
	organizerSchema,
	OrganizerFormValues,
} from "../schemas/organizer.schema";

import { createOrganizer } from "../actions/create-organizer";
import { updateOrganizer } from "../actions/update-organizer";

type OrganizerFormProps = Readonly<{
	defaultValues?: Partial<OrganizerFormValues>;
	organizerId?: string;
}>;

export function OrganizerForm({
	defaultValues,
	organizerId,
}: OrganizerFormProps) {
	const router = useRouter();

	const [isPending, startTransition] = useTransition();
	const [serverError, setServerError] = useState("");

	const form = useForm<OrganizerFormValues>({
		resolver: zodResolver(organizerSchema),
		defaultValues: {
			name: "",
			slug: "",
			description: "",
			website: "",
			instagram: "",
			logoUrl: "",
			...defaultValues,
		},
	});

	const name = form.watch("name");
	const slug = form.watch("slug");
	const slugTouched = form.formState.dirtyFields.slug;

	useEffect(() => {
		if (!slug) {
			form.setValue("slug", generateSlug(name));
		}
	}, [name, slug, form]);

	useEffect(() => {
		if (!slugTouched) {
			form.setValue("slug", generateSlug(name));
		}
	}, [name, slugTouched, form]);

	async function onSubmit(values: OrganizerFormValues) {
		startTransition(async () => {
			try {
				if (organizerId) {
					await updateOrganizer(organizerId, values);
				} else {
					await createOrganizer(values);
				}
			} catch (error) {
				setServerError(
					error instanceof Error ? error.message : "Unexpected error",
				);
			}

			router.push("/admin/organizers");

			router.refresh();
		});
	}

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
			<div>
				<label htmlFor="name" className="mb-2 block text-sm font-medium">
					Name
				</label>

				<Input {...form.register("name")} />

				<p className="mt-1 text-sm text-red-500">
					{form.formState.errors.name?.message}
				</p>
			</div>

			<div>
				<label htmlFor="slug" className="mb-2 block text-sm font-medium">
					Slug
				</label>

				<Input {...form.register("slug")} />

				<p className="mt-1 text-sm text-red-500">
					{form.formState.errors.slug?.message}
				</p>
			</div>

			<div>
				<label htmlFor="description" className="mb-2 block text-sm font-medium">
					Description
				</label>

				<Input {...form.register("description")} />
			</div>

			<div>
				<label htmlFor="website" className="mb-2 block text-sm font-medium">
					Website
				</label>

				<Input {...form.register("website")} />

				<p className="mt-1 text-sm text-red-500">
					{form.formState.errors.website?.message}
				</p>
			</div>

			<div>
				<label htmlFor="instagram" className="mb-2 block text-sm font-medium">
					Instagram
				</label>

				<Input {...form.register("instagram")} />
			</div>

			<div>
				<label htmlFor="logoUrl" className="mb-2 block text-sm font-medium">
					Logo URL
				</label>

				<Input {...form.register("logoUrl")} />

				<p className="mt-1 text-sm text-red-500">
					{form.formState.errors.logoUrl?.message}
				</p>
			</div>

			{serverError && <p className="text-sm text-red-500">{serverError}</p>}

			<Button type="submit" disabled={isPending}>
				{isPending
					? "Saving..."
					: organizerId
						? "Update Organizer"
						: "Create Organizer"}
			</Button>
		</form>
	);
}
