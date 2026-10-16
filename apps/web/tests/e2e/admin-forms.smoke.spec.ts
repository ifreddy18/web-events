import { expect, test, type Page } from "@playwright/test"
import { ADMIN_STORAGE_STATE } from "./global-setup"

// Smoke test of the Locations and Organizers forms. Global setup provisions a throwaway admin
// in events_test (see global-setup.ts); a missing setup fails the run instead of skipping.
const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD
if (!email || !password) throw new Error("E2E admin credentials missing: global setup did not run.")

// Interactions before hydration would fall back to native form submits / dead buttons.
const hydrated = (page: Page) => page.waitForLoadState("networkidle")

const run = `itest-e2e-${Date.now()}`

/** Opens a searchable selector (role=combobox), types a search and picks the matching option. */
async function pickSearchable(page: Page, label: string, search: string, option: string | RegExp) {
  await page.getByRole("combobox", { name: label, exact: true }).click()
  await page.getByPlaceholder(/^Search /).fill(search)
  await page.getByRole("option", { name: option }).first().click()
}

test("unauthenticated visitors are redirected to login", async ({ page }) => {
  for (const path of ["/admin", "/admin/organizers", "/admin/locations/new", "/admin/event-series", "/admin/event-series/new", "/admin/event-editions", "/admin/event-editions/new", "/admin/competitions", "/admin/competitions/new", "/admin/photographers", "/admin/photographers/new"]) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/login/)
  }
})

