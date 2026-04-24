import { useCallback, useRef, useState } from 'react'
import { SCENARIOS, type Scenario } from '../../data/about-scenarios'

/* ============================================================
   ScenarioMatcher — the /about interactive.

   Eight chips. Each click:
     1. Sets .active on the clicked chip; clears it from others.
     2. Clears .highlighted from every .ab-bio-body p.
     3. Scrolls the first target paragraph into view
        (smooth, block: 'center').
     4. After 400ms adds .highlighted to every target paragraph.
     5. Renders a pointer line below the chip tray with either
        a partnership message (Both chips) or "-> {partner}'s
        bio" (single-partner chips).

   The CSS transition on .ab-bio-body p { transition: background
   0.4s ease } provides the fade-in. The 400ms JS delay keeps the
   fade from starting mid-scroll so the visitor's eye lands on
   the target paragraph before it blooms.

   prefers-reduced-motion: skip the smooth scroll and the 400ms
   delay; jump to the target and apply .highlighted immediately.

   Why not plain <a href="#george-p1">: the anchor jump
   highlights nothing (no .highlighted toggle) and loses the
   fade-in, which is the whole affordance that tells a visitor
   "this chip just pointed at THAT paragraph." The island is
   doing real work.
   ============================================================ */

const SCROLL_TO_HIGHLIGHT_DELAY_MS = 400

function pointerTextFor(scenario: Scenario): string {
  if (scenario.pointerMessage) return scenario.pointerMessage
  return `-> ${scenario.partner}'s bio`
}

export default function ScenarioMatcher() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pointerText, setPointerText] = useState<string>('')
  const [pointerVisible, setPointerVisible] = useState(false)
  const highlightTimer = useRef<number | null>(null)

  const handleChipClick = useCallback((scenario: Scenario) => {
    // Respect motion-sensitivity: skip smooth scroll + highlight delay.
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    setActiveId(scenario.id)
    setPointerText(pointerTextFor(scenario))
    setPointerVisible(true)

    // Clear any pending highlight from a prior click.
    if (highlightTimer.current !== null) {
      window.clearTimeout(highlightTimer.current)
      highlightTimer.current = null
    }

    // Clear existing highlights across every bio paragraph on the page.
    document
      .querySelectorAll<HTMLElement>('.ab-bio-body p')
      .forEach((p) => p.classList.remove('highlighted'))

    const targetEls = scenario.targets
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (targetEls.length === 0) return

    targetEls[0].scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
    })

    const applyHighlights = () => {
      targetEls.forEach((el) => el.classList.add('highlighted'))
    }

    if (prefersReducedMotion) {
      applyHighlights()
    } else {
      highlightTimer.current = window.setTimeout(() => {
        applyHighlights()
        highlightTimer.current = null
      }, SCROLL_TO_HIGHLIGHT_DELAY_MS)
    }
  }, [])

  return (
    <>
      <p className="ab-matcher-title">
        Select a scenario to see which partner has led this exact work:
      </p>
      <div className="ab-matcher-chips" role="group" aria-label="Scenario matcher">
        {SCENARIOS.map((scenario) => {
          const isActive = activeId === scenario.id
          return (
            <button
              key={scenario.id}
              type="button"
              className={`ab-chip${isActive ? ' active' : ''}`}
              data-target={scenario.id}
              data-partner={scenario.partner}
              aria-pressed={isActive}
              onClick={() => handleChipClick(scenario)}
            >
              {scenario.label}
            </button>
          )
        })}
      </div>
      <p
        className={`ab-matcher-pointer${pointerVisible ? ' visible' : ''}`}
        aria-live="polite"
      >
        {pointerText}
      </p>
    </>
  )
}
