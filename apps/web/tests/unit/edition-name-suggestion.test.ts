import { describe, expect, it } from "vitest"
import { editionNameReducer, initialEditionNameState } from "@/features/event-editions/name-suggestion"

const select = (state: ReturnType<typeof initialEditionNameState>, seriesName: string) => editionNameReducer(state, { type: "seriesSelected", seriesName })
const type = (state: ReturnType<typeof initialEditionNameState>, value: string) => editionNameReducer(state, { type: "typed", value })

describe("edition name suggestion", () => {
  it("fills an untouched name when a series is selected", () => {
    expect(select(initialEditionNameState(undefined, undefined), "Gulima Trail Running")).toEqual({ value: "Gulima Trail Running", edited: false })
  })

  it("updates the suggestion when the series changes before the name is edited", () => {
    const first = select(initialEditionNameState(undefined, undefined), "Gulima Trail Running")
    expect(select(first, "Maratón del Sol").value).toBe("Maratón del Sol")
  })

  it("does not overwrite a name the admin typed, even when it equals the old suggestion", () => {
    const typed = type(select(initialEditionNameState(undefined, undefined), "Gulima Trail Running"), "Gulima Trail Running")
    expect(select(typed, "Maratón del Sol")).toEqual({ value: "Gulima Trail Running", edited: true })
  })

  it("does not bring the suggestion back after the admin clears the name", () => {
    const cleared = type(select(initialEditionNameState(undefined, undefined), "Gulima Trail Running"), "")
    expect(select(cleared, "Maratón del Sol")).toEqual({ value: "", edited: true })
  })

  it("keeps the saved name of an existing edition", () => {
    const saved = initialEditionNameState("Gulima 8", "Gulima Trail Running")
    expect(saved).toEqual({ value: "Gulima 8", edited: true })
    expect(select(saved, "Other series").value).toBe("Gulima 8")
  })

  it("initializes from a preselected series and never appends year or label", () => {
    expect(initialEditionNameState(undefined, "Gulima Trail Running")).toEqual({ value: "Gulima Trail Running", edited: false })
  })
})
