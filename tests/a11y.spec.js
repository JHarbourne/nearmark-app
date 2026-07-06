import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Scan for WCAG 2.0/2.1 A + AA issues. The gate fails on serious/critical
// violations (the ones that actually block users); moderate/minor are reported
// by the scheduled github/accessibility-scanner run against the live sites.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function scan(page, exclude = []) {
  let builder = new AxeBuilder({ page }).withTags(TAGS)
  // Leaflet/OSM is a third-party map; we don't gate the build on its tiles.
  for (const sel of ['.leaflet-container', ...exclude]) builder = builder.exclude(sel)
  const { violations } = await builder.analyze()
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
}

const report = (violations) =>
  violations.map((v) => `• ${v.id} (${v.impact}) ×${v.nodes.length} — ${v.help}`).join('\n')

test.describe('Accessibility — public app', () => {
  test('cover / onboarding screen', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /not now/i }).waitFor()
    const violations = await scan(page)
    expect(violations, `\n${report(violations)}`).toEqual([])
  })

  test('main shell (mode picker)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /not now/i }).click()
    await page.getByText(/guided|discovery/i).first().waitFor()
    const violations = await scan(page)
    expect(violations, `\n${report(violations)}`).toEqual([])
  })

  test('story card', async ({ page }) => {
    await page.goto('/?story=church')
    await expect(page.getByRole('dialog')).toBeVisible()
    const violations = await scan(page)
    expect(violations, `\n${report(violations)}`).toEqual([])
  })

  test('tour detail', async ({ page }) => {
    await page.goto('/?tour=old-town-walk')
    await page.getByRole('heading').first().waitFor()
    const violations = await scan(page)
    expect(violations, `\n${report(violations)}`).toEqual([])
  })
})

// The admin is login-gated in production, but the seed build (no Supabase) opens
// it read-only as a demo, so we can scan its screens too.
test.describe('Accessibility — admin backoffice', () => {
  test('dashboard', async ({ page }) => {
    await page.goto('/admin.html')
    await page.getByRole('heading', { name: 'Dashboard' }).waitFor()
    const violations = await scan(page)
    expect(violations, `\n${report(violations)}`).toEqual([])
  })

  test('locations list', async ({ page }) => {
    await page.goto('/admin.html')
    await page.getByRole('button', { name: 'Locations', exact: true }).click()
    await page.getByRole('heading', { name: 'Locations' }).waitFor()
    const violations = await scan(page)
    expect(violations, `\n${report(violations)}`).toEqual([])
  })

  test('location editor', async ({ page }) => {
    await page.goto('/admin.html')
    await page.getByRole('button', { name: /add location/i }).first().click()
    await page.locator('#loc-title').waitFor()
    const violations = await scan(page)
    expect(violations, `\n${report(violations)}`).toEqual([])
  })

  test('tours list', async ({ page }) => {
    await page.goto('/admin.html')
    await page.getByRole('button', { name: 'Tours', exact: true }).click()
    await page.getByRole('heading', { name: 'Tours' }).waitFor()
    const violations = await scan(page)
    expect(violations, `\n${report(violations)}`).toEqual([])
  })

  test('media library', async ({ page }) => {
    await page.goto('/admin.html')
    await page.getByRole('button', { name: 'Media library', exact: true }).click()
    await page.getByRole('heading', { name: /media/i }).waitFor()
    const violations = await scan(page)
    expect(violations, `\n${report(violations)}`).toEqual([])
  })
})
