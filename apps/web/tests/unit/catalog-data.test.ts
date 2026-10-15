import { describe, expect, it } from "vitest"
import { CATALOG } from "../../prisma/seed/catalog.data"

const disciplines = CATALOG.flatMap((s) => s.disciplines)
const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/

describe("catalog data", () => {
  it("uses unique kebab-case slugs within sports and within disciplines", () => {
    const sports = CATALOG.map((s) => s.slug)
    expect(new Set(sports).size).toBe(sports.length)
    const ds = disciplines.map((d) => d.slug)
    expect(new Set(ds).size).toBe(ds.length)
    for (const s of [...sports, ...ds]) expect(s).toMatch(slug)
  })

  it("gives every sport and discipline a name and description, and every sport at least one discipline", () => {
    for (const s of CATALOG) {
      expect(s.name.trim()).not.toBe("")
      expect(s.description.trim()).not.toBe("")
      expect(s.disciplines.length).toBeGreaterThan(0)
    }
    for (const d of disciplines) {
      expect(d.name.trim()).not.toBe("")
      expect(d.description.trim()).not.toBe("")
    }
  })

  it("does not model distances as disciplines", () => {
    for (const d of disciplines) expect(d.slug).not.toMatch(/(^|-)\d+k?m?(-|$)/)
  })

  it("keeps legacy slugs and covers the required areas", () => {
    const ds = disciplines.map((d) => d.slug)
    expect(ds).toEqual(expect.arrayContaining([
      "road-running", "trail-running", "ultra-running", "triathlon", "road-cycling",
      "mountain-biking", "open-water-swimming", "obstacle-course-racing", "crossfit", "hyrox",
    ]))
    expect(CATALOG.find((s) => s.slug === "multisport")?.disciplines.map((d) => d.slug)).toContain("triathlon")
  })
})
