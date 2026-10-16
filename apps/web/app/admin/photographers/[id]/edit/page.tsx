import { notFound } from "next/navigation"
import { PhotographerForm } from "@/features/photographers/components/photographer-form"
import { getPhotographer, listDisciplineOptions } from "@/features/photographers/queries"

export const metadata = { title: "Edit photographer" }

export default async function EditPhotographerPage({ params }: { params: Promise<{ id: string }> }) {
  const [photographer, disciplines] = await Promise.all([getPhotographer((await params).id), listDisciplineOptions()])
  if (!photographer) notFound()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Edit photographer</h1>
      <PhotographerForm
        id={photographer.id}
        disciplines={disciplines}
        initialDisciplineIds={photographer.disciplineIds}
        initial={{
          name: photographer.name,
          slug: photographer.slug,
          description: photographer.description ?? "",
          instagram: photographer.instagram ?? "",
          website: photographer.website ?? "",
          email: photographer.email ?? "",
          phone: photographer.phone ?? "",
          profileImageUrl: photographer.profileImageUrl ?? "",
          city: photographer.city ?? "",
          countryCode: photographer.countryCode ?? "",
        }}
      />
    </div>
  )
}
