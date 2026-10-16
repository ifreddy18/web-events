import { describe, expect, it } from "vitest"
import { ACCREDITATION_DETAILS, normalizePhotographerSearchTerm } from "@/features/event-photographers/rules"
import {
  ACCREDITATIONS,
  assignmentCreateSchema,
  assignmentDetailsSchema,
  photographerSearchSchema,
} from "@/features/event-photographers/schemas"

const editionId = "11111111-1111-4111-8111-111111111111"
const providerId = "22222222-2222-4222-8222-222222222222"

describe("assignment details", () => {
  it("defaults to an unspecified accreditation and no note", () => {
    expect(assignmentDetailsSchema.parse({})).toEqual({ accreditation: "UNKNOWN", description: null })
  })

  it("accepts every ProviderAccreditation value and nothing else", () => {
    for (const accreditation of ACCREDITATIONS) expect(assignmentDetailsSchema.safeParse({ accreditation }).success).toBe(true)
    expect(assignmentDetailsSchema.safeParse({ accreditation: "VIP" }).success).toBe(false)
    expect(assignmentDetailsSchema.safeParse({ accreditation: "official" }).success).toBe(false)
  })

  it("normalizes whitespace in the note and turns blank into null", () => {
    expect(assignmentDetailsSchema.parse({ description: "  Finish   line  " }).description).toBe("Finish line")
    expect(assignmentDetailsSchema.parse({ description: "   " }).description).toBeNull()
  })

  it("rejects a note longer than 500 characters", () => {
    expect(assignmentDetailsSchema.safeParse({ description: "x".repeat(501) }).success).toBe(false)
  })
})

describe("assignment creation", () => {
  it("requires valid edition and photographer ids", () => {
    expect(assignmentCreateSchema.safeParse({ eventEditionId: editionId, providerId }).success).toBe(true)
    expect(assignmentCreateSchema.safeParse({ eventEditionId: editionId }).success).toBe(false)
    expect(assignmentCreateSchema.safeParse({ eventEditionId: "nope", providerId }).success).toBe(false)
    expect(assignmentCreateSchema.safeParse({ eventEditionId: editionId, providerId: "nope" }).success).toBe(false)
  })

  it("does not accept a role: the role is fixed to PHOTOGRAPHER by the feature", () => {
    const parsed = assignmentCreateSchema.parse({ eventEditionId: editionId, providerId, role: "VIDEOGRAPHER" })
    expect(parsed).not.toHaveProperty("role")
  })
})

describe("photographer search", () => {
  it("cleans the term, defaults the page and tolerates a bad page", () => {
    expect(photographerSearchSchema.parse({ eventEditionId: editionId, q: "  Ana   Pérez ", page: "2" })).toMatchObject({ q: "Ana Pérez", page: 2 })
    expect(photographerSearchSchema.parse({ eventEditionId: editionId, q: "x", page: "-4" }).page).toBe(1)
    expect(photographerSearchSchema.parse({ eventEditionId: editionId }).q).toBe("")
  })

  it("falls back to an empty term when the term is absurdly long", () => {
    expect(photographerSearchSchema.parse({ eventEditionId: editionId, q: "x".repeat(101) }).q).toBe("")
  })

  it("requires an edition id", () => {
    expect(photographerSearchSchema.safeParse({ q: "ana" }).success).toBe(false)
  })

  it("ignores leading @ signs and spaces in the term", () => {
    expect(normalizePhotographerSearchTerm("  @lens.team ")).toBe("lens.team")
    expect(normalizePhotographerSearchTerm("@@x")).toBe("x")
    expect(normalizePhotographerSearchTerm("a@b")).toBe("a@b")
  })
})

describe("accreditation help", () => {
  it("has a label and help text for every accreditation value", () => {
    for (const value of ACCREDITATIONS) {
      expect(ACCREDITATION_DETAILS[value].label.length).toBeGreaterThan(0)
      expect(ACCREDITATION_DETAILS[value].help.length).toBeGreaterThan(0)
    }
  })
})
