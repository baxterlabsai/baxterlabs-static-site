import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'baxterlabs_alfonso_onboarding_v1'

type Note = { label: string; body: string }

type Item = {
  id: string
  title: string
  description: string
  url?: string
  notes?: Note[]
  outro?: string
}

type Phase = {
  number: string
  label: string
  title: string
  intro: string
  items: Item[]
}

const PHASES: Phase[] = [
  {
    number: '00',
    label: 'Pre-meeting',
    title: 'Solo setup before we meet',
    intro:
      "Everything below you can do alone in one or two sittings. When the last item is checked, you're ready for our working session.",
    items: [
      {
        id: 'pre-arch-check',
        title: 'Check your Windows architecture',
        description:
          'Open Windows Settings → System → About. Under Device specifications, find System type. You\'ll see either "64-bit operating system, x64-based processor" or "64-bit operating system, ARM-based processor". Note which one — it determines which installer to pick for the next few downloads.',
      },
      {
        id: 'pre-claude-max',
        title: 'Subscribe to Claude Max on alfonso@baxterlabs.ai',
        url: 'https://claude.com/pricing',
        description:
          'Sign up or sign in with alfonso@baxterlabs.ai, then upgrade to Claude Max. Max 5× at $100/mo is the floor. Max 20× at $200/mo if you expect heavy daily usage. Pro tier is not enough for the daily scheduled-task load this platform runs.',
      },
      {
        id: 'pre-claude-desktop',
        title: 'Download and install Claude Desktop for Windows',
        url: 'https://claude.com/download',
        description:
          'Pick the installer matching your architecture (x64 or ARM). Run the MSIX installer. Launch from Start Menu. Sign in with your Anthropic account. This is where all your Cowork sessions will happen.',
      },
      {
        id: 'pre-gdrive',
        title: 'Install Google Drive for Desktop',
        url: 'https://support.google.com/drive/answer/10838124',
        description:
          'Download GoogleDriveSetup.exe, install, sign in as alfonso@baxterlabs.ai. Open Windows Explorer — you should see a drive letter (typically G:) with access to BaxterLabs Advisory and BaxterLabs — Cowork shared drives. Both must appear for the rest of the system to work.',
      },
      {
        id: 'pre-zettlr',
        title: 'Install Zettlr (Markdown reader)',
        url: 'https://www.zettlr.com/download',
        description:
          "Pick the installer matching your architecture. No sign-in required. Windows has no built-in .md file viewer — Zettlr renders them cleanly. You'll use this throughout the system.",
      },
      {
        id: 'pre-apify',
        title: 'Sign up for Apify Starter ($29/mo) and copy your API token',
        url: 'https://console.apify.com/sign-up',
        description:
          "Create your account with alfonso@baxterlabs.ai, upgrade to the Starter plan. Then go to Settings → Integrations → Personal API tokens. Copy your token to your password manager or secure notes. Treat this like a password — never paste it into chat or email. You'll need it during our meeting.",
      },
      {
        id: 'pre-vibe',
        title: 'Sign up for Vibe Prospecting (free) and copy your API key',
        url: 'https://www.vibeprospecting.ai',
        description:
          'Click "Sign Up Free". Use alfonso@baxterlabs.ai. Copy your API key from the integrations or settings section to your secure notes.',
      },
      {
        id: 'pre-download-zip',
        title: 'Download and unzip your onboarding package',
        description:
          "Open drive.google.com in your browser and sign in as alfonso@baxterlabs.ai. Navigate to: BaxterLabs Advisory → Alfonso Onboarding → onboarding.zip. Download. Unzip to any folder on your local drive — Desktop, Documents, wherever you prefer. The unzip location doesn't matter; it doesn't need to be on your Google Drive.",
      },
      {
        id: 'pre-read-overview',
        title: 'Read the System Overview',
        description:
          'Open 01_Read_First/BaxterLabs_System_Overview.md from your unzipped package. If Zettlr is installed, it opens there. This is the only mandatory pre-meeting reading. Give it a focused block. It sets the mental model for everything else.',
      },
    ],
  },
  {
    number: '01',
    label: 'Live meeting · Part 1',
    title: 'Credentials handoff and Claude Desktop connectors',
    intro:
      "We'll work through this together. Have your Apify and Vibe Prospecting tokens from pre-meeting ready to paste.",
    items: [
      {
        id: 'live1-supabase-key',
        title: 'Receive Supabase service role key from George',
        description:
          "George will share this during the meeting via secure channel. Save to your password manager — you'll need it in the next step.",
      },
      {
        id: 'live1-claude-settings',
        title: 'Turn on Memory, Artifacts, and Past Chat Search',
        description:
          'In Claude Desktop, open Settings. Turn ON: Memory. Turn ON: Artifacts. Turn ON: Search and reference past chats. Turn ON: Generate memory from chat history. These are used heavily throughout the system.',
      },
      {
        id: 'live1-conn-drive',
        title: 'Add Google Drive connector',
        description:
          'Settings → Connectors → Add Google Drive. Complete the OAuth flow as alfonso@baxterlabs.ai. Smoke test: ask Claude "list files in my Google Drive Standards/alfonso folder". You should see placeholder files waiting for your voice excavation output.',
      },
      {
        id: 'live1-conn-gmail',
        title: 'Add Gmail connector',
        description:
          'OAuth as alfonso@baxterlabs.ai. Smoke test: "list my three most recent emails".',
      },
      {
        id: 'live1-conn-calendar',
        title: 'Add Google Calendar connector',
        description:
          'OAuth as alfonso@baxterlabs.ai. Smoke test: "what\'s on my calendar today".',
      },
      {
        id: 'live1-conn-supabase',
        title: 'Add Supabase connector',
        description:
          "Paste the service role key George shared. Pin project_id: rqpnymffdhcvbudfbhra — you'll need this on every query. Smoke test: ask Claude to count rows in pipeline_opportunities. Should return a number, not an error.",
      },
      {
        id: 'live1-conn-apify',
        title: 'Add Apify connector',
        description:
          'Paste YOUR API token from pre-meeting. Smoke test: "list my recent Apify actor runs" (likely empty — you haven\'t run anything yet — but the call should succeed without error).',
      },
      {
        id: 'live1-conn-vibe',
        title: 'Add Vibe Prospecting connector',
        description:
          'Complete OAuth or paste API key depending on the connector flow. Smoke test: search for a test business like "Deloitte".',
      },
    ],
  },
  {
    number: '02',
    label: 'Live meeting · Part 2',
    title: 'Dashboard access',
    intro:
      "From now on, the dashboard lives in Pake — a dedicated desktop app that opens app.baxterlabs.ai without a browser tab. You'll install Pake, reset your password, log in, and walk the sidebar to confirm your attribution and permissions are wired correctly.",
    items: [
      {
        id: 'live2-pake',
        title: 'Install the Pake Windows desktop app',
        description:
          'George sends you a Windows installer for the Pake-wrapped dashboard. Install, pin it to your taskbar. Pake opens app.baxterlabs.ai as a desktop app — not a browser tab. This is your permanent entry point into the dashboard.',
      },
      {
        id: 'live2-password-reset',
        title: 'Reset your dashboard password',
        url: 'https://app.baxterlabs.ai',
        description:
          'Open Pake and click "Forgot password" on the login screen. Enter alfonso@baxterlabs.ai. Check your Gmail for the reset email. Follow the link and set a new password. If the Pake flow is awkward for the one-time reset, the link above works in a browser — but ongoing access is through Pake.',
      },
      {
        id: 'live2-login',
        title: 'Log into the dashboard',
        description:
          'Open the Pake app you just installed. Use alfonso@baxterlabs.ai and your new password. You should land on the Overview page without errors. The dashboard lives in Pake from now on — not a browser tab.',
      },
      {
        id: 'live2-sidebar-walk',
        title: 'Click through every sidebar section',
        description:
          'Verify each section loads without 403 or error. Overview shows firm state. Pipeline → Board shows the same data George sees. Content pages show empty states (expected — no voice files yet). Engagements → Client Directory shows firm clients. Analytics shows shared rollups.',
      },
      {
        id: 'live2-color-verify',
        title: 'Verify your gold attribution color shows up',
        description:
          'Create a test activity from Pipeline → Activities. Confirm the card renders with gold accent (#C9A84C). Delete the test activity when confirmed.',
      },
    ],
  },
  {
    number: '03',
    label: 'Live meeting · Part 3',
    title: 'Plugins and scheduled tasks',
    intro:
      'We install the two shared plugins first to verify your install pipeline works, then install your voice-dependent forks. Once plugins are live, we set up your 10 Cowork scheduled tasks — the background jobs that keep your queues filled on their own.',
    items: [
      {
        id: 'live3-shared-plugins',
        title: 'Install the two shared plugins first (smoke test)',
        description:
          "From your unzipped package, navigate to 03_Plugins/. Drag baxterlabs-delivery.plugin into Cowork in Claude Desktop. Then baxterlabs-interview.plugin. Verify both appear in Cowork's Personal Plugins list. These need no path substitution — they should install clean. If they fail, we debug the install pipeline before touching the forks.",
      },
      {
        id: 'live3-fork-plugins',
        title: 'Install your forked plugins (content-alfonso, sales-alfonso)',
        description:
          'George will walk through path substitution per Plugin Build Process v1.2. We need your actual Drive mount path (typically G:\\Shared drives\\BaxterLabs — Cowork\\, but your Windows install may differ). Once paths are substituted, install baxterlabs-content-alfonso.plugin and baxterlabs-sales-alfonso.plugin. Verify both appear in Personal Plugins.',
      },
      {
        id: 'live3-demo-run',
        title: 'Watch George run a sample plugin command end-to-end',
        description:
          "George runs a sales research command on Scion Staffing. You watch the pattern: dashboard button → clipboard → paste into Cowork → Supabase writes → dashboard refresh. You're now ready to run commands yourself.",
      },
      {
        id: 'live3-scheduled-tasks',
        title: 'Install your 10 Cowork scheduled tasks',
        description:
          "Open Claude Desktop. For each task, paste the prompt from 02_Setup_Guide/alfonso_scheduled_task_prompts.md into Cowork, follow the 5-question flow (what / name / when / output / constraints). Install in priority order so value lands fastest: (1) News fetch, (2) LinkedIn commenting pre-brief, (3) Comment pull (first pass), (4) Comment pull (second pass), (5) Engagement metrics, (6) Content drafts, (7) Partner check-ins, (8) Video script prep, (9) Story bank prompt. Verify each appears in Cowork's scheduled tasks list.",
      },
    ],
  },
  {
    number: '04',
    label: 'Post-meeting · Voice',
    title: 'Voice excavation',
    intro:
      "This is the longest pole. Work it in two focused chats with Claude.ai. Your output unlocks your content and sales plugins — they'll start producing real drafts the moment your files land in Standards/alfonso/.",
    items: [
      {
        id: 'post-read-voice-process',
        title: 'Read the Voice Excavation Process doc',
        description:
          'Open 01_Read_First/BaxterLabs_Voice_Excavation_Process_v1_0.md in Zettlr. Read it fully. Five phases. Understand the arc before you start any chat.',
      },
      {
        id: 'post-voice-chat-1',
        title: 'Voice excavation Chat 1 (Phases 1–2)',
        description:
          'Open Claude.ai in Claude Desktop. Start a fresh chat. Plan a focused block with no interruptions. Follow Phase 1 (corpus gathering) and Phase 2 (profile scaffold). Output: a usable v1.0 voice profile saved to Standards/alfonso/Alfonso_Voice_Profile_v1_0.md. At this point your content-alfonso plugin starts producing real output — you can begin drafting immediately while refining.',
      },
      {
        id: 'post-voice-chat-2',
        title: 'Voice excavation Chat 2 (Phases 3–5)',
        description:
          'A second focused chat — a separate sitting is fine, often better. Run Phases 3, 4, 5. Output: refined voice profile, content-draft-prompt.md, news-commentary-prompt.md, comment-draft-prompt.md, outreach-prompt.md, and a voice sample. Save all to Standards/alfonso/. Your content-alfonso and sales-alfonso plugins pick up each file on their next run — no restart needed.',
      },
    ],
  },
  {
    number: '05',
    label: 'Post-meeting · Targets',
    title: 'LinkedIn targets and news sources',
    intro:
      "Once your voice is locked, decide who you'll comment on and what news you'll watch. Aim for coverage that widens the firm's total reach, not coverage that overlaps George's.",
    items: [
      {
        id: 'post-linkedin-targets',
        title: 'Choose your 10–15 LinkedIn commenting targets',
        description:
          'Open a Claude.ai chat. Paste in your voice profile for context. Work through selection criteria: whose followers are your ICP? Whose engagement cadence matches what you want to match? Whose voice harmonizes with yours rather than collides?',
        notes: [
          {
            label: "George's current 14 (pick different unless deliberately overlapping)",
            body: 'Oscar Benavides (coachoscbenavides), Jamie Overbey (jamieoverbey), Mark Fackler (mfackler), Mark O\'Donnell (markaodonnell), Brent Stromwall (brentstromwall), Charlie Rhea (charlierhea), Shannon Horton (shannon-horton-cpa-cgma), Patrick J. McKenna (patrickjmckenna), Jason Staats (jstaats), Karl Feldman (karlfeldman), Blake Oliver (blaketoliver), Glenn Gow (glenngow), Nick Richtsmeier (nickrichtsmeier), Jordan Ross (jordan-ross-systems-expert).',
          },
        ],
        outro: 'Save your final list to paste into your scheduled task.',
      },
      {
        id: 'post-news-topics',
        title: 'Choose your news topics and priority publications',
        description:
          "Work with Claude.ai to identify the news coverage that serves your positioning. Pick different angles than George so the firm's total coverage widens.",
        notes: [
          {
            label: "George's current keyword searches",
            body: '"professional services firm profitability", "staffing firm revenue margin", "law firm accounting firm growth", "consulting firm operations", "professional services pricing".',
          },
          {
            label: "George's high-weight publications",
            body: 'Staffing Industry Analysts, Accounting Today, The American Lawyer, Consulting Magazine.',
          },
        ],
        outro: 'Save your final keyword list and publication priorities.',
      },
    ],
  },
  {
    number: '06',
    label: 'Post-meeting · First day',
    title: 'The system is live',
    intro:
      "Everything is installed, your voice is locked, and your scheduled tasks are running. This is the activation moment — work your first full day end-to-end and confirm the system is carrying its weight. When this phase is done, you're indistinguishable from a partner who's been here since day one.",
    items: [
      {
        id: 'post-read-lead-gen',
        title: 'Read the lead gen plan',
        description:
          'Open the Pake app and navigate to Help → Lead Gen Plan in the left sidebar. This is the daily and weekly rhythm the firm runs on — how prospect outreach, content, commenting, discovery calls, and follow-ups fit together across a 90-day arc. Reading it before you work your first day is the difference between poking at the dashboard and running the playbook.',
      },
      {
        id: 'post-first-day',
        title: 'Work your first full day',
        description:
          "After your first full day with tasks running: commenting queue has pre-brief opportunities in your voice, news digest has scored items from your sources, content drafts are available, outreach queue is populated. Work the surfaces as if you've been here from day one. You have been, in a way — the system was built assuming you'd arrive.",
      },
    ],
  },
]

