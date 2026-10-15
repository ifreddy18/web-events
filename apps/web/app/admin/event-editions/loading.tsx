import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading event editions">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-8 w-full max-w-md" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
