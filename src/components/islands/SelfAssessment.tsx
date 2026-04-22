import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  CATS,
  SCALE,
  REV_LABELS,
  BAND_COPY,
  BAND_LABELS,
  INDUSTRIES,
  computeResult,
  formatCurrency,
  type AssessRevenueRange,
  type Band,
} from '../../data/assessment'
import { insertLeadMagnetCapture, insertSelfAssessmentScore } from '../../lib/supabase'

type Answers = Record<number, 1 | 2 | 3 | 4 | 5>

type ResultState = {
  score: number
  band: Band
  low: number
  high: number
  revenue: AssessRevenueRange
  industry: string
  answers: Answers
} | null

type Stage = 'assessment' | 'results-gated' | 'results-unlocked'

export default function SelfAssessment() {
  const [revenue, setRevenue] = useState<AssessRevenueRange | ''>('')
  const [industry, setIndustry] = useState<string>('')
  const [answers, setAnswers] = useState<Answers>({})
  const [result, setResult] = useState<ResultState>(null)
  const [stage, setStage] = useState<Stage>('assessment')

  const [captureError, setCaptureError] = useState<string | null>(null)
  const [captureBusy, setCaptureBusy] = useState(false)
  // If capture succeeded but score failed, keep the id so a retry doesn't orphan a second row.
  const captureIdRef = useRef<string | null>(null)

  const catRefs = useRef<Record<string, HTMLElement | null>>({})
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const resultsRef = useRef<HTMLDivElement | null>(null)

  const answered = Object.keys(answers).length
  const totalScore = Object.values(answers).reduce((s, v) => s + v, 0)
  const displayTally = answered === 12 ? totalScore : totalScore || 12

  const completedCategories = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const c of CATS) map[c.id] = c.questions.every((q) => answers[q.qid] != null)
    return map
  }, [answers])

  function setAnswer(qid: number, v: 1 | 2 | 3 | 4 | 5) {
    setAnswers((prev) => ({ ...prev, [qid]: v }))
  }

  // Progressive reveal: scroll to next category when current completes
  useEffect(() => {
    for (let i = 0; i < CATS.length; i++) {
      const cat = CATS[i]
      if (!completedCategories[cat.id]) continue
      const next = CATS[i + 1]
      if (!next) continue
      const el = catRefs.current[next.id]
      if (!el) continue
      // Only scroll if the next category's first question is still unanswered
      const firstUnanswered = next.questions.some((q) => answers[q.qid] == null)
      if (!firstUnanswered) continue
      const y = el.getBoundingClientRect().top + window.scrollY - 130
      // Avoid scrolling back up if user is already below
      if (window.scrollY < y) {
        window.scrollTo({ top: y, behavior: 'smooth' })
      }
      break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedCategories])

  const canSubmit = answered === 12 && revenue !== '' && industry !== ''

  function onReveal() {
    if (!canSubmit) return
    const { band, low, high } = computeResult(totalScore, revenue as AssessRevenueRange)
    setResult({
      score: totalScore,
      band,
      low,
      high,
      revenue,
      industry,
      answers: { ...answers },
    })
    setStage('results-gated')
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    })
  }

  async function onGateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!result) return
    const form = e.currentTarget
    const fd = new FormData(form)
    const name = String(fd.get('name') ?? '').trim()
    const email = String(fd.get('email') ?? '').trim()
    const firm = String(fd.get('firm') ?? '').trim()
    const role = String(fd.get('role') ?? '').trim()
    if (!name || !email || !firm) {
      form.reportValidity()
      return
    }

    setCaptureBusy(true)
    setCaptureError(null)
    try {
      let captureId = captureIdRef.current
      if (!captureId) {
        const res = await insertLeadMagnetCapture({
          asset: 'self_assessment',
          name,
          email,
          company_name: firm,
          revenue_range: result.revenue,
          role: role || null,
        })
        captureId = res.id
        captureIdRef.current = captureId
      }
      await insertSelfAssessmentScore({
        capture_id: captureId,
        answers: result.answers as unknown as Record<string, number>,
        total_score: result.score,
        band: result.band,
        revenue_range: result.revenue,
        exposure_low: Math.round(result.low),
        exposure_high: Math.round(result.high),
        industry: result.industry || null,
      })
      setStage('results-unlocked')
      setTimeout(() => {
        if (bodyRef.current) {
          const y = bodyRef.current.getBoundingClientRect().top + window.scrollY - 130
          window.scrollTo({ top: y, behavior: 'smooth' })
        }
      }, 50)
    } catch (err) {
      console.error('[assessment gate submit]', err)
      setCaptureError(
        "Something went wrong saving that. Try again, or email george@baxterlabs.ai directly."
      )
    } finally {
      setCaptureBusy(false)
    }
  }

  return (
    <>
      {stage === 'assessment' ? (
        <AssessmentView
          revenue={revenue}
          setRevenue={setRevenue}
          industry={industry}
          setIndustry={setIndustry}
          answers={answers}
          setAnswer={setAnswer}
          answered={answered}
          displayTally={displayTally}
          canSubmit={canSubmit}
          onReveal={onReveal}
          completedCategories={completedCategories}
          catRefs={catRefs}
        />
      ) : (
        <ResultsView
          result={result!}
          stage={stage}
          captureError={captureError}
          captureBusy={captureBusy}
          onGateSubmit={onGateSubmit}
          bodyRef={bodyRef}
          resultsRef={resultsRef}
        />
      )}
    </>
  )
}