type CompletedMap = Record<string, boolean>

// One-time localStorage migration for items that moved between phases in v2:
//   post-pake            → live2-pake
//   post-scheduled-tasks → live3-scheduled-tasks
// Safe to leave in place — renames persist after first run and the map
// simply no longer contains the old keys on subsequent loads.
const LEGACY_ID_RENAMES: Array<[string, string]> = [
  ['post-pake', 'live2-pake'],
  ['post-scheduled-tasks', 'live3-scheduled-tasks'],
]

function loadCompleted(): CompletedMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const map = parsed as CompletedMap

    let migrated = false
    for (const [oldKey, newKey] of LEGACY_ID_RENAMES) {
      if (oldKey in map) {
        if (map[oldKey] && !(newKey in map)) map[newKey] = true
        delete map[oldKey]
        migrated = true
      }
    }
    if (migrated) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
      } catch {
        // ignore quota/disabled storage
      }
    }
    return map
  } catch {
    return {}
  }
}

function phaseCounts(phase: Phase, completed: CompletedMap) {
  const total = phase.items.length
  const done = phase.items.reduce((n, item) => n + (completed[item.id] ? 1 : 0), 0)
  return { done, total, isComplete: done === total }
}

function initialOpenIndex(completed: CompletedMap): number {
  const hasAny = Object.keys(completed).length > 0
  if (!hasAny) return 0
  for (let i = 0; i < PHASES.length; i++) {
    const { isComplete } = phaseCounts(PHASES[i], completed)
    if (!isComplete) return i
  }
  return -1
}

