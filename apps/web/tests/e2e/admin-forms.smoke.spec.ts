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
  for (const path of ["/admin", "/admin/organizers", "/admin/locations/new", "/admin/event-series", "/admin/event-series/new"]) {
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
  await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText("E2E Org Beta +1")

  await page.getByRole("button", { name: `Delete ${name}` }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect(page.getByRole("status")).toHaveText("Series deleted.")
})
})
