import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'baxterlabs_positioning_matrix_v1'
const AUTO_ROTATE_MS = 7000

type MatrixKey = 'A' | 'B'

type Player = {
  id: 'bl' | 'big4' | 'fcfo' | 'sq'
  name: string
  sub: string
  quad: string
  x: number
  y: number
  labelPos: 'l' | 'r'
}

type CompareCell = {
  who: string
  big: string
  sub: string
  isBL?: boolean
}

type MatrixData = {
  matrixLabel: string
  title: string
  yAxis: string
  yTop: string
  yBot: string
  xAxis: string
  xLeft: string
  xRight: string
  winnerSub: string
  players: Player[]
  compare: CompareCell[]
}

const MATRICES: Record<MatrixKey, MatrixData> = {
  A: {
    matrixLabel: 'Matrix A',
    title: 'Depth of Analysis \u00D7 Speed of Delivery',
    yAxis: 'Depth of Analysis',
    yTop: 'High',
    yBot: 'Low',
    xAxis: 'Speed of Delivery',
    xLeft: 'Slow',
    xRight: 'Fast',
    winnerSub:
      'High depth, fast delivery. The 8-phase pipeline produces what traditional firms take 90 days to build \u2014 delivered in 14.',
    players: [
      { id: 'bl', name: 'BaxterLabs Advisory', sub: '14 days \u00B7 $12,500 \u00B7 Two partners', quad: 'Upper-Right', x: 86, y: 86, labelPos: 'l' },
      { id: 'big4', name: 'Big 4 Consulting', sub: 'Deloitte, PwC, EY, KPMG', quad: 'Upper-Left', x: 20, y: 78, labelPos: 'r' },
      { id: 'fcfo', name: 'Fractional CFO', sub: '$3K\u2013$8K / month, embedded', quad: 'Lower-Right', x: 78, y: 22, labelPos: 'l' },
      { id: 'sq', name: 'Status Quo', sub: 'Instinct \u00B7 monthly P&L only', quad: 'Lower-Left', x: 8, y: 8, labelPos: 'r' },
    ],
    compare: [
      { who: 'BaxterLabs', big: '14 days', sub: 'Fixed window', isBL: true },
      { who: 'Big 4', big: '3\u20136 mo', sub: 'Committee-driven' },
      { who: 'BaxterLabs', big: '$12,500', sub: 'Fixed fee', isBL: true },
      { who: 'Big 4', big: '$150K\u2013$500K', sub: 'Enterprise pricing' },
    ],
  },
  B: {
    matrixLabel: 'Matrix B',
    title: 'Enterprise Rigor \u00D7 Accessibility',
    yAxis: 'Enterprise Rigor',
    yTop: 'High',
    yBot: 'Low',
    xAxis: 'Accessibility / Price',
    xLeft: 'Expensive',
    xRight: 'Accessible',
    winnerSub:
      'Audit-grade artifacts at a price a managing partner can approve without a board vote. The quadrant neither Big 4 nor a Fractional CFO can occupy.',
    players: [
      { id: 'bl', name: 'BaxterLabs Advisory', sub: 'Audit-grade \u00B7 one-time $12,500', quad: 'Upper-Right', x: 88, y: 86, labelPos: 'l' },
      { id: 'big4', name: 'Big 4 Consulting', sub: 'Institutional rigor, enterprise fee', quad: 'Upper-Left', x: 15, y: 80, labelPos: 'r' },
      { id: 'fcfo', name: 'Fractional CFO', sub: 'Ongoing advisory \u00B7 monthly retainer', quad: 'Lower-Right', x: 72, y: 22, labelPos: 'l' },
      { id: 'sq', name: 'Status Quo', sub: 'No methodology \u00B7 no direct spend', quad: 'At Origin', x: 50, y: 50, labelPos: 'r' },
    ],
    compare: [
      { who: 'BaxterLabs', big: '$12,500', sub: 'Discretionary budget', isBL: true },
      { who: 'Big 4', big: '0.6\u20132%', sub: 'Of firm revenue' },
      { who: 'BaxterLabs', big: 'Audit-grade', sub: 'Citation provenance', isBL: true },
      { who: 'Fractional CFO', big: 'Operational', sub: 'Not forensic' },
    ],
  },
}