function AssessmentView(props: {
  revenue: AssessRevenueRange | ''
  setRevenue: (v: AssessRevenueRange | '') => void
  industry: string
  setIndustry: (v: string) => void
  answers: Answers
  setAnswer: (qid: number, v: 1 | 2 | 3 | 4 | 5) => void
  answered: number
  displayTally: number
  canSubmit: boolean
  onReveal: () => void
  completedCategories: Record<string, boolean>
  catRefs: React.RefObject<Record<string, HTMLElement | null>>
}) {
  const {
    revenue,
    setRevenue,
    industry,
    setIndustry,
    answers,
    setAnswer,
    answered,
    displayTally,
    canSubmit,
    onReveal,
    completedCategories,
    catRefs,
  } = props

  const remaining = 12 - answered
  const submitNote = canSubmit
    ? 'All answered. Reveal your exposure.'
    : answered === 12
      ? 'Add your revenue range and industry at the top to reveal.'
      : `${remaining} ${remaining === 1 ? 'question' : 'questions'} to go.`

  return (
    <div className="sa-shell">
      <main className="sa-main">
        <header className="sa-hero">
          <div className="rp-eyebrow-row">
            <span className="rp-eyebrow-rule"></span>
            <span className="rp-eyebrow-txt">
              Self-Assessment &middot; <span className="roman">12</span> Questions
            </span>
          </div>
          <h1>
            An honest look at<br />where margin is<br />leaking.
          </h1>
          <p className="deck">
            Twelve questions, a five-point honesty scale. When you're done you'll see a band, a
            dollar exposure range calibrated to your revenue, and a specific interpretation
            written for firms your size.
          </p>
        </header>

        <div className="sa-setup">
          <div className="kicker">Two quick inputs first</div>
          <h2>Tell me about your firm.</h2>
          <div className="rp-form">
            <div className="rp-field">
              <label htmlFor="sa-revenue">
                Firm revenue <span className="req">*</span>
              </label>
              <select
                id="sa-revenue"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value as AssessRevenueRange | '')}
                required
              >
                <option value="">Select a range</option>
                <option value="5-10">$5M&ndash;$10M</option>
                <option value="10-25">$10M&ndash;$25M</option>
                <option value="25-50">$25M&ndash;$50M</option>
              </select>
            </div>
            <div className="rp-field">
              <label htmlFor="sa-industry">
                Industry <span className="req">*</span>
              </label>
              <select
                id="sa-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
              >
                <option value="">Select an industry</option>
                {INDUSTRIES.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          {CATS.map((cat, i) => {
            const locked = i > 0 && !completedCategories[CATS[i - 1].id]
            return (
              <section
                key={cat.id}
                className={'sa-cat' + (locked ? ' is-locked' : '')}
                id={`sa-cat-${cat.id}`}
                ref={(el) => {
                  catRefs.current[cat.id] = el
                }}
              >
                <div className="sa-cat-head">
                  <span className="sa-cat-rn">{cat.rn}</span>
                  <div>
                    <div className="sa-cat-kicker">Leak {cat.rn}</div>
                    <h2 className="sa-cat-title">{cat.title}.</h2>
                    <p className="sa-cat-lead">{cat.lead}</p>
                  </div>
                </div>
                {cat.questions.map((q) => (
                  <div className="sa-q" key={q.qid}>
                    <div className="sa-q-num">Question {q.qid} of 12</div>
                    <p className="sa-q-text">{q.text}</p>
                    <div className="sa-scale" role="radiogroup" aria-label={`Question ${q.qid}`}>
                      {SCALE.map((s) => {
                        const checked = answers[q.qid] === s.v
                        return (
                          <label
                            key={s.v}
                            className={'sa-opt' + (checked ? ' is-checked' : '')}
                          >
                            <input
                              type="radio"
                              name={`q${q.qid}`}
                              value={s.v}
                              checked={checked}
                              onChange={() => setAnswer(q.qid, s.v)}
                            />
                            <span className="dot" />
                            <span className="val">{s.v}</span>
                            <span className="lbl">{s.lbl}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </section>
            )
          })}
        </div>

        <div className="sa-submit">
          <div className={'sa-submit-note' + (canSubmit ? ' is-ready' : '')}>{submitNote}</div>
          <button
            className="rp-btn"
            type="button"
            disabled={!canSubmit}
            style={canSubmit ? undefined : { opacity: 0.4, cursor: 'not-allowed' }}
            onClick={onReveal}
          >
            Reveal my exposure <span className="arrow">&rarr;</span>
          </button>
        </div>
      </main>

      <aside className="sa-rail">
        <div className="sa-rail-kicker">Running tally</div>
        <div className="sa-tally">
          <span>{displayTally}</span>
          <span className="of">/ 60</span>
        </div>
        <div className="sa-tally-sub">
          <span>{answered}</span> of 12 answered
        </div>

        <div className="sa-breakdown">
          {CATS.map((cat) => {
            const qids = cat.questions.map((q) => q.qid)
            const all = qids.every((qid) => answers[qid] != null)
            const sum = qids.reduce((s, qid) => s + (answers[qid] ?? 0), 0)
            const max = qids.length * 5
            const answeredCount = qids.filter((qid) => answers[qid] != null).length
            return (
              <div
                key={cat.id}
                className={'sa-br-row' + (all ? ' is-complete' : '')}
                data-cat={cat.id}
              >
                <span>
                  {cat.rn}. {cat.title}
                </span>
                <span className="v">
                  {all ? (
                    <>
                      {sum} <span style={{ color: 'var(--fg-4)' }}>/ {max}</span>
                    </>
                  ) : sum > 0 ? (
                    <span className="pend">
                      {answeredCount}/{qids.length} answered
                    </span>
                  ) : (
                    <span className="pend">–/{max}</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}

function ResultsView(props: {
  result: NonNullable<ResultState>
  stage: Stage
  captureError: string | null
  captureBusy: boolean
  onGateSubmit: (e: FormEvent<HTMLFormElement>) => void
  bodyRef: React.RefObject<HTMLDivElement | null>
  resultsRef: React.RefObject<HTMLDivElement | null>
}) {
  const { result, stage, captureError, captureBusy, onGateSubmit, bodyRef, resultsRef } = props
  const copy = BAND_COPY[result.band]
  const unlocked = stage === 'results-unlocked'

  return (
    <div className="sa-shell">
      <main className="sa-main">
        <div className="sa-results is-visible" ref={resultsRef} aria-live="polite">
          <header className="sa-hero" style={{ marginBottom: '2rem' }}>
            <div className="rp-eyebrow-row">
              <span className="rp-eyebrow-rule"></span>
              <span className="rp-eyebrow-txt">
                Your Result &middot; {result.score} / 60
              </span>
            </div>
          </header>

          <div className={`sa-reveal band-${result.band}`}>
            <div className="band-label">{BAND_LABELS[result.band]}</div>
            <h2 className="headline">{copy.headline}</h2>

            <div className="exposure-kicker">Estimated annual profit-leak exposure</div>
            <div className="exposure">
              {formatCurrency(result.low)} &ndash; {formatCurrency(result.high)}
            </div>
            <div className="range-sub">
              Annual, based on {REV_LABELS[result.revenue]} midpoint
            </div>

            <div className="meta-row">
              <div>
                Your score<span className="v">{result.score}</span>
              </div>
              <div>
                Revenue range<span className="v">{REV_LABELS[result.revenue]}</span>
              </div>
              <div>
                Band<span className="v">{BAND_LABELS[result.band]}</span>
              </div>
            </div>
          </div>

          {!unlocked && (
            <div className="sa-gate">
              <div className="kicker">Before the rest</div>
              <h3>Want the full interpretation and what to do next?</h3>
              <p>A few details and George's written interpretation opens on this page.</p>

              <form className="rp-form" onSubmit={onGateSubmit} noValidate>
                <div className="rp-field">
                  <label htmlFor="sa-name">
                    Your name <span className="req">*</span>
                  </label>
                  <input id="sa-name" name="name" type="text" required autoComplete="name" />
                </div>
                <div className="rp-field">
                  <label htmlFor="sa-email">
                    Work email <span className="req">*</span>
                  </label>
                  <input id="sa-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="rp-field">
                  <label htmlFor="sa-firm">
                    Firm name <span className="req">*</span>
                  </label>
                  <input
                    id="sa-firm"
                    name="firm"
                    type="text"
                    required
                    autoComplete="organization"
                  />
                </div>
                <div className="rp-field">
                  <label htmlFor="sa-role">Your role</label>
                  <select id="sa-role" name="role">
                    <option value="">Select a role (optional)</option>
                    <option>Owner</option>
                    <option>Managing Partner</option>
                    <option>CFO</option>
                    <option>COO</option>
                    <option>Other</option>
                  </select>
                </div>

                {captureError && (
                  <div
                    className="capture-error visible rp-form-full"
                    style={{ marginTop: '0.5rem' }}
                  >
                    {captureError}
                  </div>
                )}

                <div
                  className="rp-form-full"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    paddingTop: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.72rem',
                      color: 'var(--bl-gray-warm)',
                    }}
                  >
                    No drip sequence. No follow-ups you didn't ask for. Straight to your interpretation.
                  </span>
                  <button
                    type="submit"
                    className="rp-btn"
                    disabled={captureBusy}
                    style={captureBusy ? { opacity: 0.6 } : undefined}
                  >
                    {captureBusy ? 'Unlocking…' : 'Unlock my interpretation'}
                    <span className="arrow">&rarr;</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          <div
            className={'sa-body-card' + (unlocked ? ' is-visible' : '')}
            ref={bodyRef}
          >
            <p>{copy.body}</p>
          </div>

          <div className={'sa-cta-card' + (unlocked ? ' is-visible' : '')}>
            <div className="kicker">Diagnostic &middot; Fixed scope</div>
            <h3>A free 30-minute diagnostic review call.</h3>
            <p>
              You don't need to hire anyone to start. Pick the two or three questions where you
              scored highest and do one thing this week. Pull a vendor list and look for
              duplicates. Ask your billing team how many days sit between work-complete and
              invoice-sent. Run a seat count on your three biggest software contracts. You
              already have the data. The question is whether anyone has looked at it through this
              lens.
            </p>
            <p>
              If your exposure estimate landed higher than you expected, or if the questions
              themselves made you uncomfortable, that feeling is worth paying attention to. That
              gap is where profit leaks live.
            </p>
            <div className="price">$12,500 &middot; 14 days &middot; no scope creep</div>
            <a href="/get-started" className="rp-btn">
              Book a diagnostic review call <span className="arrow">&rarr;</span>
            </a>
            <div className="sign-off">
              <strong>George DeVries</strong> &middot; Managing Partner, BaxterLabs Advisory
              <br />
              george@baxterlabs.ai &middot; baxterlabs.ai
            </div>
          </div>

          {unlocked && (
            <div className="fg-end-cta" style={{ margin: '0 0 2rem' }}>
              Want the long-form version?{' '}
              <a href="/resources/five-profit-leaks/read">
                Read the field guide &rarr;
              </a>
            </div>
          )}

          <details className={'sa-method' + (unlocked ? ' is-visible' : '')}>
            <summary>How the exposure range is calculated</summary>
            <div className="m-body">
              <p>
                The exposure range is not a guarantee and not a quote. It's an estimate based on
                three inputs: your total score, the midpoint of the revenue range you selected,
                and the exposure percentages that these five categories typically represent in
                professional service firms.
              </p>
              <p>
                Your total score places you in one of three bands: Low (12–25), Moderate (26–40),
                or High (41–60). Each band maps to an exposure percentage range: Low is 1–2% of
                your revenue midpoint, Moderate is 3–5%, and High is 6–10%. The revenue midpoints
                are $7.5M for the $5M–$10M range, $17.5M for the $10M–$25M range, and $37.5M for
                the $25M–$50M range.
              </p>
              <p>
                So if you selected the $10M–$25M range and scored 34, your exposure estimate
                would be 3–5% of $17.5M, which is $525K to $875K. That's the range displayed.
              </p>
              <p>
                These percentages come from the patterns we observe in profit leak diagnostics
                across professional service firms in the $5M to $50M range. Your actual
                recoverable profit could be higher or lower. The estimate is meant to give you a
                directional sense of scale, not a precise figure.
              </p>
            </div>
          </details>
        </div>
      </main>
    </div>
  )
}
