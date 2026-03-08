import { useState } from 'react'

interface Command {
  title: string
  description: string
  buttonColor: string
  prompt: string
}

const COMMANDS: Command[] = [
  {
    title: 'Mine My Monetizable Expertise',
    description: 'Generate 25-30 post topics with hooks from your background. Run once a month or when the content pipeline feels thin.',
    buttonColor: '#005454',
    prompt: `Run the content-strategy command in expertise mining mode.

My background for this session:
[PASTE GEORGE_UNFAIR_ADVANTAGE.MD CONTENT HERE before running]

Generate 25-30 monetizable expertise topics following the BaxterLabs content rules. For each topic: How I hook (8 words max), dollar outcome, insider detail. Write all topics back to the content_ideas table in Supabase when complete.`,
  },
  {
    title: "Generate This Week's Posts",
    description: 'Get 3 SLAY-framework LinkedIn drafts for the week. Cowork delivers them to your Content Calendar automatically.',
    buttonColor: '#005454',
    prompt: `Run the Marketing Content Creation skill to generate this week's three LinkedIn posts.

Use the SLAY framework. Apply the 8-word hook rule. All posts must start with "How I." All posts must pass the ChatGPT test.

Story Bank entries to draw from this week:
[PASTE 2-3 STORY BANK ENTRIES FROM THE DASHBOARD before running]

Post types needed:
- Post 1: Operational Observation (heavy on specific numbers and ratios)
- Post 2: Founder Journey or Client Pattern (full narrative SLAY arc)
- Post 3: Industry Data or Trend (current professional services data through George's diagnostic lens)

Self-evaluate each post against the 10-point quality checklist before delivering. Include scores in your output. Write all three drafts to content_posts table in Supabase as type=linkedin, status=draft, with quality scores.`,
  },
  {
    title: 'Score This Post',
    description: 'Paste a draft post and get a quality score with specific fixes. Use before scheduling any post.',
    buttonColor: '#D4A843',
    prompt: `Run the content-strategy command in score mode.

Post draft to evaluate:
[PASTE YOUR POST DRAFT HERE]

Score against the 10-point BaxterLabs quality framework. Total out of 10. For any 0, write exactly what is wrong and how to fix it in one sentence. Rewrite the weakest section showing the improved version side by side with the original.`,
  },
  {
    title: 'Mine a Story From This',
    description: 'Turn a call transcript, conversation, or rough note into a Story Bank entry. Paste your raw material after the prompt.',
    buttonColor: '#66151C',
    prompt: `Run the content-strategy command in story mining mode.

Raw material to mine:
[PASTE TRANSCRIPT EXCERPT, SITUATION DESCRIPTION, OR ROUGH NOTE HERE]

Extract:
- Story arc (what happened, what was discovered, what changed)
- Lesson (one clear insight the reader can apply)
- "How I" or "The day I" hook — 8 words or fewer
- Dollar connection (financial outcome at stake)
- SLAY outline (4 bullet points, one per letter)

Anonymize any company names — replace with generic descriptors.
Write the entry to the story_bank table in Supabase.
Confirm entry ID and category assigned.`,
  },
  {
    title: 'Find My Authority Jacking Angles',
    description: "Paste a LinkedIn post or topic and get 3 substantive comment angles that build visibility with the poster's audience.",
    buttonColor: '#66151C',
    prompt: `I need substantive comment angles for a LinkedIn post I want to engage with.

My positioning: George DeVries, Managing Partner, BaxterLabs Advisory. I help $5M–$50M professional service firms find hidden profit leaks through 14-day financial diagnostics. My background is in multi-location operations and capital raises — I have been on the inside of P&Ls at the exact scale these firms operate at.

The post I want to comment on:
[PASTE THE LINKEDIN POST OR DESCRIBE THE TOPIC HERE]

Provide 3 comment options, each from a different angle:
Option 1: Add a specific financial ratio or data point they didn't mention
Option 2: Share a specific operational pattern this reminds me of
Option 3: Ask a question that shows sophisticated understanding of the topic

Rules for all comments:
- 2-4 sentences maximum
- Conversational, not salesy
- No mention of BaxterLabs unless it fits completely naturally
- Must add genuine value that the poster and their audience would engage with
- Written as if George typed it himself

Also tell me: why is this post a good authority jacking opportunity and how does the likely audience overlap with my ICP?`,
  },
  {
    title: 'Write a Blog Post From This LinkedIn Post',
    description: 'Expand a finished LinkedIn post into a 600-800 word blog post. Cowork writes it directly to your Blog Post Manager.',
    buttonColor: '#2D6A4F',
    prompt: `Run the content-strategy blog-expand command.

LinkedIn post to expand:
[PASTE THE FINISHED LINKEDIN POST HERE]

Expand into a 600-800 word blog post with:
- SEO-friendly H1 title (different from the LinkedIn hook, includes a keyword a professional service firm CEO might search for)
- Introduction paragraph leading with the core insight
- 3-4 body sections with H2 headings, each adding depth beyond the LinkedIn post
- Specific examples, ratios, and data throughout
- Conclusion paragraph synthesizing the main lesson
- CTA: "If this pattern sounds familiar in your firm, BaxterLabs Advisory conducts 14-day profit diagnostics for professional service firms in the $5M–$50M range. Learn more at baxterlabs.ai."

Write the completed blog post to the content_posts table in Supabase:
- type: 'blog'
- status: 'draft'
- title: [SEO title]
- body: [full post in markdown]
- seo_title: [same as title, max 60 chars]
- seo_description: [155-char summary for search results]
- blog_slug: [auto-generated from title]

Confirm write-back, blog post ID, and estimated word count.`,
  },
  {
    title: 'Write a Post From a News Story',
    description: 'Paste a news article link or excerpt and get a LinkedIn post that applies your diagnostic lens to the story. The article URL renders as a rich preview card in the post.',
    buttonColor: '#2D6A4F',
    prompt: `I need to write a LinkedIn post responding to a news article.

Article details:
Headline: [PASTE ARTICLE HEADLINE]
Source: [SOURCE PUBLICATION]
URL: [PASTE ARTICLE URL]
Excerpt: [PASTE KEY EXCERPT OR SUMMARY]

My positioning: George DeVries, Managing Partner, BaxterLabs Advisory.
I help $5M–$50M professional service firms find hidden profit leaks
through 14-day financial diagnostics. My background is in
multi-location operations and capital raises — I have been on the
inside of P&Ls at the exact scale these firms operate at.

Write a LinkedIn post that:
1. Opens with a "How I" or "The day I" hook — 8 words or fewer
2. Connects this news story to a specific profit-leak pattern
   that $5M–$50M professional service firm CEOs are experiencing
   right now
3. Adds a diagnostic insight this article didn't include —
   something only someone who has been inside these firms would know
4. Ends with a "You" section pointing it back to the reader
5. Includes the article URL on its own line at the end of the post
   so LinkedIn renders it as a rich preview card
6. Follows the SLAY framework throughout
7. Passes the ChatGPT test — must contain at least one specific
   number, ratio, or operational detail from George's background

After writing the post:
- Score it against the 10-point BaxterLabs quality checklist
- If any item scores 0, rewrite that section before delivering
- Write the final post to content_posts table in Supabase:
  type='linkedin', status='draft', title=[hook line], body=[full post]
- Confirm post ID and quality score`,
  },
]

export default function ContentCommands() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyCommand = async (index: number) => {
    await navigator.clipboard.writeText(COMMANDS[index].prompt)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#66151C]">Content Commands</h1>
        <p className="text-sm text-[#2D3436]/60 mt-1">Copy commands to run in Cowork</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {COMMANDS.map((cmd, i) => (
          <div
            key={i}
            className="border border-gray-200 rounded-lg p-4 bg-white flex flex-col gap-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#2D3436]">{cmd.title}</p>
              <p className="text-xs text-[#2D3436]/60 mt-1 leading-relaxed">{cmd.description}</p>
            </div>
            <button
              onClick={() => copyCommand(i)}
              className="self-start inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-semibold text-white transition-colors mt-1"
              style={{ backgroundColor: copiedIndex === i ? '#2D3436' : cmd.buttonColor }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copiedIndex === i ? 'Copied! Paste into Cowork' : 'Copy Command'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