export default function PositioningMap() {
  const [activeMatrix, setActiveMatrix] = useState<MatrixKey>(() => {
    if (typeof window === 'undefined') return 'A'
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'B' ? 'B' : 'A'
  })
  const [userInteracted, setUserInteracted] = useState<boolean>(false)
  const [isVisible, setIsVisible] = useState(true)
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const node = sectionRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => setIsVisible(entries[0]?.isIntersecting ?? true),
      { threshold: 0.15 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (userInteracted || !isVisible) return
    const id = window.setInterval(() => {
      setActiveMatrix((prev) => (prev === 'A' ? 'B' : 'A'))
    }, AUTO_ROTATE_MS)
    return () => window.clearInterval(id)
  }, [userInteracted, isVisible])

  const selectMatrix = (key: MatrixKey) => {
    setActiveMatrix(key)
    setUserInteracted(true)
    window.localStorage.setItem(STORAGE_KEY, key)
  }

  const m = MATRICES[activeMatrix]

  return (
    <main ref={sectionRef} className="positioning-page">
      <style>{`
        .positioning-page {
          --bl-crimson: #66151C;
          --bl-teal: #005454;
          --bl-cream: #F6E7C8;
          --bl-ivory: #FAF8F2;
          --bl-white: #FFFFFF;
          --bl-charcoal: #2D3436;
          --bl-gray-warm: #6B7280;
          --bl-gray-light: #E5E7EB;
          --bl-gold: #C9A84C;
          --fg-2: rgba(45, 52, 54, 0.85);
          --font-display: 'Playfair Display', Georgia, serif;
          --font-headline: 'Newsreader', Georgia, serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-label: 'Inter', system-ui, sans-serif;
          --shadow-xl: 0 20px 25px -5px rgba(0,0,0,.10), 0 10px 10px -5px rgba(0,0,0,.04);
          --ease-out: cubic-bezier(0, 0, 0.2, 1);

          background: var(--bl-ivory);
          color: var(--bl-charcoal);
          font-family: var(--font-body);
          line-height: 1.6;
          min-height: 100vh;
          display: block;
        }
        .positioning-page *,
        .positioning-page *::before,
        .positioning-page *::after {
          box-sizing: border-box;
        }

        .positioning-page .pm-page {
          max-width: 1280px;
          margin: 0 auto;
          padding: 6rem 1.5rem 8rem;
        }
        @media (min-width: 768px) { .positioning-page .pm-page { padding: 7rem 3rem 8rem; } }
        @media (min-width: 1024px) { .positioning-page .pm-page { padding: 8rem 6rem 10rem; } }

        /* ============ SECTION HEADER ============ */
        .positioning-page .section-head {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          margin-bottom: 5rem;
          align-items: end;
        }
        @media (min-width: 900px) {
          .positioning-page .section-head { grid-template-columns: 5fr 7fr; gap: 4rem; }
        }
        .positioning-page .eyebrow-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .positioning-page .eyebrow-rule { height: 1px; background: var(--bl-gold); flex: 0 0 2.5rem; }
        .positioning-page .eyebrow-txt {
          font-family: var(--font-label);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--bl-teal);
        }
        .positioning-page h1.display {
          font-family: var(--font-display);
          font-style: italic;
          font-weight: 700;
          font-size: clamp(2.4rem, 4vw + 0.5rem, 4rem);
          line-height: 1.02;
          letter-spacing: -0.015em;
          color: var(--bl-crimson);
          margin: 0;
        }
        .positioning-page h1.display .roman { font-style: normal; }
        .positioning-page .deck-line {
          font-family: var(--font-headline);
          font-size: 1.1rem;
          line-height: 1.7;
          color: var(--fg-2);
          max-width: 38rem;
          margin: 0;
        }
        .positioning-page .deck-line em { color: var(--bl-teal); font-style: italic; }

        /* ============ META STRIP ============ */
        .positioning-page .meta-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 2rem 3rem;
          padding: 1.25rem 0;
          margin-bottom: 3rem;
          border-top: 1px solid var(--bl-gray-light);
          border-bottom: 1px solid var(--bl-gray-light);
        }
        .positioning-page .meta-item { display: flex; flex-direction: column; gap: 0.3rem; }
        .positioning-page .meta-label {
          font-family: var(--font-label);
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--bl-gray-warm);
        }
        .positioning-page .meta-value {
          font-family: var(--font-body);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--bl-charcoal);
        }
        .positioning-page .meta-value.crimson {
          color: var(--bl-crimson);
          font-family: var(--font-display);
          font-style: italic;
          font-weight: 700;
          font-size: 1rem;
        }

        /* ============ MATRIX TABS ============ */
        .positioning-page .matrix-tabs {
          display: inline-flex;
          gap: 0;
          margin-bottom: 2.5rem;
          border: 1px solid var(--bl-gray-light);
          background: var(--bl-white);
        }
        .positioning-page .matrix-tab {
          padding: 0.75rem 1.5rem;
          font-family: var(--font-label);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--bl-gray-warm);
          background: transparent;
          border: none;
          border-right: 1px solid var(--bl-gray-light);
          cursor: pointer;
          transition: all 300ms var(--ease-out);
        }
        .positioning-page .matrix-tab:last-child { border-right: none; }
        .positioning-page .matrix-tab.active {
          background: var(--bl-teal);
          color: var(--bl-white);
        }
        .positioning-page .matrix-tab:not(.active):hover {
          color: var(--bl-teal);
          background: var(--bl-cream);
        }

        /* ============ MATRIX LAYOUT ============ */
        .positioning-page .matrix-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3rem;
        }
        @media (min-width: 1000px) {
          .positioning-page .matrix-layout { grid-template-columns: 7fr 5fr; gap: 4rem; }
        }

        /* ============ CHART CARD ============ */
        .positioning-page .chart-card {
          background: var(--bl-white);
          padding: 2.5rem 2.5rem 2rem;
          position: relative;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--bl-gray-light);
        }
        .positioning-page .chart-title-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 2rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--bl-gray-light);
          gap: 1rem;
        }
        .positioning-page .chart-matrix-label {
          font-family: var(--font-label);
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--bl-gold);
        }
        .positioning-page .chart-title {
          font-family: var(--font-display);
          font-weight: 700;
          font-style: italic;
          font-size: 1.35rem;
          color: var(--bl-crimson);
          line-height: 1.2;
          margin: 0.3rem 0 0;
        }
        .positioning-page .chart-n {
          font-family: var(--font-label);
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--bl-gray-warm);
          text-align: right;
          white-space: nowrap;
        }
        .positioning-page .chart-n .fade { opacity: 0.6; margin-top: 2px; }

        .positioning-page .chart-box {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 1rem;
        }
        .positioning-page .y-axis {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          min-height: 500px;
        }
        .positioning-page .y-label-top,
        .positioning-page .y-label-bot {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-family: var(--font-label);
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--bl-gold);
          white-space: nowrap;
        }
        .positioning-page .y-axis-title {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-family: var(--font-headline);
          font-style: italic;
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--bl-teal);
          letter-spacing: 0.02em;
        }

        .positioning-page .plot-wrap {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .positioning-page .plot {
          position: relative;
          aspect-ratio: 1 / 1;
          width: 100%;
          background: var(--bl-ivory);
          border: 1px solid var(--bl-gray-light);
          overflow: hidden;
        }
        .positioning-page .plot-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(to right, rgba(107, 114, 128, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(107, 114, 128, 0.08) 1px, transparent 1px);
          background-size: 10% 10%;
        }
        .positioning-page .quadrant-hl {
          position: absolute;
          top: 0; right: 0;
          width: 50%; height: 50%;
          background: linear-gradient(135deg, rgba(201, 168, 76, 0.14), rgba(201, 168, 76, 0.04));
          border-left: 1px dashed rgba(201, 168, 76, 0.5);
          border-bottom: 1px dashed rgba(201, 168, 76, 0.5);
          pointer-events: none;
        }
        .positioning-page .quadrant-hl::after {
          content: '';
          position: absolute; top: 0; right: 0;
          width: 0; height: 0;
          border-style: solid;
          border-width: 0 28px 28px 0;
          border-color: transparent var(--bl-gold) transparent transparent;
          opacity: 0.85;
        }
        .positioning-page .q-label {
          position: absolute;
          font-family: var(--font-label);
          font-size: 0.56rem;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--bl-gray-warm);
          opacity: 0.7;
          pointer-events: none;
        }
        .positioning-page .q-tl { top: 0.75rem; left: 0.75rem; }
        .positioning-page .q-tr { top: 0.75rem; right: 0.75rem; color: var(--bl-gold); opacity: 1; }
        .positioning-page .q-bl { bottom: 0.75rem; left: 0.75rem; }
        .positioning-page .q-br { bottom: 0.75rem; right: 0.75rem; }

        .positioning-page .plot-mid-x,
        .positioning-page .plot-mid-y {
          position: absolute;
          background: rgba(45, 52, 54, 0.2);
          pointer-events: none;
        }
        .positioning-page .plot-mid-x { left: 0; right: 0; top: 50%; height: 1px; }
        .positioning-page .plot-mid-y { top: 0; bottom: 0; left: 50%; width: 1px; }

        /* ============ DOTS ============ */
        .positioning-page .dot {
          position: absolute;
          transform: translate(-50%, 50%);
          animation: pm-fade-in 0.4s var(--ease-out);
        }
        .positioning-page .dot-node {
          width: 14px; height: 14px;
          border-radius: 50%;
          background: var(--bl-gray-warm);
          box-shadow: 0 0 0 4px rgba(107,114,128,0.15);
          position: relative;
          z-index: 2;
        }
        .positioning-page .dot.is-bl .dot-node {
          background: var(--bl-teal);
          box-shadow: 0 0 0 5px rgba(0, 84, 84, 0.14), 0 0 0 10px rgba(0, 84, 84, 0.06);
          width: 18px; height: 18px;
        }
        .positioning-page .dot.is-bl .dot-node::after {
          content: '';
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          background: var(--bl-cream);
        }
        @media (prefers-reduced-motion: no-preference) {
          .positioning-page .dot.is-bl::before {
            content: '';
            position: absolute;
            left: 50%; top: 50%;
            width: 38px; height: 38px;
            border-radius: 50%;
            border: 1px solid var(--bl-teal);
            transform: translate(-50%, -50%);
            opacity: 0.25;
            animation: pm-halo 2.8s ease-out infinite;
            pointer-events: none;
          }
        }
        @keyframes pm-halo {
          0%   { transform: translate(-50%, -50%) scale(0.6); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
        }
        @keyframes pm-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .positioning-page .dot-label {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          font-family: var(--font-body);
          font-weight: 600;
          font-size: 0.72rem;
          color: var(--bl-charcoal);
          white-space: nowrap;
          background: var(--bl-white);
          padding: 0.2rem 0.5rem;
          border: 1px solid var(--bl-gray-light);
          letter-spacing: 0;
        }
        .positioning-page .dot-label.anchor-r { left: 28px; }
        .positioning-page .dot-label.anchor-l { right: 28px; }
        .positioning-page .dot-label .mini {
          display: block;
          font-family: var(--font-label);
          font-size: 0.56rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--bl-gray-warm);
          margin-top: 1px;
        }
        .positioning-page .dot.is-bl .dot-label {
          background: var(--bl-teal);
          color: var(--bl-white);
          border-color: var(--bl-teal);
          font-family: var(--font-display);
          font-style: italic;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 0.3rem 0.6rem 0.35rem;
        }
        .positioning-page .dot.is-bl .dot-label .mini {
          color: rgba(255,255,255,0.7);
        }
        .positioning-page .dot-connector {
          position: absolute;
          top: 50%;
          height: 1px;
          width: 22px;
          background: rgba(45, 52, 54, 0.25);
        }
        .positioning-page .dot-connector.anchor-r { left: 9px; }
        .positioning-page .dot-connector.anchor-l { right: 9px; }

        /* ============ X AXIS ============ */
        .positioning-page .x-axis {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.25rem 0.5rem 0;
        }
        .positioning-page .x-label-left,
        .positioning-page .x-label-right {
          font-family: var(--font-label);
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--bl-gold);
        }
        .positioning-page .x-axis-title {
          font-family: var(--font-headline);
          font-style: italic;
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--bl-teal);
        }

        /* ============ SIDE COLUMN ============ */
        .positioning-page .side {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .positioning-page .winner-block {
          border-left: 2px solid var(--bl-teal);
          padding: 0.3rem 0 0.3rem 1.25rem;
        }
        .positioning-page .winner-head {
          font-family: var(--font-label);
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--bl-gray-warm);
          margin-bottom: 0.4rem;
        }
        .positioning-page .winner-title {
          font-family: var(--font-display);
          font-weight: 700;
          font-style: italic;
          font-size: 1.6rem;
          color: var(--bl-crimson);
          line-height: 1.1;
          margin-bottom: 0.4rem;
        }
        .positioning-page .winner-sub {
          font-family: var(--font-headline);
          font-size: 1rem;
          line-height: 1.55;
          color: var(--fg-2);
          margin: 0;
        }

        .positioning-page .players {
          display: flex;
          flex-direction: column;
          border-top: 1px solid var(--bl-gray-light);
        }
        .positioning-page .player-row {
          display: grid;
          grid-template-columns: 20px 1fr auto;
          gap: 0.9rem;
          align-items: center;
          padding: 0.9rem 0;
          border-bottom: 1px solid var(--bl-gray-light);
        }
        .positioning-page .player-swatch {
          width: 12px; height: 12px;
          background: var(--bl-gray-warm);
          border-radius: 50%;
          justify-self: center;
        }
        .positioning-page .player-row.is-bl .player-swatch {
          background: var(--bl-teal);
          box-shadow: 0 0 0 3px rgba(0,84,84,0.15);
        }
        .positioning-page .player-name {
          font-family: var(--font-headline);
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--bl-charcoal);
          line-height: 1.2;
        }
        .positioning-page .player-sub {
          font-family: var(--font-body);
          font-size: 0.7rem;
          color: var(--bl-gray-warm);
          font-weight: 500;
          margin-top: 2px;
          letter-spacing: 0.02em;
        }
        .positioning-page .player-quad {
          font-family: var(--font-label);
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--bl-gray-warm);
          text-align: right;
          white-space: nowrap;
        }
        .positioning-page .player-row.is-bl .player-quad { color: var(--bl-gold); }
        .positioning-page .player-row.is-bl .player-name { color: var(--bl-teal); }

        .positioning-page .compare-head {
          font-family: var(--font-label);
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--bl-gray-warm);
          margin-bottom: 0.75rem;
        }
        .positioning-page .compare-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .positioning-page .compare-cell {
          background: var(--bl-ivory);
          padding: 1rem 1.1rem;
          border-left: 2px solid var(--bl-gold);
        }
        .positioning-page .compare-cell.is-bl {
          background: var(--bl-cream);
          border-left-color: var(--bl-crimson);
        }
        .positioning-page .compare-who {
          font-family: var(--font-label);
          font-size: 0.56rem;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--bl-teal);
          margin-bottom: 0.35rem;
        }
        .positioning-page .compare-cell.is-bl .compare-who { color: var(--bl-crimson); }
        .positioning-page .compare-big {
          font-family: var(--font-display);
          font-style: italic;
          font-weight: 700;
          font-size: 1.4rem;
          line-height: 1;
          color: var(--bl-charcoal);
          margin-bottom: 0.25rem;
        }
        .positioning-page .compare-cell.is-bl .compare-big {
          color: var(--bl-crimson);
          font-style: normal;
        }
        .positioning-page .compare-small {
          font-family: var(--font-body);
          font-size: 0.7rem;
          color: var(--bl-gray-warm);
          letter-spacing: 0.05em;
        }

        /* ============ CONTEXT PARA ============ */
        .positioning-page .context-para {
          max-width: 60rem;
          margin: -1rem 0 3rem;
          font-family: var(--font-body);
          font-size: 1.0625rem;
          line-height: 1.7;
          color: var(--fg-2);
        }
      `}</style>

      <div className="pm-page">
        <header className="section-head">
          <div>
            <div className="eyebrow-row">
              <span className="eyebrow-rule" aria-hidden="true" />
              <span className="eyebrow-txt">The Competitive Landscape</span>
            </div>
            <h1 className="display">
              Where BaxterLabs <span className="roman">sits</span>
              <br />
              on the map.
            </h1>
          </div>
          <div>
            <p className="deck-line">
              Four options exist for a professional service firm that suspects its margin is
              leaking. Only one of them delivers{' '}
              <em>enterprise-grade diagnostic rigor</em> at a price a managing partner can approve
              without a board vote.
            </p>
          </div>
        </header>

        <p className="context-para">
          Firms evaluating financial advisory typically weigh four options: a Big 4 engagement, a Fractional CFO, the status quo, or a forensic diagnostic firm. Each occupies a different position on the two dimensions that matter most &mdash; methodological rigor and accessibility of price and timeline. The map below plots where each option sits, and why the upper-right quadrant has been structurally empty until now.
        </p>

        <div className="meta-strip">
          <div className="meta-item">
            <span className="meta-label">Segment</span>
            <span className="meta-value">$5M&ndash;$50M Professional Services</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Fixed Scope</span>
            <span className="meta-value crimson">14 Days &middot; $12,500</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Typical Recovery</span>
            <span className="meta-value">$200K&ndash;$700K / year</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Delivery</span>
            <span className="meta-value">Two Partners, Personally</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Methodology</span>
            <span className="meta-value">8-Phase Forensic Protocol</span>
          </div>
        </div>

        <div className="matrix-tabs" role="tablist" aria-label="Positioning matrix">
          <button
            className={`matrix-tab${activeMatrix === 'A' ? ' active' : ''}`}
            role="tab"
            aria-selected={activeMatrix === 'A'}
            aria-controls="pm-matrix-panel"
            onClick={() => selectMatrix('A')}
          >
            Matrix A &middot; Depth &times; Speed
          </button>
          <button
            className={`matrix-tab${activeMatrix === 'B' ? ' active' : ''}`}
            role="tab"
            aria-selected={activeMatrix === 'B'}
            aria-controls="pm-matrix-panel"
            onClick={() => selectMatrix('B')}
          >
            Matrix B &middot; Rigor &times; Price
          </button>
        </div>

        <div className="matrix-layout" id="pm-matrix-panel" role="tabpanel">
          <div className="chart-card">
            <div className="chart-title-row">
              <div>
                <div className="chart-matrix-label">{m.matrixLabel}</div>
                <h2 className="chart-title">{m.title}</h2>
              </div>
              <div className="chart-n">
                <div>4 Players</div>
                <div className="fade">1 Quadrant Wins</div>
              </div>
            </div>

            <div className="chart-box">
              <div className="y-axis">
                <span className="y-label-top">{m.yTop}</span>
                <span className="y-axis-title">{m.yAxis}</span>
                <span className="y-label-bot">{m.yBot}</span>
              </div>

              <div className="plot-wrap">
                <div className="plot">
                  <div className="plot-grid" aria-hidden="true" />
                  <div className="quadrant-hl" aria-hidden="true" />
                  <div className="plot-mid-x" aria-hidden="true" />
                  <div className="plot-mid-y" aria-hidden="true" />

                  <div className="q-label q-tl">Upper-Left</div>
                  <div className="q-label q-tr">Upper-Right &nbsp;&mdash;&nbsp; The Answer</div>
                  <div className="q-label q-bl">Origin</div>
                  <div className="q-label q-br">Lower-Right</div>

                  {m.players.map((p) => {
                    const isBL = p.id === 'bl'
                    const anchor = p.labelPos === 'r' ? 'anchor-r' : 'anchor-l'
                    return (
                      <div
                        key={`${activeMatrix}-${p.id}`}
                        className={`dot${isBL ? ' is-bl' : ''}`}
                        style={{ left: `${p.x}%`, bottom: `${p.y}%` }}
                        aria-label={`${p.name} \u2014 ${p.quad} quadrant`}
                      >
                        <div className="dot-node" aria-hidden="true" />
                        <div className={`dot-connector ${anchor}`} aria-hidden="true" />
                        <div className={`dot-label ${anchor}`}>
                          {p.name}
                          <span className="mini">{p.quad}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="x-axis">
                  <span className="x-label-left">{m.xLeft}</span>
                  <span className="x-axis-title">{m.xAxis}</span>
                  <span className="x-label-right">{m.xRight}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="side">
            <div className="winner-block">
              <div className="winner-head">The Upper-Right</div>
              <div className="winner-title">
                BaxterLabs <span style={{ fontStyle: 'normal' }}>Advisory</span>
              </div>
              <p className="winner-sub">{m.winnerSub}</p>
            </div>

            <div>
              <div className="compare-head">Players</div>
              <div className="players">
                {m.players.map((p) => {
                  const isBL = p.id === 'bl'
                  return (
                    <div
                      key={`${activeMatrix}-player-${p.id}`}
                      className={`player-row${isBL ? ' is-bl' : ''}`}
                    >
                      <span className="player-swatch" aria-hidden="true" />
                      <div>
                        <div className="player-name">{p.name}</div>
                        <div className="player-sub">{p.sub}</div>
                      </div>
                      <div className="player-quad">{p.quad}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="compare-head">The Spread</div>
              <div className="compare-grid">
                {m.compare.map((c, i) => (
                  <div
                    key={`${activeMatrix}-cmp-${i}`}
                    className={`compare-cell${c.isBL ? ' is-bl' : ''}`}
                  >
                    <div className="compare-who">{c.who}</div>
                    <div className="compare-big">{c.big}</div>
                    <div className="compare-small">{c.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
