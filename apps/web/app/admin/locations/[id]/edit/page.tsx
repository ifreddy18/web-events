import { notFound } from "next/navigation"
import { LocationForm } from "@/features/locations/components/location-form"
import { getLocation } from "@/features/locations/queries"

export const metadata = { title: "Edit location" }

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const location = await getLocation((await params).id)
  if (!location) notFound()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Edit location</h1>
      <LocationForm
        id={location.id}
        initial={{
          country: location.country,
          state: location.state ?? "",
          city: location.city ?? "",
          venueName: location.venueName ?? "",
          address: location.address ?? "",
          slug: location.slug,
          latitude: location.latitude?.toString() ?? "",
          longitude: location.longitude?.toString() ?? "",
        }}
      />
    </div>
  )
}
