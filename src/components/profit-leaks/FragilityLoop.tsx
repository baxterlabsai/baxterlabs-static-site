import { useCallback, useEffect, useRef, useState } from 'react'

type LoopState = {
  year: number
  margin: number       // %
  compr: number        // bps/yr
  equity: number       // $
  revolver: number     // $
  rate: number         // %
  floor: number        // x
  ebit: number         // $
  breached: boolean
}

type Mode = 'anchor' | 'custom'

const ANCHOR: LoopState = {
  year: 0,
  margin: 45.5,
  compr: 50,
  equity: 420000,
  revolver: 2080000,
  rate: 7.5,
  floor: 1.25,
  ebit: 1200000,
  breached: false,
}

const STARTING_EBIT = 1200000
const STARTING_MARGIN = 45.5
const EQUITY_STEP = 80000
const REVOLVER_STEP = 120000
const RATE_STEP = 0.08
const RATE_CAP = 12
const METER_MAX_RATIO = 10
const TICK_MS = 1400
const EDGE_PULSE_MS = 180

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString()
}

function computeCoverage(s: LoopState): { interest: number; ratio: number } {
  const interest = s.revolver * (s.rate / 100)
  return { interest, ratio: s.ebit / interest }
}

function stepState(prev: LoopState): LoopState {
  if (prev.breached) return prev
  const margin = Math.max(0, prev.margin - prev.compr / 100)
  return {
    ...prev,
    year: prev.year + 1,
    margin,
    ebit: STARTING_EBIT * (margin / STARTING_MARGIN),
    equity: prev.equity - EQUITY_STEP,
    revolver: prev.revolver + REVOLVER_STEP,
    rate: Math.min(RATE_CAP, prev.rate + RATE_STEP),
  }
}

type Inputs = {
  margin: number
  compr: number
  equity: number
  revolver: number
  rate: number
  floor: number
}

const DEFAULT_INPUTS: Inputs = {
  margin: ANCHOR.margin,
  compr: ANCHOR.compr,
  equity: ANCHOR.equity,
  revolver: ANCHOR.revolver,
  rate: ANCHOR.rate,
  floor: ANCHOR.floor,
}

