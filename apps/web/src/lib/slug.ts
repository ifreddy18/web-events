import slugify from "slugify";

export function generateSlug(value: string) {
	return slugify(value?.trim(), {
		lower: true,
		strict: true,
		trim: true,
	});
}
