"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { FormError } from "@/components/form/form-error";

import { generateSlug } from "@/lib/slug";

import {
	locationSchema,
	type LocationFormValues,
} from "../schemas/location.schema";

import { createLocation } from "../actions/create-location";
import { updateLocation } from "../actions/update-location";

type LocationFormProps = Readonly<{
	defaultValues?: Partial<LocationFormValues>;
	locationId?: string;
}>;

export function LocationForm({ defaultValues, locationId }: LocationFormProps) {
	const router = useRouter();

	const [isPending, startTransition] = useTransition();
	const [serverError, setServerError] = useState("");

	const form = useForm<LocationFormValues>({
		resolver: zodResolver(locationSchema),

		defaultValues: {
			country: "",
			state: "",
			city: "",
			venueName: "",
			address: "",
			slug: "",
			latitude: undefined,
			longitude: undefined,
			...defaultValues,
		},
	});

	const venueName = useWatch({
		control: form.control,
		name: "venueName",
	});

	const slug = useWatch({
		control: form.control,
		name: "slug",
	});

	const slugTouched = form.formState.dirtyFields.slug;

	useEffect(() => {
		if (!slug) {
			form.setValue("slug", generateSlug(venueName ?? ""));
		}
	}, [venueName, slug, form]);

	useEffect(() => {
		if (!slugTouched) {
			form.setValue("slug", generateSlug(venueName ?? ""));
		}
	}, [venueName, slugTouched, form]);

	async function onSubmit(values: LocationFormValues) {
		startTransition(async () => {
			try {
				if (locationId) {
					await updateLocation(locationId, values);
				} else {
					await createLocation(values);
				}

				router.push("/admin/locations");
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
				<label htmlFor="country" className="mb-2 block text-sm font-medium">
					Country
				</label>

				<Input id="country" {...form.register("country")} />

				<FormError message={form.formState.errors.country?.message} />
			</div>

			<div>
				<label htmlFor="state" className="mb-2 block text-sm font-medium">
					State
				</label>

				<Input id="state" {...form.register("state")} />
			</div>

			<div>
				<label htmlFor="city" className="mb-2 block text-sm font-medium">
					City
				</label>

				<Input id="city" {...form.register("city")} />
			</div>

			<div>
				<label htmlFor="venueName" className="mb-2 block text-sm font-medium">
					Venue Name
				</label>

				<Input id="venueName" {...form.register("venueName")} />
			</div>

			<div>
				<label htmlFor="address" className="mb-2 block text-sm font-medium">
					Address
				</label>

				<Textarea id="address" {...form.register("address")} />
			</div>

			<div>
				<label htmlFor="slug" className="mb-2 block text-sm font-medium">
					Slug
				</label>

				<Input id="slug" {...form.register("slug")} />

				<FormError message={form.formState.errors.slug?.message} />
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<label htmlFor="latitude" className="mb-2 block text-sm font-medium">
						Latitude
					</label>

					<Input
						id="latitude"
						type="number"
						step="any"
						{...form.register("latitude", {
							valueAsNumber: true,
						})}
					/>
				</div>

				<div>
					<label htmlFor="longitude" className="mb-2 block text-sm font-medium">
						Longitude
					</label>

					<Input
						id="longitude"
						type="number"
						step="any"
						{...form.register("longitude", {
							valueAsNumber: true,
						})}
					/>
				</div>
			</div>

			{serverError && <FormError message={serverError} />}

			<Button type="submit" disabled={isPending}>
				{isPending
					? "Saving..."
					: locationId
						? "Update Location"
						: "Create Location"}
			</Button>
		</form>
	);
}