test.describe("signed in", () => {
// Sign-in is rate limited (5/min), so global setup logs in once and shares the session.
test.use({ storageState: ADMIN_STORAGE_STATE })

test("organizer: validation, create, edit, delete", async ({ page }) => {
  await page.goto("/admin/organizers/new")
  await hydrated(page)
  await page.getByRole("button", { name: "Create organizer" }).click()
  await expect(page.getByText("Name is required.")).toBeVisible()

  await page.getByLabel("Name").fill(`${run} Club`)
  await page.getByRole("button", { name: "Create organizer" }).click()
  await expect(page.getByRole("status")).toHaveText("Organizer created.")

  await page.getByLabel("Search organizers").fill(run)
  await page.keyboard.press("Enter")
  await page.waitForURL(/q=/)
  await hydrated(page)
  await page.getByRole("link", { name: "Edit", exact: true }).click()
  await page.waitForURL("**/edit")
  await hydrated(page)
  await page.getByLabel("Description").fill("Edited")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("status")).toHaveText("Organizer updated.")

  await page.getByLabel("Search organizers").fill(run)
  await page.keyboard.press("Enter")
  await page.waitForURL(/q=/)
  await hydrated(page)
  await page.getByRole("button", { name: `Delete ${run} Club` }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect(page.getByRole("status")).toHaveText("Organizer deleted.")
})

test("photographer: Instagram-only create, edit, persistence, search, delete", async ({ page }) => {
  const handle = `e2e.${Date.now()}`
  await page.goto("/admin/photographers/new")
  await hydrated(page)
  await page.getByRole("button", { name: "Create photographer" }).click()
  await expect(page.getByText("Name is required.")).toBeVisible()

  // Only a name, an Instagram profile and a discipline: no website or other contact data is required.
  await page.getByLabel("Public name").fill(`${run} Lens Studio`)
  await page.getByLabel("Instagram").fill(`@${handle}`)
  await page.getByRole("checkbox", { name: "E2E Discipline" }).check()
  await expect(page.getByLabel("Public name")).toHaveAccessibleDescription(/studio or team/)
  await page.getByRole("button", { name: "Create photographer" }).click()
  await expect(page.getByRole("status")).toHaveText("Photographer created.")

  await page.getByLabel("Search photographers").fill(run)
  await page.keyboard.press("Enter")
  await page.waitForURL(/q=/)
  await hydrated(page)
  await expect(page.getByRole("row", { name: new RegExp(`${run} Lens Studio.*@${handle}`) })).toBeVisible()
  await page.getByRole("link", { name: "Edit", exact: true }).click()
  await page.waitForURL("**/edit")
  await hydrated(page)
  await expect(page.getByRole("checkbox", { name: "E2E Discipline" })).toBeChecked()
  await page.getByLabel("Biography").fill("Trail and road specialist")
  await page.getByLabel("Website or portfolio").fill("https://example.com/portfolio")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("status")).toHaveText("Photographer updated.")

  await page.getByLabel("Search photographers").fill(handle)
  await page.keyboard.press("Enter")
  await page.waitForURL(/q=/)
  await hydrated(page)
  await page.getByRole("link", { name: "Edit", exact: true }).click()
  await page.waitForURL("**/edit")
  await hydrated(page)
  await expect(page.getByLabel("Biography")).toHaveValue("Trail and road specialist")
  await expect(page.getByLabel("Website or portfolio")).toHaveValue("https://example.com/portfolio")
  await expect(page.getByLabel("Instagram")).toHaveValue(handle)
  await expect(page.getByRole("checkbox", { name: "E2E Discipline" })).toBeChecked()

  await page.goto(`/admin/photographers?q=${encodeURIComponent(run)}`)
  await hydrated(page)
  await page.getByRole("button", { name: `Delete ${run} Lens Studio` }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect(page.getByRole("status")).toHaveText("Photographer deleted.")
  await page.goto(`/admin/photographers?q=${encodeURIComponent(run)}`)
  await expect(page.getByText(`No photographers match these filters.`)).toBeVisible()
})

test("location: validation, create, delete", async ({ page }) => {
  await page.goto("/admin/locations/new")
  await hydrated(page)
  await page.getByRole("button", { name: "Create location" }).click()
  await expect(page.getByText("Country is required.")).toBeVisible()

  // The country is chosen from a searchable list of all countries, not typed as free text.
  await expect(page.getByRole("combobox", { name: "Country", exact: true })).toHaveText("Select a country…")
  await pickSearchable(page, "Country", "venez", "Venezuela")
  await expect(page.getByRole("combobox", { name: "Country", exact: true })).toHaveText("Venezuela")
  await page.getByLabel("City").fill(run)
  await page.getByRole("button", { name: "Create location" }).click()
  await expect(page.getByRole("status")).toHaveText("Location created.")

  await page.getByLabel("Search locations").fill(run)
  await page.keyboard.press("Enter")
  await page.waitForURL(/q=/)
  await hydrated(page)
  await page.getByRole("button", { name: /^Delete / }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect(page.getByRole("status")).toHaveText("Location deleted.")
})

test("event series: validation, primary + co-organizers, edit assignments", async ({ page }) => {
  const name = `${run} Series`
  await page.goto("/admin/event-series/new")
  await hydrated(page)
  await page.getByRole("button", { name: "Create series" }).click()
  await expect(page.getByText("Name is required.")).toBeVisible()
  await expect(page.getByText("Select a discipline.")).toBeVisible()
  await expect(page.getByText("Select a primary organizer.")).toBeVisible()

  await page.getByRole("textbox", { name: "Name" }).fill(name)
  await page.getByLabel("Discipline").selectOption({ label: "E2E Sport · E2E Discipline" })
  await page.getByLabel("Primary organizer").selectOption({ label: "E2E Org Alpha" })
  await page.getByLabel("E2E Org Beta").check()
  await page.getByLabel("E2E Org Gamma").check()
  await page.getByRole("button", { name: "Create series" }).click()
  await expect(page.getByRole("status")).toHaveText("Series created.")

  await page.getByLabel("Search series").fill(run)
  await page.getByRole("button", { name: "Search" }).click()
  const row = page.getByRole("row", { name: new RegExp(name) })
  await expect(row).toContainText("E2E Org Alpha +2")
  await row.getByRole("link", { name: "Edit", exact: true }).click()
  await expect(page.getByLabel("Primary organizer")).toHaveValue(/.+/)
  await hydrated(page)

  // Promote Beta to primary; Alpha becomes a candidate again (primary is excluded from co-organizers).
  await page.getByLabel("Primary organizer").selectOption({ label: "E2E Org Beta" })
  await page.getByLabel("E2E Org Gamma").uncheck()
  await page.getByLabel("E2E Org Alpha").check()
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("status")).toHaveText("Series updated.")

  await page.getByLabel("Search series").fill(run)
  await page.getByRole("button", { name: "Search" }).click()
  // The unfiltered list already shows the row, so wait for the filtered page and its hydration
  // before using the delete dialog; otherwise the click can land on a page that is being replaced.
  await page.waitForURL(/q=/)
  await hydrated(page)
  await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText("E2E Org Beta +1")

  await page.getByRole("button", { name: `Delete ${name}` }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect(page.getByRole("status")).toHaveText("Series deleted.")
})

test("event edition: validation, inherited organizers, edit assignments, same-year editions", async ({ page }) => {
  const name = `${run} Edition`
  const secondName = `${run} Second`
  const selectedOption = (id: string) => page.locator(`#${id} option:checked`)

  await page.goto("/admin/event-editions/new")
  await hydrated(page)
  await page.getByRole("button", { name: "Create edition" }).click()
  await expect(page.getByText("Select a series.")).toBeVisible()
  await expect(page.getByText("Name is required.")).toBeVisible()
  await expect(page.getByText("Select a primary organizer.")).toBeVisible()

  // Selecting a series pre-fills its organizer template (Alpha primary, Beta co-organizer).
  await page.getByLabel("Series").selectOption({ label: "E2E Template Series" })
  await expect(selectedOption("primaryOrganizerId")).toHaveText("E2E Org Alpha")
  await expect(page.getByLabel("E2E Org Beta")).toBeChecked()
  await expect(page.getByLabel("E2E Org Gamma")).not.toBeChecked()

  await page.getByLabel("Edition name").fill(name)
  await page.getByLabel("Year").fill("2031")
  await page.getByLabel("Start date").fill("2031-05-10")
  await page.getByLabel("End date").fill("2031-05-09")
  await page.getByRole("button", { name: "Create edition" }).click()
  await expect(page.getByText("The end date cannot be before the start date.")).toBeVisible()

  // Adjust the copied assignments (add Gamma) and fix the dates.
  await page.getByLabel("End date").fill("2031-05-11")
  await page.getByLabel("Location").selectOption({ label: "E2E Venue, E2E City, Venezuela" })
  await page.getByLabel("E2E Org Gamma").check()
  await page.getByRole("button", { name: "Create edition" }).click()
  // A new edition continues on its edit page, where competitions can be added.
  await page.waitForURL("**/edit?notice=created")
  await expect(page.getByRole("status")).toContainText("Edition created.")
  await page.goto("/admin/event-editions")
  await hydrated(page)

  await page.getByLabel("Search editions").fill(run)
  await page.getByRole("button", { name: "Search" }).click()
  const row = page.getByRole("row", { name: new RegExp(name) })
  await expect(row).toContainText("E2E Org Alpha +2")
  await expect(row).toContainText("2031-05-10 → 2031-05-11")

  // Edit: dates round-trip unchanged, then make Gamma the primary and drop Alpha.
  await row.getByRole("link", { name: "Edit", exact: true }).click()
  await expect(selectedOption("primaryOrganizerId")).toHaveText("E2E Org Alpha")
  await hydrated(page)
  await expect(page.getByLabel("Start date")).toHaveValue("2031-05-10")
  await page.getByLabel("Primary organizer").selectOption({ label: "E2E Org Gamma" })
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("status")).toHaveText("Edition updated.")
  await page.getByLabel("Search editions").fill(run)
  await page.getByRole("button", { name: "Search" }).click()
  await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText("E2E Org Gamma +1")

  // The series template is untouched by edition edits.
  await page.goto("/admin/event-editions/new")
  await hydrated(page)
  await page.getByLabel("Series").selectOption({ label: "E2E Template Series" })
  await expect(selectedOption("primaryOrganizerId")).toHaveText("E2E Org Alpha")

  // A second edition in the same year must be distinguishable by label.
  await page.getByLabel("Edition name").fill(secondName)
  await page.getByLabel("Year").fill("2031")
  await page.getByRole("button", { name: "Create edition" }).click()
  await expect(page.getByRole("alert").filter({ hasText: "Add a label" })).toBeVisible()
  await page.getByLabel("Label").fill("II")
  await page.getByRole("button", { name: "Create edition" }).click()
  await page.waitForURL("**/edit?notice=created")
  await page.goto("/admin/event-editions")
  await hydrated(page)

  for (const editionName of [name, secondName]) {
    await page.getByLabel("Search editions").fill(run)
    await page.getByRole("button", { name: "Search" }).click()
    await page.waitForURL(/q=/)
    await hydrated(page)
    await page.getByRole("button", { name: `Delete ${editionName}` }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
    await expect(page.getByRole("status")).toHaveText("Edition deleted.")
  }
})

test("competition: validation, Trail Running metadata, edit, delete", async ({ page }) => {
  const name = `${run} Trail 21K`
  await page.goto("/admin/competitions/new")
  await hydrated(page)
  await page.getByRole("button", { name: "Create competition" }).click()
  await expect(page.getByText("Select an edition.")).toBeVisible()
  await expect(page.getByText("Select a discipline.")).toBeVisible()
  await expect(page.getByText("Name is required.")).toBeVisible()

  await page.getByLabel("Edition").selectOption({ label: "E2E Fixture Edition (2032)" })
  await expect(page.getByText("Edition dates: 2032-06-10 → 2032-06-12")).toBeVisible()
  await expect(page.getByText("Trail running details")).toBeHidden()
  await page.getByLabel("Discipline").selectOption({ label: "E2E Sport · E2E Trail Running" })
  await expect(page.getByText("Trail running details")).toBeVisible()
  await page.getByRole("textbox", { name: "Name" }).fill(name)

  // Invalid metadata and an own start date outside the edition are reported together.
  await page.getByLabel("Distance (km)").fill("far")
  await page.getByLabel("Start date").fill("2032-06-20")
  await page.getByRole("button", { name: "Create competition" }).click()
  await expect(page.getByText("Enter a number.")).toBeVisible()
  await expect(page.getByText("The start date must fall within the edition dates.")).toBeVisible()

  await page.getByLabel("Distance (km)").fill("21,5")
  await page.getByLabel("Elevation gain (m)").fill("1200")
  await page.getByLabel("Difficulty").selectOption({ label: "Advanced" })
  await page.getByLabel("Terrain types").fill("mountain, rocky")
  await page.getByLabel("Start date").fill("2032-06-11")
  await page.getByRole("button", { name: "Create competition" }).click()
  await expect(page.getByRole("status")).toHaveText("Competition created.")

  await page.getByLabel("Search competitions").fill(run)
  await page.getByRole("button", { name: "Search" }).click()
  await page.waitForURL(/q=/)
  await hydrated(page)
  const row = page.getByRole("row", { name: new RegExp(name) })
  await expect(row).toContainText("2032-06-11")
  await expect(row).toContainText("E2E Venue, E2E City") // location inherited from the edition
  await row.getByRole("link", { name: "Edit", exact: true }).click()
  await page.waitForURL("**/edit")
  await hydrated(page)

  // Edit: metadata round-trips, the edition is fixed, an unrelated edit keeps the metadata.
  await expect(page.getByLabel("Distance (km)")).toHaveValue("21.5")
  await expect(page.getByLabel("Difficulty")).toHaveValue("advanced")
  await expect(page.getByLabel("Edition")).toHaveCount(0)
  await page.getByLabel("Description").fill("Edited")
  await page.getByLabel("Participation").selectOption({ label: "Recreational" })
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("status")).toHaveText("Competition updated.")

  await page.getByLabel("Search competitions").fill(run)
  await page.getByRole("button", { name: "Search" }).click()
  await page.waitForURL(/q=/)
  await hydrated(page)
  await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText("recreational")
  await page.getByRole("row", { name: new RegExp(name) }).getByRole("link", { name: "Edit", exact: true }).click()
  await page.waitForURL("**/edit")
  await hydrated(page)
  await expect(page.getByLabel("Distance (km)")).toHaveValue("21.5")
  await page.getByRole("link", { name: "Cancel" }).click()

  await page.getByLabel("Search competitions").fill(run)
  await page.getByRole("button", { name: "Search" }).click()
  await page.waitForURL(/q=/)
  await hydrated(page)
  await page.getByRole("button", { name: `Delete ${name}` }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect(page.getByRole("status")).toHaveText("Competition deleted.")

  // The distance is optional: a trail competition can be created before the course is confirmed.
  const unconfirmed = `${run} Trail TBD`
  await page.goto("/admin/competitions/new")
  await hydrated(page)
  await page.getByLabel("Edition").selectOption({ label: "E2E Fixture Edition (2032)" })
  await page.getByLabel("Discipline").selectOption({ label: "E2E Sport · E2E Trail Running" })
  await page.getByRole("textbox", { name: "Name" }).fill(unconfirmed)
  await page.getByRole("button", { name: "Create competition" }).click()
  await expect(page.getByRole("status")).toHaveText("Competition created.")
  await page.getByLabel("Search competitions").fill(run)
  await page.getByRole("button", { name: "Search" }).click()
  await page.waitForURL(/q=/)
  await hydrated(page)
  await page.getByRole("button", { name: `Delete ${unconfirmed}` }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect(page.getByRole("status")).toHaveText("Competition deleted.")
})

test("edition workflow: time zone, competitions added from the edition page, edit, delete", async ({ page }) => {
  const editionName = `${run} Workflow`
  const dialog = page.getByRole("dialog")
  const addCompetition = async (name: string, startsOn: string) => {
    await page.getByRole("button", { name: "Add competition" }).click()
    await expect(dialog.getByText("Workflow", { exact: false }).first()).toBeVisible() // the edition is fixed, not chosen
    await expect(dialog.getByLabel("Edition")).toHaveCount(0)
    await dialog.getByLabel("Discipline").selectOption({ label: "E2E Sport · E2E Trail Running" })
    await dialog.getByRole("textbox", { name: "Name" }).fill(name)
    await dialog.getByLabel("Distance (km)").fill("10")
    await dialog.getByLabel("Start date").fill(startsOn)
    await dialog.getByRole("button", { name: "Create competition" }).click()
    await expect(dialog).toBeHidden()
  }

  await page.goto("/admin/event-editions/new")
  await hydrated(page)
  await page.getByLabel("Series").selectOption({ label: "E2E Template Series" })

  // The name is suggested from the series; once typed by hand, a series change no longer overwrites it.
  await expect(page.getByLabel("Edition name")).toHaveValue("E2E Template Series")
  await page.getByLabel("Edition name").fill(editionName)
  await page.getByLabel("Series").selectOption({ label: "Select…" })
  await page.getByLabel("Series").selectOption({ label: "E2E Template Series" })
  await expect(page.getByLabel("Edition name")).toHaveValue(editionName)

  // Helper text is tied to its field, so screen readers announce it with the input.
  await expect(page.getByLabel("Edition year")).toHaveAccessibleDescription(/does not have to match/)
  await expect(page.getByLabel("Label")).toHaveAccessibleDescription(/8th edition/)
  await expect(page.getByLabel("Originally scheduled for")).toHaveAccessibleDescription(/first announced/)
  await expect(page.getByLabel("Registration status")).toHaveAccessibleDescription(/does not require a URL/)
  await page.getByLabel("Edition year").fill("2033")
  await page.getByLabel("Start date").fill("2033-07-01")
  await page.getByLabel("End date").fill("2033-07-03")

  // New editions start in Venezuela's zone; the selector is searchable and keeps the IANA identifier.
  await expect(page.getByRole("combobox", { name: "Time zone", exact: true })).toContainText("America/Caracas")
  await pickSearchable(page, "Time zone", "bogota", /America\/Bogota/)
  await expect(page.getByRole("combobox", { name: "Time zone", exact: true })).toContainText("America/Bogota")
  await page.getByRole("button", { name: "Create edition" }).click()

  // The edition is saved first, then its management page opens with an empty Competitions section.
  await page.waitForURL("**/edit?notice=created")
  await hydrated(page)
  await expect(page.getByRole("status")).toContainText("Edition created.")
  await expect(page.getByText("No competitions in this edition yet.")).toBeVisible()
  await expect(page.getByRole("combobox", { name: "Time zone", exact: true })).toContainText("America/Bogota")

  await addCompetition(`${run} 10K`, "2033-07-02")
  await addCompetition(`${run} 5K`, "2033-07-03")
  const section = page.getByRole("region", { name: "Competitions" })
  await expect(section.getByRole("listitem")).toHaveCount(2)

  // Validation comes from the shared Competition rules: a date outside the edition is rejected in the dialog.
  await page.getByRole("button", { name: "Edit " + `${run} 5K` }).click()
  await dialog.getByLabel("Start date").fill("2033-08-20")
  await dialog.getByRole("button", { name: "Save changes" }).click()
  await expect(dialog.getByText("The start date must fall within the edition dates.")).toBeVisible()
  await dialog.getByLabel("Start date").fill("2033-07-01")
  await dialog.getByLabel("Distance (km)").fill("5")
  await dialog.getByRole("button", { name: "Save changes" }).click()
  await expect(dialog).toBeHidden()

  const editionPageUrl = page.url()

  // After a reload both competitions are still attached to this edition, with the edit applied.
  await page.reload()
  await hydrated(page)
  const fiveK = section.getByRole("listitem").filter({ hasText: `${run} 5K` })
  await expect(section.getByRole("listitem")).toHaveCount(2)
  await expect(fiveK).toContainText("5 km")
  await expect(fiveK).toContainText("2033-07-01")
  await expect(section.getByRole("listitem").filter({ hasText: `${run} 10K` })).toContainText("10 km")

  // The standalone Competitions admin sees the same rows.
  await page.goto("/admin/competitions")
  await page.getByLabel("Search competitions").fill(`${run} 10K`)
  await page.getByRole("button", { name: "Search" }).click()
  await page.waitForURL(/q=/)
  await expect(page.getByRole("row", { name: new RegExp(`${run} 10K`) })).toContainText(editionName)

  // Delete from the edition page without leaving it.
  await page.goto(editionPageUrl)
  await hydrated(page)
  await page.getByRole("button", { name: `Delete ${run} 10K` }).click()
  await dialog.getByRole("button", { name: "Delete" }).click()
  await expect(section.getByRole("listitem")).toHaveCount(1)
  await expect(page).toHaveURL(/\/edit/)
})
test("edition photographers: search, add independent and official, persist, edit, remove", async ({ page }) => {
  const dialog = page.getByRole("dialog")
  await page.goto("/admin/event-editions")
  await hydrated(page)
  await page.getByLabel("Search editions").fill("E2E Photographers Edition")
  await page.getByRole("button", { name: "Search" }).click()
  await page.waitForURL(/q=/)
  await page.getByRole("row", { name: /E2E Photographers Edition/ }).getByRole("link", { name: "Edit" }).click()
  await page.waitForURL(/\/edit/)
  await hydrated(page)

  const section = page.getByRole("region", { name: "Photographers" })
  await expect(section.getByText("No photographers in this edition yet.")).toBeVisible()

  // Search by Instagram finds exactly one candidate; the help explains the accreditation values.
  await section.getByRole("button", { name: "Add photographer" }).click()
  await dialog.getByLabel("Search photographers").fill("@e2e.lens")
  await expect(dialog.getByRole("radio")).toHaveCount(1)
  await dialog.getByRole("radio", { name: /E2E Lens Alpha/ }).check()
  await expect(dialog.getByLabel("Participation")).toHaveAccessibleDescription(/not as an official photographer/)
  await dialog.getByLabel("Participation").selectOption({ label: "Independent" })
  await dialog.getByRole("button", { name: "Add E2E Lens Alpha" }).click()
  await expect(dialog).toBeHidden()
  await expect(section.getByRole("listitem")).toHaveCount(1)

  // A photographer without Instagram is found by name; the first one is already taken.
  await section.getByRole("button", { name: "Add photographer" }).click()
  await dialog.getByLabel("Search photographers").fill("E2E Lens")
  await expect(dialog.getByRole("radio")).toHaveCount(2)
  await expect(dialog.getByRole("radio", { name: /E2E Lens Alpha/ })).toBeDisabled()
  await expect(dialog.getByText("Already in this edition")).toBeVisible()
  await dialog.getByRole("radio", { name: /E2E Lens Beta/ }).check()
  await dialog.getByLabel("Participation").selectOption({ label: "Official" })
  await dialog.getByRole("button", { name: "Add E2E Lens Beta" }).click()
  await expect(dialog).toBeHidden()

  // Both assignments persist across a reload.
  await page.reload()
  await hydrated(page)
  const alpha = section.getByRole("listitem").filter({ hasText: "E2E Lens Alpha" })
  const beta = section.getByRole("listitem").filter({ hasText: "E2E Lens Beta" })
  await expect(section.getByRole("listitem")).toHaveCount(2)
  await expect(alpha).toContainText("@e2e.lens.alpha")
  await expect(alpha).toContainText("Independent")
  await expect(beta).toContainText("No Instagram")
  await expect(beta).toContainText("Official")

  // Editing changes accreditation and note only.
  await page.getByRole("button", { name: "Edit E2E Lens Alpha" }).click()
  await dialog.getByLabel("Participation").selectOption({ label: "Official" })
  await dialog.getByLabel("Note (optional)").fill("Finish line")
  await dialog.getByRole("button", { name: "Save changes" }).click()
  await expect(dialog).toBeHidden()
  await expect(alpha).toContainText("Finish line")
  await expect(alpha).toContainText("Official")

  // Removing one photographer keeps the other and keeps the removed profile.
  await page.getByRole("button", { name: "Remove E2E Lens Beta from this edition" }).click()
  await expect(dialog).toContainText("Their profile")
  await dialog.getByRole("button", { name: "Remove" }).click()
  await expect(section.getByRole("listitem")).toHaveCount(1)
  await expect(section.getByRole("listitem")).toContainText("E2E Lens Alpha")
  await page.reload()
  await hydrated(page)
  await expect(section.getByRole("listitem")).toHaveCount(1)

  // On a phone-sized screen the section and its dialog stay inside the viewport.
  await page.setViewportSize({ width: 375, height: 700 })
  await section.getByRole("button", { name: "Add photographer" }).click()
  await dialog.getByLabel("Search photographers").fill("E2E Lens")
  await expect(dialog.getByRole("radio")).toHaveCount(2)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  const box = await dialog.boundingBox()
  expect(box && box.x >= 0 && box.x + box.width <= 375).toBe(true)
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()

  await page.goto("/admin/photographers?q=E2E+Lens+Beta")
  await expect(page.getByRole("row", { name: /E2E Lens Beta/ })).toBeVisible()
})
})
