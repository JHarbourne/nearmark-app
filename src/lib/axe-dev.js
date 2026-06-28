// Dev-only accessibility checks. Runs axe-core against the live DOM and logs WCAG
// violations to the console. The axe-core import lives inside `if (import.meta.env.DEV)`
// so that, in production, Vite replaces DEV with `false` and the whole block — import
// and all — is dead-code-eliminated (axe-core is never shipped to users).
//
// Re-run any time from the console with `__axe()`.

export function initAxe() {
  if (import.meta.env.DEV) {
    import('axe-core').then(({ default: axe }) => {
      const run = async () => {
        const { violations } = await axe.run(document, {
          resultTypes: ['violations'],
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        })
        if (!violations.length) {
          console.log('%c♿ axe: no WCAG 2.1 AA violations', 'color:#1f9d57;font-weight:bold')
          return
        }
        console.groupCollapsed(`%c♿ axe: ${violations.length} accessibility issue(s)`, 'color:#d23048;font-weight:bold')
        violations.forEach((v) => console.log(`[${v.impact}] ${v.id} — ${v.help}: ${v.nodes.length} node(s)`, v.helpUrl))
        console.groupEnd()
      }
      window.__axe = run
      setTimeout(run, 1500)
    })
  }
}
