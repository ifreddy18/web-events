"use client"

import { Input } from "@/components/ui/input"
import type { FieldErrors } from "@/shared/action-result"
import { DIFFICULTIES, type TrailRunningFormValues } from "../metadata"

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"

/**
 * Controlled fields for the Trail Running metadata. The parent form owns the values and converts
 * them with `trailRunningFormToMetadata`; the server validates the result with the strict schema,
 * and its errors arrive here as `metadata.<key>` field errors.
 */
export function TrailRunningMetadataFields({
  values,
  onChange,
  errors,
}: {
  values: TrailRunningFormValues
  onChange: (values: TrailRunningFormValues) => void
  errors: FieldErrors
}) {
  const set = <Key extends keyof TrailRunningFormValues>(key: Key, value: TrailRunningFormValues[Key]) => onChange({ ...values, [key]: value })
  const errorFor = (key: string) => errors[`metadata.${key}`]
  const a11y = (key: string) => ({
    "aria-invalid": !!errorFor(key),
    "aria-describedby": errorFor(key) ? `metadata-${key}-error` : undefined,
  })
  const message = (key: string) =>
    errorFor(key) && (
      <p id={`metadata-${key}-error`} className="text-sm text-destructive">
        {errorFor(key)?.join(" ")}
      </p>
    )

  const textField = (
    key: "distanceKm" | "elevationGainMeters" | "cutoffMinutes" | "terrainTypes" | "tags",
    label: string,
    opts: { required?: boolean; hint?: string; inputMode?: "decimal" | "numeric" } = {},
  ) => (
    <div className="space-y-1.5">
      <label htmlFor={`metadata-${key}`} className="text-sm font-medium">
        {label}
        {opts.required && <span aria-hidden> *</span>}
      </label>
      <Input
        id={`metadata-${key}`}
        value={values[key]}
        inputMode={opts.inputMode}
        onChange={(event) => set(key, event.target.value)}
        {...a11y(key)}
      />
      {opts.hint && !errorFor(key) && <p className="text-xs text-muted-foreground">{opts.hint}</p>}
      {message(key)}
    </div>
  )

  return (
    <fieldset className="space-y-4 rounded-md border p-4">
      <legend className="px-1 text-sm font-medium">Trail running details</legend>
      <p className="text-xs text-muted-foreground">Every detail is optional; leave what is not confirmed yet empty.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {textField("distanceKm", "Distance (km)", { inputMode: "decimal", hint: "e.g. 21 or 42.2" })}
        {textField("elevationGainMeters", "Elevation gain (m)", { inputMode: "numeric" })}
        {textField("cutoffMinutes", "Cutoff time (minutes)", { inputMode: "numeric" })}
        <div className="space-y-1.5">
          <label htmlFor="metadata-difficulty" className="text-sm font-medium">
            Difficulty
          </label>
          <select
            id="metadata-difficulty"
            value={values.difficulty}
            onChange={(event) => set("difficulty", event.target.value)}
            className={selectClass}
            {...a11y("difficulty")}
          >
            <option value="">Not set</option>
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty[0].toUpperCase() + difficulty.slice(1)}
              </option>
            ))}
          </select>
          {message("difficulty")}
        </div>
        {textField("terrainTypes", "Terrain types", { hint: "Separate with commas, e.g. mountain, rocky." })}
        {textField("tags", "Tags", { hint: "Separate with commas." })}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.beginnerFriendly} onChange={(event) => set("beginnerFriendly", event.target.checked)} />
        Beginner friendly
      </label>
    </fieldset>
  )
}
