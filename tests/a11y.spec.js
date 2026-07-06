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
