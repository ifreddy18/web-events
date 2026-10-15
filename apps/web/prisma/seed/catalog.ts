import type { PrismaClient } from "@prisma/client"
import { CATALOG, type CatalogSport } from "./catalog.data.ts"

export type CatalogSummary = {
  sportsCreated: number
  sportsExisting: number
  disciplinesCreated: number
  disciplinesExisting: number
  /** Slugs present but soft-deleted: left untouched, and their new disciplines are skipped. */
  skipped: string[]
}

/**
 * Inserts missing sports and disciplines, keyed by slug. Existing rows (including
 * soft-deleted or manually edited ones) are never updated, so reruns are no-ops.
 *
 * Everything runs in one transaction so a failure cannot leave a half-loaded catalog.
 * `skipDuplicates` (INSERT ... ON CONFLICT DO NOTHING on the unique slug) keeps this safe
 * if two runs overlap, and its returned `count` tells us how many rows were really inserted.
 */
export async function seedCatalog(db: PrismaClient, catalog: CatalogSport[] = CATALOG): Promise<CatalogSummary> {
  return db.$transaction(async (tx) => {
    const summary: CatalogSummary = {
      sportsCreated: 0,
      sportsExisting: 0,
      disciplinesCreated: 0,
      disciplinesExisting: 0,
      skipped: [],
    }
    for (const { disciplines, ...sport } of catalog) {
      const { count: insertedSportCount } = await tx.sport.createMany({ data: [sport], skipDuplicates: true })
      summary.sportsCreated += insertedSportCount
      summary.sportsExisting += 1 - insertedSportCount
      const storedSport = await tx.sport.findUniqueOrThrow({ where: { slug: sport.slug }, select: { id: true, deletedAt: true } })
      // A soft-deleted sport is deliberately retired: never attach new disciplines to it.
      if (storedSport.deletedAt) {
        summary.skipped.push(sport.slug)
        continue
      }
      const { count: insertedDisciplineCount } = await tx.discipline.createMany({
        data: disciplines.map((discipline) => ({ ...discipline, sportId: storedSport.id })),
        skipDuplicates: true,
      })
      summary.disciplinesCreated += insertedDisciplineCount
      summary.disciplinesExisting += disciplines.length - insertedDisciplineCount
    }
    return summary
  })
}