export default function FragilityLoop() {
  const [state, setState] = useState<LoopState>({ ...ANCHOR })
  const [mode, setMode] = useState<Mode>('anchor')
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS)
  const [playing, setPlaying] = useState(false)
  const [activeEdge, setActiveEdge] = useState<number>(-1)

  const tickRef = useRef<number | null>(null)
  const edgeTimerRef = useRef<number | null>(null)

  const { interest, ratio } = computeCoverage(state)
  const { breached } = state

  // Derived meter values.
  const fillPct = Math.max(0, Math.min(1, ratio / METER_MAX_RATIO)) * 100
  const fillCls = ratio < state.floor ? 'red' : ratio < state.floor * 1.4 ? 'amber' : ''
  const floorLeftPct = (state.floor / METER_MAX_RATIO) * 100

  // Edge pulse animation: walks 0..4 then settles on -1.
  const animateArrows = useCallback(() => {
    if (edgeTimerRef.current != null) {
      window.clearTimeout(edgeTimerRef.current)
      edgeTimerRef.current = null
    }
    let i = 0
    const pulse = () => {
      if (i < 5) {
        setActiveEdge(i)
        i += 1
        edgeTimerRef.current = window.setTimeout(pulse, EDGE_PULSE_MS)
      } else {
        setActiveEdge(-1)
        edgeTimerRef.current = null
      }
    }
    pulse()
  }, [])

  const stopLoop = useCallback(() => {
    setPlaying(false)
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  // Drive the tick interval off `playing`.
  useEffect(() => {
    if (!playing) return
    tickRef.current = window.setInterval(() => {
      setState((prev) => {
        if (prev.breached) return prev
        const next = stepState(prev)
        const cov = computeCoverage(next)
        if (cov.ratio < next.floor) next.breached = true
        return next
      })
      animateArrows()
    }, TICK_MS)
    return () => {
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [playing, animateArrows])

  // Stop playing automatically on breach.
  useEffect(() => {
    if (breached && playing) stopLoop()
  }, [breached, playing, stopLoop])

  // Clean up any pending edge timer on unmount.
  useEffect(() => () => {
    if (edgeTimerRef.current != null) window.clearTimeout(edgeTimerRef.current)
    if (tickRef.current != null) window.clearInterval(tickRef.current)
  }, [])

  const onPlayToggle = () => {
    if (breached) return
    if (playing) stopLoop()
    else setPlaying(true)
  }

  const onStep = () => {
    stopLoop()
    setState((prev) => {
      if (prev.breached) return prev
      const next = stepState(prev)
      const cov = computeCoverage(next)
      if (cov.ratio < next.floor) next.breached = true
      return next
    })
    animateArrows()
  }

  const onReset = useCallback(() => {
    stopLoop()
    setActiveEdge(-1)
    if (mode === 'anchor') {
      setState({ ...ANCHOR })
    } else {
      setState({
        year: 0,
        margin: inputs.margin || ANCHOR.margin,
        compr: inputs.compr || ANCHOR.compr,
        equity: inputs.equity || ANCHOR.equity,
        revolver: inputs.revolver || ANCHOR.revolver,
        rate: inputs.rate || ANCHOR.rate,
        floor: inputs.floor || ANCHOR.floor,
        ebit: STARTING_EBIT,
        breached: false,
      })
    }
  }, [mode, inputs, stopLoop])

  const switchMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    stopLoop()
    setActiveEdge(-1)
    if (next === 'anchor') {
      setState({ ...ANCHOR })
    } else {
      setState({
        year: 0,
        margin: inputs.margin || ANCHOR.margin,
        compr: inputs.compr || ANCHOR.compr,
        equity: inputs.equity || ANCHOR.equity,
        revolver: inputs.revolver || ANCHOR.revolver,
        rate: inputs.rate || ANCHOR.rate,
        floor: inputs.floor || ANCHOR.floor,
        ebit: STARTING_EBIT,
        breached: false,
      })
    }
  }

  // Status line copy.
  let line: React.ReactNode
  if (state.year === 0) {
    line = (
      <>
        Starting conditions from a $52M national staffing firm. Press <strong>play</strong> to watch the loop run.
      </>
    )
  } else if (breached) {
    line = (
      <>
        <strong>Covenant breach reached at Year {state.year}.</strong> At this trajectory, your firm would require an equity contribution or restructured facility to cure the test. The room to respond has shrunk to zero.
      </>
    )
  } else if (ratio < state.floor) {
    line = (
      <>
        <strong>Covenant still below floor.</strong> Year {state.year} coverage is {ratio.toFixed(2)}x against a {state.floor}x requirement.
      </>
    )
  } else {
    const q = Math.max(0, Math.round((ratio - state.floor) / 0.15))
    line = (
      <>
        Year {state.year}: coverage <strong>{ratio.toFixed(2)}x</strong>. Margin <strong>{state.margin.toFixed(1)}%</strong>. At this rate, approximately <strong>{q}</strong> quarters of room before the floor.
      </>
    )
  }

  const nodeVals: string[] = [
    state.margin.toFixed(1) + '%',
    fmt(Math.max(0, state.equity)),
    fmt(state.revolver),
    fmt(interest),
    ratio.toFixed(2) + 'x',
  ]

  const edges = [
    'M 277 89 Q 360 120 400 170',
    'M 416 226 Q 410 320 382 370',
    'M 324 403 Q 250 420 176 403',
    'M 118 370 Q 90 320 84 226',
    'M 100 170 Q 140 120 223 89',
  ]

  const labelPositions: Array<React.CSSProperties> = [
    { top: '-8%', left: '50%', transform: 'translateX(-50%)', width: '170px' },
    { top: '20%', right: 0, width: '110px', textAlign: 'right', transform: 'translateY(-100%)' },
    { bottom: '-8%', right: '-8%', width: '155px', textAlign: 'left' },
    { bottom: '-8%', left: '-8%', width: '155px', textAlign: 'right' },
    { top: '20%', left: 0, width: '110px', textAlign: 'left', transform: 'translateY(-100%)' },
  ]

  const labelTexts = [
    'Margin Compression',
    'Retained Earnings',
    'Revolver Balance',
    'Interest Expense',
    'Coverage Ratio',
  ]

  const setInput = (key: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setInputs((prev) => ({ ...prev, [key]: Number.isFinite(v) ? v : 0 }))
  }

  const setDollarInput = (key: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^\d]/g, '')
    setInputs((prev) => ({ ...prev, [key]: digits === '' ? 0 : parseInt(digits, 10) }))
  }

  return (
    <div className="pl-loop-card">
      <div className="pl-loop-wrap">
        <div className="pl-loop-svg-wrap">
          <svg className="pl-loop-svg" viewBox="0 0 500 500" aria-hidden="true">
            <defs>
              <marker id="pl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#C9A84C" />
              </marker>
              <marker id="pl-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#66151C" />
              </marker>
            </defs>

            <polygon
              points="250,70 421,194 356,395 144,395 79,194"
              fill="rgba(201,168,76,0.05)"
              stroke="rgba(201,168,76,0.28)"
              strokeWidth={1}
              strokeDasharray="2 5"
            />

            <circle cx={250} cy={250} r={58} fill="#FAF8F2" stroke="rgba(45,52,54,0.12)" strokeWidth={1} />
            <text x={250} y={244} textAnchor="middle" fontFamily="Inter" fontSize={9} fontWeight={700} letterSpacing={3} fill="#C9A84C">FRAGILITY</text>
            <text x={250} y={262} textAnchor="middle" fontFamily="Inter" fontSize={9} fontWeight={700} letterSpacing={3} fill="#C9A84C">LOOP</text>

            {edges.map((d, i) => {
              const isActive = activeEdge === i
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={isActive ? '#C2455A' : '#C9A84C'}
                  strokeWidth={1.5}
                  markerEnd={isActive ? 'url(#pl-arrow-active)' : 'url(#pl-arrow)'}
                  opacity={isActive ? 1 : 0.45}
                />
              )
            })}

            {[
              { cx: 250, cy: 70, tx: 250, ty: 80, n: '1' },
              { cx: 421, cy: 194, tx: 421, ty: 204, n: '2' },
              { cx: 356, cy: 395, tx: 356, ty: 405, n: '3' },
              { cx: 144, cy: 395, tx: 144, ty: 405, n: '4' },
              { cx: 79, cy: 194, tx: 79, ty: 204, n: '5' },
            ].map((node, i) => (
              <g key={i}>
                <circle cx={node.cx} cy={node.cy} r={34} fill="#66151C" stroke="#F6E7C8" strokeWidth={3} />
                <text
                  x={node.tx}
                  y={node.ty}
                  textAnchor="middle"
                  fontFamily="Playfair Display"
                  fontStyle="italic"
                  fontWeight={700}
                  fontSize={26}
                  fill="#F6E7C8"
                >
                  {node.n}
                </text>
              </g>
            ))}
          </svg>

          {labelPositions.map((pos, i) => (
            <div key={i} className="pl-loop-node-label" style={pos}>
              {labelTexts[i]}
              <span className="v">{nodeVals[i]}</span>
            </div>
          ))}
        </div>

        <div className="pl-loop-controls">
          <div className={`pl-loop-status${breached ? ' breach' : ''}`}>
            <div className="kicker">Current Year</div>
            <div className="year">Year {state.year}</div>
            <p className="line">{line}</p>
          </div>

          <div className="pl-loop-meter">
            <div className="lbl">
              <span>Interest coverage ratio</span>
              <span className="v">{ratio.toFixed(2)}x</span>
            </div>
            <div className="track">
              <div className={`fill${fillCls ? ' ' + fillCls : ''}`} style={{ width: `${fillPct}%` }} />
              <div className="floor" style={{ left: `${floorLeftPct}%` }} />
            </div>
          </div>

          <div className="pl-loop-mode" role="radiogroup" aria-label="Loop data mode">
            <button
              className={mode === 'anchor' ? 'active' : ''}
              onClick={() => switchMode('anchor')}
              role="radio"
              aria-checked={mode === 'anchor'}
            >
              Diagnostic anchor
            </button>
            <button
              className={mode === 'custom' ? 'active' : ''}
              onClick={() => switchMode('custom')}
              role="radio"
              aria-checked={mode === 'custom'}
            >
              My firm&apos;s numbers
            </button>
          </div>

          <div className={`pl-loop-inputs${mode === 'custom' ? ' visible' : ''}`}>
            <div className="pl-calc-field">
              <label htmlFor="in-margin">Starting margin (%)</label>
              <input id="in-margin" type="number" step={0.1} value={inputs.margin} onChange={setInput('margin')} />
            </div>
            <div className="pl-calc-field">
              <label htmlFor="in-compr">Compression (bps/yr)</label>
              <input id="in-compr" type="number" step={5} value={inputs.compr} onChange={setInput('compr')} />
            </div>
            <div className="pl-calc-field">
              <label htmlFor="in-equity">Equity ($)</label>
              <input
                id="in-equity"
                type="text"
                inputMode="numeric"
                value={inputs.equity.toLocaleString('en-US')}
                onChange={setDollarInput('equity')}
              />
            </div>
            <div className="pl-calc-field">
              <label htmlFor="in-revolver">Revolver ($)</label>
              <input
                id="in-revolver"
                type="text"
                inputMode="numeric"
                value={inputs.revolver.toLocaleString('en-US')}
                onChange={setDollarInput('revolver')}
              />
            </div>
            <div className="pl-calc-field">
              <label htmlFor="in-rate">Interest rate (%)</label>
              <input id="in-rate" type="number" step={0.1} value={inputs.rate} onChange={setInput('rate')} />
            </div>
            <div className="pl-calc-field">
              <label htmlFor="in-floor">Covenant floor (x)</label>
              <input id="in-floor" type="number" step={0.05} value={inputs.floor} onChange={setInput('floor')} />
            </div>
          </div>

          <div className="pl-loop-ctls">
            <button className="pl-loop-ctl primary" onClick={onPlayToggle} disabled={breached}>
              {playing ? '❚❚ Pause' : '▶ Play'}
            </button>
            <button className="pl-loop-ctl" onClick={onStep} disabled={breached}>Step +1 year</button>
            <button className="pl-loop-ctl" onClick={onReset}>Reset</button>
          </div>

          <a href="/get-started" className="pl-btn" style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}>
            Start Your Diagnostic <span className="arrow">&rarr;</span>
          </a>
        </div>
      </div>

      <p
        className="pl-disclaim"
        style={{ marginTop: '2rem', borderTop: '1px solid var(--pl-rule)', paddingTop: '1rem' }}
      >
        This is an illustrative projection based on diagnostic patterns, not a forecast of your firm&apos;s performance. Actual outcomes depend on factors not captured in this simplified model.
      </p>
    </div>
  )
}