export default function AlfonsoOnboarding() {
  const [completed, setCompleted] = useState<CompletedMap>(() => loadCompleted())
  const [openPhases, setOpenPhases] = useState<Set<number>>(() => {
    const idx = initialOpenIndex(loadCompleted())
    return idx >= 0 ? new Set([idx]) : new Set()
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(completed))
    } catch {
      // quota or disabled storage — ignore silently
    }
  }, [completed])

  const { totalDone, totalItems } = useMemo(() => {
    let done = 0
    let total = 0
    for (const phase of PHASES) {
      total += phase.items.length
      for (const item of phase.items) if (completed[item.id]) done += 1
    }
    return { totalDone: done, totalItems: total }
  }, [completed])

  const percent = totalItems === 0 ? 0 : (totalDone / totalItems) * 100

  const toggleItem = (id: string) => {
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const togglePhase = (index: number) => {
    setOpenPhases((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleReset = () => {
    const ok = window.confirm("Reset all checklist progress? This can't be undone.")
    if (!ok) return
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    window.location.reload()
  }

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current))
      }, 1500)
    } catch {
      // clipboard denied — silent; user can still click the link
    }
  }

  return (
    <div className="alfonso-onboarding min-h-screen bg-ivory text-charcoal">      <style>{`
        .alfonso-onboarding {
          --line: rgba(45, 52, 54, 0.12);
          --line-strong: rgba(45, 52, 54, 0.22);
          --muted: rgba(45, 52, 54, 0.64);
        }
        .alfonso-onboarding .progress-fill {
          background: linear-gradient(90deg, #005454 0%, #005454 35%, #C9A84C 100%);
          transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .alfonso-onboarding .check-mark {
          transition: opacity 0.15s ease-out;
        }
        @media print {
          .alfonso-onboarding { background: #ffffff !important; }
          .alfonso-onboarding .no-print { display: none !important; }
          .alfonso-onboarding .print-open { display: block !important; }
          .alfonso-onboarding .print-checkbox { display: inline-block !important; }
          .alfonso-onboarding .screen-checkbox { display: none !important; }
          .alfonso-onboarding a { color: #2D3436 !important; text-decoration: none !important; }
          .alfonso-onboarding .phase-button { cursor: default !important; }
        }
      `}</style>

      <StickyHeader
        totalDone={totalDone}
        totalItems={totalItems}
        percent={percent}
        onReset={handleReset}
      />

      <Hero />

      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        {PHASES.map((phase, index) => {
          const { done, total, isComplete } = phaseCounts(phase, completed)
          const isOpen = openPhases.has(index)
          return (
            <PhaseSection
              key={phase.number}
              phase={phase}
              phaseIndex={index}
              done={done}
              total={total}
              isComplete={isComplete}
              isOpen={isOpen}
              completed={completed}
              copiedId={copiedId}
              onTogglePhase={togglePhase}
              onToggleItem={toggleItem}
              onCopy={handleCopy}
            />
          )
        })}
      </div>

      <Outro />
    </div>
  )
}

