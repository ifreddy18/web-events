import { PhotographerForm } from "@/features/photographers/components/photographer-form"
import { listDisciplineOptions } from "@/features/photographers/queries"

export const metadata = { title: "New photographer" }

export default async function NewPhotographerPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New photographer</h1>
      <PhotographerForm disciplines={await listDisciplineOptions()} />
    </div>
  )
}
