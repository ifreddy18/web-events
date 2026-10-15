import { LocationForm } from "@/features/locations/components/location-form"

export const metadata = { title: "New location" }

export default function NewLocationPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New location</h1>
      <LocationForm />
    </div>
  )
}