function StickyHeader({
  totalDone,
  totalItems,
  percent,
  onReset,
}: {
  totalDone: number
  totalItems: number
  percent: number
  onReset: () => void
}) {
  return (
    <header
      className="no-print sticky top-0 z-40 w-full border-b border-[var(--line-strong)] bg-ivory/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4 sm:gap-6 sm:px-10">
        <a href="/" className="flex-shrink-0" aria-label="BaxterLabs Advisory home">
          <img
            src="/images/baxterlabs-logo.png"
            alt="BaxterLabs Advisory"
            className="h-10 w-auto sm:h-11"
          />
        </a>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-label text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Onboarding progress
            </span>
            <span className="font-label text-xs font-medium tabular-nums text-charcoal">
              {totalDone} of {totalItems} complete
            </span>
          </div>
          <div className="h-[5px] w-full overflow-hidden rounded-full bg-[var(--line)]">
            <div
              className="progress-fill h-full rounded-full"
              style={{ width: `${percent}%` }}
              role="progressbar"
              aria-valuenow={totalDone}
              aria-valuemin={0}
              aria-valuemax={totalItems}
              aria-label="Overall onboarding progress"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="flex-shrink-0 font-label text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] underline-offset-[6px] transition-colors hover:text-crimson hover:underline"
        >
          Reset
        </button>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="mx-auto max-w-3xl px-6 pt-20 pb-12 sm:px-10 sm:pt-28 sm:pb-16">
      <p className="font-label text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-teal">
        For Alfonso Cordon
      </p>
      <h1 className="mt-6 font-display text-[clamp(2.25rem,5.5vw,4rem)] font-bold leading-[1.05] tracking-[-0.01em] text-crimson">
        Your <em className="font-display font-normal italic">onboarding</em> at BaxterLabs Advisory
      </h1>
      <p className="mt-8 font-headline text-[clamp(1.125rem,1.75vw,1.4rem)] leading-[1.55] text-charcoal">
        This is your personal checklist. Work through it top to bottom. Your progress saves
        automatically in this browser — bookmark the URL and come back whenever.
      </p>
      <p className="mt-5 text-[0.95rem] leading-[1.7] text-[var(--muted)]">
        Phases unlock in sequence. Pre-meeting is solo setup. Live meeting is synchronous time with
        George. Post-meeting is your self-guided voice work.
      </p>
    </section>
  )
}

