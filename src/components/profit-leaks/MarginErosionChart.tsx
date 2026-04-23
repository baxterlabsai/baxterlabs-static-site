import { useEffect, useRef, useState } from 'react'

type Bar = { year: string; pct: number; h: number; color: string }

const BARS: Bar[] = [
  { year: 'Year 1', pct: 45, h: 85, color: '#6BB38A' },
  { year: 'Year 2', pct: 32, h: 60, color: '#D4A843' },
  { year: 'Year 3', pct: 18, h: 34, color: '#E06B5F' },
]

export default function MarginErosionChart() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true)
            obs.unobserve(e.target)
          }
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={rootRef} className="pl-margin-chart" style={{ marginTop: '1.5rem' }}>
      <div className="title">Illustrative margin erosion &middot; three-year pattern</div>
      <div className="pl-margin-bars">
        {BARS.map((b) => (
          <div key={b.year} className="pl-margin-bar">
            <div
              className="fill"
              style={{
                height: visible ? `${b.h}%` : '0%',
                background: visible ? b.color : undefined,
              }}
            >
              <span className="val">{b.pct}%</span>
            </div>
            <span className="lbl">{b.year}</span>
          </div>
        ))}
      </div>
      <p className="caption">
        Illustrative margin erosion pattern from diagnostic engagements. Not client data.
      </p>
    </div>
  )
}
