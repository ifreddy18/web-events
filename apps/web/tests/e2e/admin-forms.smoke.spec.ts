import { expect, test, type Page } from "@playwright/test"

// Smoke test of the Locations and Organizers forms. Global setup provisions a throwaway admin
// in events_test (see global-setup.ts); a missing setup fails the run instead of skipping.
const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD
if (!email || !password) throw new Error("E2E admin credentials missing: global setup did not run.")

// Interactions before hydration would fall back to native form submits / dead buttons.
const hydrated = (page: Page) => page.waitForLoadState("networkidle")

const run = `itest-e2e-${Date.now()}`

test("unauthenticated visitors are redirected to login", async ({ page }) => {
  for (const path of ["/admin", "/admin/organizers", "/admin/locations/new", "/admin/event-series", "/admin/event-series/new", "/admin/event-editions", "/admin/event-editions/new", "/admin/competitions", "/admin/competitions/new"]) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/login/)
  }
})

test.describe("signed in", () => {
test.beforeEach(async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL("**/admin")
})

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
  await page.getByRole("link", { name: "Edit" }).click()
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

test("location: validation, create, delete", async ({ page }) => {
  await page.goto("/admin/locations/new")
  await hydrated(page)
  await page.getByRole("button", { name: "Create location" }).click()
  await expect(page.getByText("Country is required.")).toBeVisible()

  await page.getByLabel("Country").fill("Venezuela")
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
  await row.getByRole("link", { name: "Edit" }).click()
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
  await expect(page.getByRole("status")).toHaveText("Edition created.")

  await page.getByLabel("Search editions").fill(run)
  await page.getByRole("button", { name: "Search" }).click()
  const row = page.getByRole("row", { name: new RegExp(name) })
  await expect(row).toContainText("E2E Org Alpha +2")
  await expect(row).toContainText("2031-05-10 → 2031-05-11")

  // Edit: dates round-trip unchanged, then make Gamma the primary and drop Alpha.
  await row.getByRole("link", { name: "Edit" }).click()
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
  await expect(page.getByRole("status")).toHaveText("Edition created.")

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
  await row.getByRole("link", { name: "Edit" }).click()
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
  await page.getByRole("row", { name: new RegExp(name) }).getByRole("link", { name: "Edit" }).click()
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
})