function PhaseSection({
  phase,
  phaseIndex,
  done,
  total,
  isComplete,
  isOpen,
  completed,
  copiedId,
  onTogglePhase,
  onToggleItem,
  onCopy,
}: {
  phase: Phase
  phaseIndex: number
  done: number
  total: number
  isComplete: boolean
  isOpen: boolean
  completed: CompletedMap
  copiedId: string | null
  onTogglePhase: (i: number) => void
  onToggleItem: (id: string) => void
  onCopy: (url: string, id: string) => void
}) {
  const numeralColor = isComplete ? 'text-teal/85' : 'text-gold/65'
  return (
    <section className="border-t border-[var(--line)]">
      <button
        type="button"
        className="phase-button group grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 py-8 text-left sm:gap-8 sm:py-12"
        aria-expanded={isOpen}
        aria-controls={`phase-body-${phase.number}`}
        onClick={() => onTogglePhase(phaseIndex)}
      >
        <span
          className={`font-display text-[3.25rem] font-normal italic leading-[0.9] tabular-nums sm:text-[4.5rem] ${numeralColor}`}
          aria-hidden="true"
        >
          {phase.number}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="font-label text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              {phase.label}
            </span>
            <span className="h-px flex-1 bg-[var(--line)]" aria-hidden="true" />
          </div>
          <h2 className="mt-2 font-headline text-xl font-semibold leading-[1.25] text-crimson sm:text-2xl">
            {phase.title}
            {isComplete && (
              <span className="ml-2 text-teal" aria-label="phase complete">
                ✓
              </span>
            )}
          </h2>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3 sm:gap-5">
          <span className="hidden font-label text-xs tabular-nums text-[var(--muted)] sm:inline">
            {done} of {total}
          </span>
          <svg
            className={`h-4 w-4 text-[var(--muted)] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {(isOpen || undefined) && (
        <div
          id={`phase-body-${phase.number}`}
          className="print-open mx-auto max-w-3xl pb-14 sm:pb-20"
        >
          <p className="mb-10 text-[0.95rem] leading-[1.7] text-[var(--muted)]">{phase.intro}</p>
          <ul className="space-y-9">
            {phase.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                checked={!!completed[item.id]}
                copied={copiedId === item.id}
                onToggle={onToggleItem}
                onCopy={onCopy}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function ItemRow({
  item,
  checked,
  copied,
  onToggle,
  onCopy,
}: {
  item: Item
  checked: boolean
  copied: boolean
  onToggle: (id: string) => void
  onCopy: (url: string, id: string) => void
}) {
  const titleColor = checked
    ? 'text-[var(--muted)] line-through decoration-[1.5px] decoration-[var(--line-strong)]'
    : 'text-crimson'

  return (
    <li className="flex gap-4">
      <div className="flex-shrink-0 pt-[6px]">
        <label className="screen-checkbox relative inline-block cursor-pointer">
          <input
            type="checkbox"
            id={item.id}
            checked={checked}
            onChange={() => onToggle(item.id)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="block h-[18px] w-[18px] rounded-[2px] border border-[var(--line-strong)] bg-white transition-colors peer-checked:border-teal peer-checked:bg-teal peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal"
          />
          <svg
            className="check-mark pointer-events-none absolute left-[3px] top-[4px] h-[10px] w-[12px] text-white opacity-0 peer-checked:opacity-100"
            viewBox="0 0 12 10"
            fill="none"
            aria-hidden="true"
          >
            <polyline
              points="1,5 4.5,8 11,1.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </label>
        <span
          aria-hidden="true"
          className="print-checkbox hidden font-mono text-sm text-charcoal"
        >
          {checked ? '[x]' : '[ ]'}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <label htmlFor={item.id} className="block cursor-pointer">
          <h3
            className={`font-headline text-[1.05rem] font-semibold leading-[1.35] sm:text-lg ${titleColor}`}
          >
            {item.title}
          </h3>
        </label>
        <p className="mt-2 text-[0.95rem] leading-[1.7] text-charcoal/85">{item.description}</p>

        {item.url && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-mono text-[0.8rem] text-teal underline decoration-teal/40 underline-offset-[3px] hover:decoration-teal"
            >
              {item.url}
            </a>
            <button
              type="button"
              onClick={() => onCopy(item.url!, item.id)}
              className="no-print inline-flex items-center gap-1.5 rounded-[2px] border border-[var(--line-strong)] bg-white px-2 py-[3px] font-label text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] transition-colors hover:border-teal hover:text-teal"
              aria-label={`Copy ${item.url}`}
            >
              <svg
                className="h-[11px] w-[11px]"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="3.5"
                  y="3.5"
                  width="7"
                  height="8"
                  rx="0.5"
                  stroke="currentColor"
                  strokeWidth="1.1"
                />
                <path
                  d="M5.5 3V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V10"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
              </svg>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}

        {item.notes?.map((note, i) => (
          <div
            key={i}
            className="mt-5 border-l-2 border-gold pl-4"
          >
            <p className="font-label text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              {note.label}
            </p>
            <p className="mt-1.5 text-[0.9rem] leading-[1.65] text-charcoal/80">{note.body}</p>
          </div>
        ))}

        {item.outro && (
          <p className="mt-4 text-[0.95rem] leading-[1.7] text-charcoal/85">{item.outro}</p>
        )}
      </div>
    </li>
  )
}

function Outro() {
  return (
    <section className="mx-auto max-w-3xl px-6 pt-16 pb-24 text-center sm:px-10 sm:pt-24 sm:pb-32">
      <div className="mx-auto mb-8 h-px w-12 bg-teal" aria-hidden="true" />
      <p className="font-headline text-2xl italic leading-[1.5] text-charcoal/80">
        Welcome in.
      </p>
      <p className="mt-5 font-headline text-base italic text-charcoal/60">
        — George &amp; Claude
      </p>
    </section>
  )
}
