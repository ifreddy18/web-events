/**
 * State of the edition name field while creating an edition.
 *
 * The name starts as a suggestion (the selected series' name) so the admin does not retype it. Once the
 * admin has typed in the field, the value belongs to them: later series changes must not overwrite it, and
 * clearing it must not bring a suggestion back (an empty name is a deliberate input that validation reports).
 * Without the `edited` flag we could not tell "untouched suggestion" from "typed text that equals it".
 */
export type EditionNameState = { value: string; edited: boolean }

export type EditionNameAction = { type: "seriesSelected"; seriesName: string } | { type: "typed"; value: string }

/** Edit pages always start `edited`, so the saved name is never replaced by a suggestion. */
export function initialEditionNameState(savedName: string | undefined, preselectedSeriesName: string | undefined): EditionNameState {
  if (savedName) return { value: savedName, edited: true }
  return { value: preselectedSeriesName ?? "", edited: false }
}

export function editionNameReducer(state: EditionNameState, action: EditionNameAction): EditionNameState {
  if (action.type === "typed") return { value: action.value, edited: true }
  return state.edited ? state : { value: action.seriesName, edited: false }
}
