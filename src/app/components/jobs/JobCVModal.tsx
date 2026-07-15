"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  X,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  ClipboardPaste,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Maximize2,
  Minimize2,
  Type,
  RotateCcw,
  Clock,
  MessageSquare,
} from "lucide-react";
import { getAllApplicants } from "@/app/api_handlers/api/job-applicants.api";
import {
  createCV,
  updateCV,
  updateCVSilent,
  getCVById,
  uploadCVAudio,
  getCVHistory,
  addCVHistoryEntry,
} from "@/app/api_handlers/api/job-cvs.api";
import { getAllJobs } from "@/app/api_handlers/api/sponsored-jobs.api";
import { timeAgo } from "@/app/utils/time";
import CVPreview, {
  CVData,
  CVExpItem,
  CVEduItem,
  CVProjectItem,
  CVFontSettings,
  DEFAULT_FONT_SETTINGS,
  FONT_SETTING_FIELDS,
  FONT_SETTING_GROUPS,
  FULL_MATCH_COLOR,
  PARTIAL_MATCH_COLOR,
  extractKeywords,
  highlightWords,
  stripHtml,
  TOKEN_REGEX,
} from "./CVPreview";
import LLMGeneratorPopup from "../llm/LLMGeneratorPopup";

// ─── Constants ───────────────────────────────────────────────────────────────

function formatLastSaved(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function CopyPromptBtn({
  rawDesc,
  jobTitle,
  savedId,
}: {
  rawDesc: string;
  jobTitle: string;
  savedId: number | null;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const cvUrl = savedId ? `${window.location.origin}/viewCV/${savedId}` : "";
    const prompt = `You are an expert CV reviewer, ATS specialist, and senior recruiter. Please review the CV${cvUrl ? ` at ${cvUrl}` : ""} and provide a detailed analysis covering all of the following:

## 1. ATS Scan
- Score how well this CV would pass ATS filters for the target role
- List keywords and phrases present that match the job
- List important missing keywords that should be added
- Flag any formatting issues that could cause ATS parsing failures

## 2. Recruiter Analysis
Analyse the CV as a senior recruiter would:
- First impressions and overall presentation
- Strongest selling points
- Red flags, gaps, or weaknesses
- How competitive this candidate appears vs typical applicants for this role

## 3. Missing Points
List any critical information, achievements, metrics, or sections that are absent or underdeveloped.

## 4. Skills Review
- **Add**: List supporting or complementary skills that should be added (and explain why)
- **Remove**: List skills that are irrelevant, outdated, or hurt the candidate's positioning
- **Reframe**: Any skills that need better context or stronger phrasing

## 5. Natural Language Check
If any section reads as AI-generated, overly formal, or generic:
- Quote the original text
- Explain what makes it sound unnatural
- Write an alternate version that sounds authentic and human while still being professional

## 6. Experience Bullets
For each role in the experience section:
- Critique existing bullets (vague language, missing metrics, weak verbs)
- Rewrite weak bullets with stronger, quantified, action-oriented alternatives
- Suggest additional bullets that would strengthen that role's impact

## 7. Summary & Headline
- Review the current CV headline and summary
- Identify what's weak or generic
- Write 2–3 alternate headline options
- Write 2–3 alternate summary paragraphs (varying tone: confident, results-focused, narrative)

---
**Target Job Title:** ${jobTitle || "(not specified)"}

**Job Description:**
${rawDesc || "(not provided)"}`;
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy Claude review prompt"
      className={`p-0.5 rounded transition-colors ${copied ? "text-teal-600" : "text-blue-400 hover:text-blue-700"}`}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

const JOB_TYPES = ["Remote", "Hybrid", "Onsite"];
const EXP_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const EXP_CUR_YEAR = new Date().getFullYear();
const EXP_YEARS = Array.from({ length: EXP_CUR_YEAR - 1984 }, (_, i) =>
  String(EXP_CUR_YEAR - i),
);
const JOB_NATURES = [
  "Full Time",
  "Freelance",
  "Contract",
  "Part Time",
  "Volunteer",
];

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Highlights ATS keyword matches inside a plain-text string by wrapping them
// in <mark> tags with a data-word attribute for hover lookup via event delegation.
function highlightPlainTextToHtml(
  text: string | undefined | null,
  keywords: Set<string>,
): string {
  if (!text) return "";
  if (keywords.size === 0) return escapeHtml(text);
  const splitRegex = new RegExp(`(${TOKEN_REGEX.source})`, "g");
  const parts = text.split(splitRegex);
  return parts
    .map((part) => {
      const norm = part.toLowerCase();
      if (norm.length >= 2 && keywords.has(norm)) {
        return `<mark data-word="${norm}" style="background-color:${FULL_MATCH_COLOR};padding:0 1px;border-radius:2px;color:#000;cursor:help;">${escapeHtml(part)}</mark>`;
      }
      return escapeHtml(part);
    })
    .join("");
}

// Adds a second pass of manual-search highlights (green) on top of already-highlighted HTML.
// Avoids touching content inside existing <mark> or <...> tags.
function applyManualHighlight(html: string, term: string): string {
  if (!term.trim()) return html;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  return html.replace(/(<[^>]+>)|([^<]+)/g, (_, tag, text) => {
    if (tag) return tag;
    return text.replace(
      re,
      '<mark class="manual-hl" style="background:#bbf7d0;color:#14532d;border-radius:3px;padding:1px 3px;font-weight:700;font-size:1.08em;box-shadow:0 0 0 1px #86efac;">$1</mark>',
    );
  });
}

// Highlights ATS keyword matches inside an HTML string without breaking existing
// tags — only text nodes (segments outside `<...>`) are scanned for matches.
function highlightHtmlString(
  html: string | undefined | null,
  keywords: Set<string>,
): string {
  if (!html) return "";
  if (keywords.size === 0) return html;
  const tagSplitRegex = /(<[^>]+>)/g;
  const tokenSplitRegex = new RegExp(`(${TOKEN_REGEX.source})`, "g");
  return html
    .split(tagSplitRegex)
    .map((segment) => {
      if (segment.startsWith("<")) return segment;
      return segment
        .split(tokenSplitRegex)
        .map((part) => {
          const norm = part.toLowerCase();
          if (norm.length >= 2 && keywords.has(norm)) {
            return `<mark data-word="${norm}" style="background-color:${FULL_MATCH_COLOR};padding:0 1px;border-radius:2px;color:#000;cursor:help;">${part}</mark>`;
          }
          return part;
        })
        .join("");
    })
    .join("");
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(
  jobTitle: string,
  jobDescription: string,
  numExperiences: number,
  linkedInTitles: string,
): string {
  return `You are an expert resume writer, ATS optimization specialist, and recruitment analyst.

Your task is to generate a complete ATS-optimized CV foundation from a Job Title, Job Description, and Number of Past Experiences.

The role may belong to ANY profession, including but not limited to:

* Software Engineering
* Accounting
* Finance
* Marketing
* Cyber Security
* Project Management
* Human Resources
* Sales
* Healthcare
* Operations
* Legal
* Education
* Engineering
* Data Science
* Product Management

Do not assume the role is technical unless the Job Description indicates it.

========================================
INPUTS
======

LinkedIn Titles:
${linkedInTitles}


Job Title:
${jobTitle}

Job Description:
${jobDescription}

Number Of Past Experiences:
${numExperiences}

========================================
PART 1 — ATS SKILLS EXTRACTION
==============================

Analyze the Job Title and Job Description.

Generate a structured Core Skills section organized into logical categories.

OBJECTIVE

Create an ATS-optimized, recruiter-friendly Core Skills section that mirrors how experienced professionals present their expertise.

The AI should intelligently determine both:

• the skill categories
• the skills belonging to each category

The categories must be derived from the Job Description and profession.

Do NOT assume the role is technical.

========================================
STEP 1 — EXTRACT ALL SKILLS
========================================

Extract all relevant:

• Technologies
• Frameworks
• Platforms
• Programming Languages
• Databases
• Cloud Providers
• Tools
• Methodologies
• Professional Competencies
• Engineering Practices
• Industry Knowledge
• Business Domains
• Certifications
• Regulations
• Processes

Prioritize explicit Job Description requirements.

========================================
STEP 2 — GROUP INTO CATEGORIES
========================================

Group related skills into meaningful categories.

Examples only:

Software Engineering

Front-End

Back-End

Mobile

Cloud

Cloud & DevOps

Infrastructure

Platform

Data

Databases

AI & Automation

Machine Learning

Testing

QA

Security

Architecture

Engineering Practices

Business Analysis

Accounting

Finance

Marketing

Project Management

Healthcare

Operations

Sales

Customer Success

Compliance

Legal

Education

Human Resources

The categories are NOT fixed.

Generate only the categories that genuinely improve readability.

Do not create unnecessary categories.

========================================
STEP 3 — POPULATE EACH CATEGORY
========================================

Populate each category using:

1. Explicit Job Description skills
2. Strongly implied skills
3. Small number of ATS-supporting skills

Do not invent unrelated technologies.

Do not keyword stuff.

Do not duplicate skills across categories.

========================================
CATEGORY RULES
========================================

• Maximum 6 categories.
• Minimum 3 categories when appropriate.
• Categories should contain between 3–8 skills.
• Order categories by importance for the target role.
• Order skills inside each category by relevance.
• Use concise skill names.
• Prefer widely recognized ATS terminology.

========================================
SKILL RULES
========================================

Include:

• Technologies
• Platforms
• Frameworks
• Languages
• Databases
• Cloud
• Engineering Practices
• Domain Knowledge
• Methodologies

Avoid:

• Leadership
• Communication
• Team Player
• Hard Working
• Results Driven
• Self Motivated
• Problem Solving
• Fast Learner

Avoid generic CV buzzwords.

========================================
RECRUITER REVIEW
========================================

The generated Core Skills section should look like it was written by an experienced professional.

Recruiters should immediately understand the candidate's expertise within 5 seconds.

ATS should extract every important keyword naturally.

========================================
VALIDATION
========================================

Before returning:

• Remove duplicates.
• Remove weak skills.
• Remove generic buzzwords.
• Ensure every category has a clear purpose.
• Ensure every skill directly supports the target role.
• Ensure categories are ordered by relevance.


========================================
PART 2 — PROFESSIONAL SUMMARY
=============================

Generate a professional CV summary.

OBJECTIVE

Create a concise, recruiter-friendly summary that establishes the candidate's seniority, specialization, and relevance to the target role while reinforcing ATS keyword coverage.

The summary should support ATS matching by naturally incorporating the most important Job Description terminology.

REQUIREMENTS

* Maximum 300 characters.
* Use the exact Job Title provided.
* Include the highest-priority technologies, competencies, domain knowledge, or professional capabilities from the Job Description.
* Naturally reinforce important ATS keywords that appear in the skills section.
* Clearly establish seniority and area of expertise.
* Focus on role-relevant experience and specialization.
* Use concise, professional language.
* Keep the tone factual, credible, and recruiter-friendly.
* Sound like a genuine CV written by an experienced professional.
* Avoid repeating the same keyword multiple times.

ATS OPTIMIZATION RULES

* Prioritize the most important Job Description keywords.
* Include 3–6 high-value ATS keywords naturally where appropriate.
* Use exact Job Description terminology when it improves ATS matching.
* Do not force keywords into unnatural sentences.
* Do not keyword stuff.
* Do not list skills in summary form.
* The summary should read naturally while improving ATS coverage.

AVOID

* Marketing language
* Self-promotional language
* Corporate buzzwords
* Generic filler statements
* AI-generated resume clichés

Do not use phrases such as:

* Proven track record
* Results-driven
* Ownership-driven
* Dynamic professional
* Strategic thinker
* Highly motivated
* Passionate professional
* Thought leader
* Innovative leader
* Business value creator

WRITING STYLE

The summary should answer:

1. What is this person?
2. What are they specialized in?
3. Why are they relevant to this role?

VALIDATION

Before generating the summary:

1. Confirm the Job Title is included.
2. Confirm 3–6 of the most important Job Description keywords are naturally represented.
3. Confirm the summary supports ATS matching without sounding keyword-stuffed.
4. Remove generic claims that could apply to any candidate.
5. Remove buzzwords and marketing language.
6. Ensure the summary reads naturally when placed at the top of a CV.


========================================
PART 3 — EXPERIENCE JOB TITLES
==============================

Generate the CV experience titles using the candidate's existing LinkedIn experience titles.

The LinkedIn titles are the source of truth and MUST remain the foundation of every generated experience title.

The objective is to improve ATS relevance while preserving consistency between the CV and LinkedIn.

========================================
INPUT
========================================

You will receive the candidate's LinkedIn experience titles in chronological order (most recent first).

Example:

experience1 = Senior Software Engineer
experience2 = Senior Software Engineer
experience3 = Lead Software Engineer
experience4 = Senior Software Engineer
experience5 = Senior Software Engineer
experience6 = Software Engineer
experience7 = Software Engineer

These titles represent the candidate's official career history.

========================================
RULES
========================================

1. NEVER replace the original LinkedIn title.

Incorrect:

Senior Backend Engineer

Backend Engineer

Product Engineer

React Developer

.NET Developer

DevOps Engineer

Correct:

Senior Software Engineer

Lead Software Engineer

Software Engineer

2. Preserve the original LinkedIn title exactly.

Never change:

• seniority
• wording
• career progression

3. You MAY append a concise engineering specialization inside parentheses ONLY when it genuinely improves ATS relevance for the target role.

Example:

Senior Software Engineer
↓

Senior Software Engineer (Backend)

4. The specialization must NEVER replace the original title.

The original LinkedIn title must always remain visible.

5. Apply a specialization ONLY to the most recent experience(s) that are directly relevant.

Normally:
• first experience
• first two experiences

Maximum:
• first three experiences

Older experiences should normally remain unchanged.

6. Do NOT append a specialization to every experience.

A CV where every experience contains a specialization appears artificial and less credible.

7. Determine the specialization from BOTH the Job Description and the Job Title.

Analyze:

• responsibilities
• required technologies
• engineering domain
• day-to-day work

Do NOT rely only on the Job Title.

Example:

Job Title:
Senior .NET Developer

If the Job Description focuses on backend APIs:

Senior Software Engineer (Backend)

If the Job Description focuses on Blazor and ASP.NET:

Senior Software Engineer (Full Stack)

The specialization should represent the engineering domain rather than the programming language or framework.

8. Keep specializations concise.

Rules:

• Maximum 2 words.
• Use broad engineering domains.
• Avoid technology names.
• Avoid the word "Focused".
• Avoid unnecessary qualifiers.

Examples:

(Backend)

(Frontend)

(Full Stack)

(AI)

(Cloud)

(Cloud & DevOps)

(Data)

(Platform)

(Systems)

(Integration)

(Product)

(QA & Test)

(Security)

These are examples only.

Generate the specialization that best represents the engineering domain described in the Job Description.

9. Never create technology-specific specializations.

Incorrect:

(Node.js)

(.NET)

(Java)

(React)

(Python)

(AWS)

(Kubernetes)

Correct:

(Backend)

(Frontend)

(Full Stack)

(Cloud)

(AI)

10. If no specialization meaningfully improves ATS matching, leave the title unchanged.
========================================
CAREER PROGRESSION
========================================

Always preserve the candidate's original career progression.

Example:

experience1
Senior Software Engineer (Backend Focused)

experience2
Senior Software Engineer (Backend Focused)

experience3
Lead Software Engineer

experience4
Senior Software Engineer

experience5
Senior Software Engineer

experience6
Software Engineer

experience7
Software Engineer

========================================
OBJECTIVE
========================================

The generated titles should:

• remain fully consistent with LinkedIn
• improve ATS keyword relevance
• look natural to recruiters
• avoid rewriting employment history
• avoid exaggerated or invented job titles
• preserve credibility while tailoring the CV to the target role

========================================
PART 4 — EXPERIENCE CONTENT
========================================

Generate professional experience bullet points for each of the
{Number Of Past Experiences} experience(s), using:
- The Job Description
- The Generated Skills List
- The raw input details for that specific experience (role, company,
  duration, any notes provided about actual work)

----------------------------------------
BULLET COUNT (recency-weighted)
----------------------------------------

Order experiences chronologically by end date, most recent (or "Present")
first. Assign bullet counts by recency tier — do NOT apply a single flat
count to all experiences:

* Tier 1 — Most recent / current role:
  - 5 bullets if Number Of Past Experiences <= 3
  - 4 bullets if Number Of Past Experiences >= 4

* Tier 2 — Second most recent role: 4 bullets

* Tier 3 — Third most recent role and all older roles: 3 bullets each

* Never generate fewer than 2 bullets for a single role, even for short
  stints (<6 months).

Examples:
  - 2 total experiences  → 5, 4
  - 3 total experiences  → 5, 4, 3
  - 4 total experiences  → 5, 4, 3, 3
  - 5+ total experiences → 5, 4, 3, 3, 3, ...

Rationale: recruiters weight the most recent/current role most heavily, so
it should carry the most supporting detail and the most quantified proof
points. Older roles should stay lean regardless of total job count.

----------------------------------------
BULLET STRUCTURE (required for every bullet)
----------------------------------------

Each bullet must follow a problem/context → action → outcome shape:
1. A situation, goal, or problem (implicit or explicit)
2. A specific action this person took (a decision, a system built, a
   process changed)
3. A result or change that followed, expressed with quantification or
   scale (see METRICS POLICY below — this is a separate, additive
   requirement from Specificity, not the same thing)

A bullet that only states "Built/Developed/Implemented [tech] for [vague
goal]" with no specific detail and no outcome is NOT acceptable, even if
grammatically correct and keyword-rich.

----------------------------------------
SPECIFICITY REQUIREMENTS (about the ACTION, not the outcome)
----------------------------------------

* Each bullet must contain at least ONE concrete, specific detail about
  WHAT WAS DONE: a named system/feature type, a workflow, a constraint, a
  decision, or a technical scope indicator (e.g. "across development,
  test, and production environments," "using Azure DevOps and GitHub").
* IMPORTANT: satisfying this requirement (naming a system, tool, or
  environment) does NOT automatically satisfy the METRICS POLICY below.
  These are two separate, additive requirements. A bullet can correctly
  name three environments and still have zero quantification of outcome —
  that bullet is still incomplete.
* Each bullet must be DISTINGUISHABLE from every other bullet in this CV.
  No two bullets — within an experience or across experiences — may share
  the same verb-stack-noun sentence pattern.
* No bullet within the same experience block may start with the same verb
  as another bullet in that block. Vary sentence openings across the whole
  CV, not just the first word.

----------------------------------------
METRICS POLICY (about the OUTCOME, not the action)
----------------------------------------

PRIMARY RULE — read this first:
Every bullet MUST end with a quantified or scale-framed outcome that is
distinct from the technical scope named in the action part of the bullet.
This is not optional filler — a bullet without it is incomplete and must
be revised before output. Acceptable forms of quantification/scale
framing, in order of preference:
  (a) A real number, percentage, or time figure, ONLY if directly
      supported by the raw input notes.
  (b) A relative/comparative change: "reduced from a multi-step approval
      process to a single automated step," "cut a two-day manual task
      down to under an hour."
  (c) A scope-of-impact indicator that describes WHO or HOW MUCH was
      affected by the result (not the tool used to do the work): "for a
      12-person delivery team," "across 4 concurrent client programmes,"
      "for all new starters onboarded that quarter."
  (d) A before/after contrast in process or reliability: "eliminating a
      recurring manual handoff step," "removing the need for manual
      reconciliation between two systems."

WORKED EXAMPLES:
  BAD (specificity without quantification — do NOT do this):
    "Configured environment management frameworks for Microsoft 365 and
    Power Platform assets to strengthen release governance."
    → Why it fails: names real systems (specific), but "strengthen release
      governance" has no scale, comparison, or scope of effect. This is
      the exact failure pattern to avoid.
  GOOD (same underlying work, properly quantified):
    "Configured environment management frameworks for Microsoft 365 and
    Power Platform assets, replacing three separate manual sign-off steps
    with a single governed release gate."
    → Why it works: same technical specificity, PLUS a concrete
      before/after scope of impact.

  BAD:
    "Streamlined platform health monitoring by introducing advanced
    logging and alerting controls, which reduced response times for
    production incidents."
    → Why it fails: "reduced response times" has no comparison point or
      scope — reduced from what, for whom, how often.
  GOOD:
    "Introduced logging and alerting for platform health monitoring,
    cutting incident triage from a manual multi-team investigation down to
    a single automated alert path."
    → Why it works: specific mechanism (logging/alerting) plus a concrete
      before/after process contrast.

* Do NOT invent precise, unverifiable statistics (no fabricated %, $
  amounts, or exact counts that aren't supported by the raw input notes).
  When a hard number isn't available, use form (b), (c), or (d) above
  instead — these do not require fabrication, only reasonable inference
  from the described work.
* The "no plausible basis" exception is NARROW, not a default. It applies
  ONLY when the raw input notes describe a bullet with no team, process,
  frequency, or scope context whatsoever (e.g. a single vague phrase with
  no detail at all). If the raw notes mention any team, tool, process
  step, environment, or user group, a scope-of-impact or before/after
  frame (forms c or d) is always constructible — use one. Do not claim
  this exception simply because no hard number was given.
* BANNED FILLER PHRASES — do not use these or close variants as a
  substitute for real quantification: "strengthen," "elevate," "enhance,"
  "accelerate operational efficiency," "preserve system reliability,"
  "improve overall performance," "greatly improved," "significantly
  increased." If a draft bullet contains one of these phrases with nothing
  else after it, that bullet must be rewritten using forms (a)-(d) above.
* Tier 1 (most recent/current role) bullets get priority when allocating
  any available quantifiable detail from the raw input notes, since this
  role carries the most weight with recruiters. Do not let the strongest
  outcome framing land on an older, lower-priority role by default while
  the current role stays generic.

----------------------------------------
KEYWORD & SKILLS USAGE
----------------------------------------

* Each bullet should naturally reference 1–2 items from the Generated
  Skills List where genuinely relevant to that role's actual scope.
* Reference Job Description keywords/phrasing only where they plausibly
  describe real work for that role — do not lift JD phrases verbatim
  across multiple roles just to raise keyword density, and avoid copying
  a distinctive JD phrase (e.g. "technical escalation point") word-for-
  word — paraphrase it into the candidate's own voice.
* Keyword/skill inclusion must never come at the expense of the
  Specificity or Metrics requirements above. A specific, quantified bullet
  with fewer keywords is preferred over a generic bullet stuffed with JD
  language.
* Do not repeat the same JD phrase verbatim in more than one experience
  block.

----------------------------------------
LENGTH & FORMAT
----------------------------------------

* Each bullet must be under 180 characters.
* Plain text, no markdown, no bullet symbols in the string itself.
* Past roles use past tense; current role (if marked ongoing) uses past
  tense for completed work, present tense only if explicitly framed as
  ongoing.

----------------------------------------
CAREER PROGRESSION CHECK
----------------------------------------

Before finalizing, compare job titles across experiences in chronological
order.
* If a later (more recent) role has a clearly lower-seniority title than
  an earlier role (e.g. "Lead Engineer" followed later by "Software
  Engineer" with no indication of an intentional lateral move), do NOT
  silently generate bullets that ignore this.
* Instead, either:
  (a) keep the titles as provided by the user exactly as-is and add a
      "progression_flag" field in the output noting the discrepancy, or
  (b) if instructed to auto-correct titles, adjust only with a
      corresponding "title_adjusted" note — never silently alter without
      flagging.
* Do not fabricate a promotion narrative in the bullets to paper over a
  title regression.

----------------------------------------
REALISM CHECK
----------------------------------------

Each bullet must read as something a real engineer would write about real
work — specific enough that it couldn't be copy-pasted into an unrelated
CV for the same job title. If a bullet could apply to literally any
candidate applying to this job, rewrite it.

========================================
SELF-AUDIT PASS (mandatory second pass before output)
========================================

After drafting all bullets, re-read each one individually and check it
against this per-bullet test — do not skip this step:

  1. Does this bullet name a specific action/system/tool? (Specificity)
  2. Does this bullet ALSO contain a distinct outcome using forms
     (a)/(b)/(c)/(d) from the Metrics Policy — separate from the
     system named in step 1?
  3. Does this bullet contain any banned filler phrase with nothing
     concrete after it?

If any bullet fails check 2 or triggers check 3, REWRITE that bullet
before producing final output. Do not proceed to output with a bullet
that only passes check 1.

========================================
VALIDATION REQUIREMENTS
========================================

Before generating output, internally verify:
* Every bullet follows problem/context → action → outcome structure.
* Every bullet contains at least one concrete, specific detail (action).
* Every bullet contains a DISTINCT quantification/scale element (outcome),
  per the Self-Audit Pass — naming a system alone does not count.
* No bullet relies on a banned filler phrase without concrete backing.
* No two bullets (within or across experiences) share sentence structure
  or opening verb.
* No fabricated precise metrics exist anywhere.
* No distinctive JD phrase is copied verbatim in more than one experience,
  or copied word-for-word from the JD at all where a paraphrase is
  reasonable.
* Skills referenced are drawn only from the Generated Skills List, no
  duplicates.
* Summary contains important Job Description keywords.
* Job titles checked for logical career progression; discrepancies flagged
  per the Career Progression Check, not silently passed.
* Bullet counts match the recency-weighted tiering rules above, not a flat
  count applied uniformly.
* Tier 1 role received priority allocation of any usable quantifiable
  detail from the raw input notes.
* Output is valid JSON.
* No markdown, no explanations, no comments, no extra text.

========================================
PART 5 — CV HEADLINE
====================

Analyze the Job Title and Job Description.

Generate a single ATS-optimized CV headline.

OBJECTIVE

Create a concise, recruiter-friendly headline that immediately communicates the candidate's professional identity and primary specialization.

The headline should maximize ATS relevance while remaining natural, credible, and consistent with how recruiters search for candidates.

The headline should represent the role the candidate is applying for rather than simply repeating the employer's Job Title.

========================================
HEADLINE RULES
========================================

1. Generate ONE professional headline only.

Examples:

Senior Backend Engineer

Senior Software Engineer

Senior Frontend Engineer

Senior Full Stack Engineer

Senior AI Solutions Engineer

Cloud Platform Engineer

Lead Software Engineer

Data Engineer

Software Engineer

2. Determine the most appropriate headline by analyzing BOTH:

• Job Title
• Job Description

3. Prefer widely recognized industry job titles.

4. Do NOT invent uncommon or company-specific titles.

5. Do NOT simply copy the Job Title.

Example

Job Title:
Backend Product Engineer

Preferred Headline:
Backend Software Engineer

6. Keep the headline concise.

Maximum:
6 words

7. The headline should clearly communicate:

• Professional identity
• Primary engineering domain
• Seniority

8. Preserve realistic seniority.

Do not upgrade or downgrade the candidate's apparent level.

9. Use terminology recruiters commonly search for.

10. Do NOT include:

• technologies
• programming languages
• cloud providers
• certifications
• years of experience
• marketing language
• buzzwords

Those belong elsewhere in the CV.

11. The headline must sound natural on a professional resume.

========================================
VALIDATION
========================================

Before returning:

• Confirm it is a commonly recognized job title.
• Confirm it accurately reflects the Job Description.
• Confirm it improves ATS relevance.
• Confirm it is concise.
• Confirm it is suitable as the primary headline immediately below the candidate's name.

========================================
ADDITIONAL RULES — TECHNOLOGY TIMELINE
========================================

Generative AI, LLMs, MCP, and similar AI-product technologies became
commercially mainstream from approximately 2023 onward. Apply this
constraint strictly:

* Bullets referencing AI/LLM-powered features, AI-assisted automation,
  prompt-based workflows, or MCP-style integrations may ONLY appear in
  experience entries whose date range starts in 2023 or later.
* Do NOT generate AI/LLM-related bullets for any experience ending before
  2023, even if the Job Description or Skills List is AI-heavy. Older
  roles must draw on the skills/keywords that were realistic for their
  time period.
* If the Job Description is AI-focused but the candidate's only AI-relevant
  experience is the most recent role, concentrate AI-specific evidence
  there. Do not compensate by retrofitting AI language into earlier roles.
* "Generated Skills List" items related to AI/LLM/automation should be
  treated as primarily applicable to the most recent 1-2 experiences only,
  unless the user's raw input explicitly states an earlier role involved
  AI/ML work (e.g. pre-LLM data science, classic ML, NLP).
* For the most recent experience (if it falls in 2023+), include at least
  ONE bullet that gives concrete evidence of AI-adjacent work if the role
  notes or Job Description support it — a specific automation, document
  workflow, or pipeline — not just a label like "AI-powered products."

========================================
ADDITIONAL RULES — HEADLINE / TITLE ALIGNMENT
========================================

* The CV headline (top-of-page title) must be directionally consistent
  with the most recent experience's job title:
  - Specialization in the headline (e.g. "Backend," "Full-Stack," "Frontend")
    must match the specialization evident in the most recent role's bullets.
  - Seniority implied in the headline must not exceed the seniority of the
    most recent job title unless the user explicitly requests a target-role
    headline that differs from current title (e.g. applying up a level).
* If the user provides a target Job Description with a specific role
  framing (e.g. "Full-Stack Product Engineer"), the headline may adopt
  that framing ONLY if the candidate's actual experience (per the bullets
  generated) substantively supports it. Do not let the headline overstate
  beyond what the bullets demonstrate.
* Flag (via a "headline_check" field in output) any case where the
  headline's specialization or seniority diverges from the most recent
  role's title, so the user can confirm intent rather than have it pass
  silently.

========================================
ADDITIONAL RULES — OUTCOME COMPLETENESS
========================================

* A bullet that ends on the action with no resulting effect (e.g. "...to
  support X requirements without disrupting existing users") is incomplete.
  "Did not break something" is not an outcome.
* Every bullet must end on either:
  (a) a concrete result (what changed, what became possible, what was
      reduced/enabled/unblocked), or
  (b) if no real outcome is known from the input, a sharper description of
      the action's scope/difficulty instead of a non-outcome filler clause.
* Do not use negative-only outcome framing ("without breaking X," "without
  disrupting Y," "without downtime") as the SOLE outcome of a bullet. It
  may supplement a real outcome but cannot replace one.

========================================
UPDATED VALIDATION REQUIREMENTS
========================================
Before generating output, internally verify (in addition to prior checks):
* No AI/LLM/MCP-related content appears in any experience dated before 2023.
* Most recent experience (if 2023+) contains at least one concrete AI-adjacent
  bullet, if supported by input/JD.
* Headline specialization and seniority align with the most recent job title;
  divergence is flagged via "headline_check," not silently passed.
* No bullet ends solely on a negative/non-outcome clause.

========================================
OUTPUT FORMAT
=============

Return ONLY valid JSON — no markdown code blocks, no extra text.

{
  "cv_headline": "Senior Backend Engineer",
  "core_skills": [
    {
      "category": "Back-End",
      "skills": [
        "Node.js",
        "TypeScript",
        "REST API Development",
        "System Design",
        "Software Architecture"
      ]
    },
    {
      "category": "Cloud",
      "skills": [
        "Google Cloud Platform (GCP)",
        "PostgreSQL",
        "Terraform"
      ]
    },
    {
      "category": "Engineering Practices",
      "skills": [
        "Code Reviews",
        "Automated Testing",
        "Agile Development",
        "Software Delivery"
      ]
    }
  ]
  ,
  "summary": "Professional summary here",
  "experience_titles": {
    "experience1": "Most Recent Job Title",
    "experience2": "Previous Job Title",
    "experience3": "Earlier Job Title"
  },
  "experience_content": {
    "experience1": [
      { "point": "Bullet point one" },
      { "point": "Bullet point two" },
      { "point": "Bullet point three" },
      { "point": "Bullet point four" }
    ],
    "experience2": [
      { "point": "Bullet point one" },
      { "point": "Bullet point two" },
      { "point": "Bullet point three" },
      { "point": "Bullet point four" }
    ]
  }
}`;
}

// ─── Expected JSON format (shown on error) ───────────────────────────────────

const EXPECTED_FORMAT = `{
  "core_skills": [
    { "category": "Back-End", "skills": ["Node.js", "TypeScript"] },
    { "category": "Cloud", "skills": ["AWS", "Terraform"] }
  ],
  "summary": "Professional summary here",
  "experience_titles": {
    "experience1": "Most Recent Job Title",
    "experience2": "Previous Job Title"
  },
  "experience_content": {
    "experience1": [
      { "point": "Bullet point" },
      { "point": "Bullet point" }
    ],
    "experience2": [
      { "point": "Bullet point" },
      { "point": "Bullet point" }
    ]
  }
}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function filterByYears(experiences: any[], years: number): any[] {
  if (!years || years <= 0 || !experiences?.length) return [];
  const cutoffYear = new Date().getFullYear() - years;
  return [...experiences]
    .filter((exp) => {
      if (!exp.from_date) return false;
      if (exp.currently_working) return true;
      const toYear = exp.to_date
        ? parseInt(exp.to_date.split("-")[0])
        : parseInt(exp.from_date.split("-")[0]);
      return toYear >= cutoffYear;
    })
    .sort((a, b) => (b.from_date ?? "").localeCompare(a.from_date ?? ""));
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  job?: any;
  cv?: any;
  onClose: () => void;
  onSaved?: () => void;
}

const CV_STATUSES = [
  { value: "cv_created", label: "CV Created" },
  { value: "cv_ready_for_edit", label: "Ready for Edit" },
  { value: "cv_ready_for_review", label: "Ready for Review" },
  { value: "cv_reviewed", label: "CV Reviewed" },
  { value: "cv_sent", label: "CV Sent" },
  { value: "cv_required_qa", label: "CV Required Q/A" },
  { value: "cv_qa_review_required", label: "CV Q/A Review Required" },
  { value: "cv_qa_review_done", label: "CV Q/A Review Done" },
] as const;

const CV_STATUS_COLORS: Record<string, string> = {
  cv_created: "bg-gray-100 text-gray-600",
  cv_ready_for_edit: "bg-sky-100 text-sky-700",
  cv_ready_for_review: "bg-blue-100 text-blue-700",
  cv_reviewed: "bg-yellow-100 text-yellow-700",
  cv_sent: "bg-green-100 text-green-700",
  cv_required_qa: "bg-purple-100 text-purple-700",
  cv_qa_review_required: "bg-orange-100 text-orange-700",
  cv_qa_review_done: "bg-teal-100 text-teal-700",
};

const INIT_FORM = {
  cv_title: "",
  applicant_name: "",
  headline: "",
  target_job_title: "",
  job_description: "",
  raw_description: "",
  job_link: "",
  organization_name: "",
  sponsorship: "",
  location: "",
  selected_email: "",
  selected_phone: "",
  linkedin: "",
  github: "",
  summary: "",
  skills: "",
  years_of_experience: 5,
  status: "cv_created",
  edit_notes: "",
  edit_audio_url: "",
};

const inputCls =
  "w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-gray-500 bg-white";
const labelCls = "text-[0.8em] text-gray-400 uppercase font-medium mb-0.5 block";

const EMPTY_PROJECT: CVProjectItem = {
  title: "",
  description: "",
  link: "",
  technologies: "",
  start_date: "",
  end_date: "",
  ongoing: false,
};

const EMPTY_EDU: CVEduItem = {
  university_name: "",
  degree_title: "",
  start_date: "",
  end_date: "",
};

function EditableTitle({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  if (editing)
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onChange(draft);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="text-xs font-semibold text-gray-800 border-none outline-none bg-transparent w-40 shrink-0 border-b border-gray-400"
      />
    );
  return (
    <span
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="Click to rename"
      className="text-xs font-semibold text-gray-800 cursor-text rounded px-1 hover:bg-gray-100 transition-colors whitespace-nowrap"
    >
      {value || <span className="text-gray-400 font-normal">CV Title</span>}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function JobCVModal({ job, cv, onClose, onSaved }: Props) {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(true);
  const [selectedApplicantId, setSelectedApplicantId] = useState<number | "">(
    "",
  );
  const [selectedApplicant, setSelectedApplicant] = useState<any | null>(null);
  const [form, setForm] = useState({ ...INIT_FORM });
  const [portfolios, setPortfolios] = useState<string[]>([]);
  const [applicantLocations, setApplicantLocations] = useState<string[]>([]);
  const [applicantEmails, setApplicantEmails] = useState<string[]>([]);
  const [applicantPhones, setApplicantPhones] = useState<string[]>([]);
  const [experienceItems, setExperienceItems] = useState<CVExpItem[]>([]);
  const [education, setEducation] = useState<CVEduItem[]>([]);
  const [projects, setProjects] = useState<CVProjectItem[]>([]);
  const [coreSkills, setCoreSkills] = useState<
    { category: string; skills: string[] }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [editFontSize, setEditFontSize] = useState<number>(() => {
    try { return Number(localStorage.getItem('cv_edit_font_size')) || 13 } catch { return 13 }
  });
  const changeEditFontSize = (delta: number) => {
    setEditFontSize(prev => {
      const next = Math.max(9, Math.min(22, prev + delta))
      try { localStorage.setItem('cv_edit_font_size', String(next)) } catch {}
      return next
    })
  };

  // Audio recording (for history notes)
  const [isRecording, setIsRecording] = useState(false)
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // History panel
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)
  const [historyEntries, setHistoryEntries] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyNote, setHistoryNote] = useState('')
  const [historyAudioUrl, setHistoryAudioUrl] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)

  // Unsaved changes guard
  const isDirtyRef = useRef(false)
  const [closeConfirmPending, setCloseConfirmPending] = useState(false)
  const closeAfterSaveRef = useRef(false)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' })
      audioChunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setIsUploadingAudio(true)
        try {
          const url = await uploadCVAudio(blob)
          if (url) setHistoryAudioUrl(url)
        } catch {}
        setIsUploadingAudio(false)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setIsRecording(true)
    } catch {}
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setIsRecording(false)
  }
  const isAdmin =
    typeof window !== "undefined" &&
    localStorage.getItem("userRole") === "admin";
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fontSettings, setFontSettings] = useState<CVFontSettings>({
    ...DEFAULT_FONT_SETTINGS,
  });
  const [showFontPanel, setShowFontPanel] = useState(false);

  // Prompt / AI state
  const [promptCopied, setPromptCopied] = useState(false);
  const [jsonPaste, setJsonPaste] = useState("");
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);
  const [jsonApplied, setJsonApplied] = useState(false);
  const [showExpectedFormat, setShowExpectedFormat] = useState(false);
  const [showLLMPopup, setShowLLMPopup] = useState(false);
  const [atsHighlightOn, setAtsHighlightOn] = useState(true);
  const [showFullScreenPreview, setShowFullScreenPreview] = useState(false);
  const [showAdditionalJobDetails, setShowAdditionalJobDetails] =
    useState(false);
  const [showEducation, setShowEducation] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [showJobContext, setShowJobContext] = useState(true);
  const [showContact, setShowContact] = useState(true);
  const [showCVContent, setShowCVContent] = useState(true);
  const [showCoreSkillsEditor, setShowCoreSkillsEditor] = useState(true);
  const [showLegacySkills, setShowLegacySkills] = useState(false);
  const [showJsonPaste, setShowJsonPaste] = useState(true);
  const [showWorkExperience, setShowWorkExperience] = useState(true);
  const [rawDescExpanded, setRawDescExpanded] = useState(false);
  const [atsManualSearch, setAtsManualSearch] = useState("");

  // ATS toggle on → expand the raw description overlay so user can see source + highlights together.
  useEffect(() => {
    setRawDescExpanded(atsHighlightOn);
  }, [atsHighlightOn]);
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null);

  // ATS mode: hover a keyword on CV → scroll to it in the raw desc overlay (no highlight on raw desc).
  useEffect(() => {
    if (!atsHighlightOn || !hoveredKeyword || !rawDescOverlayRef.current)
      return;
    const t = setTimeout(() => {
      const el = rawDescOverlayRef.current?.querySelector(
        `mark[data-word="${hoveredKeyword}"]`,
      );
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
    return () => clearTimeout(t);
  }, [hoveredKeyword, atsHighlightOn]);
  const fullScreenRef = useRef<HTMLDivElement>(null);
  const rawDescOverlayRef = useRef<HTMLDivElement>(null);

  // Manual search: auto-scroll to first green match whenever search term changes.
  useEffect(() => {
    if (!atsManualSearch.trim() || !rawDescOverlayRef.current) return;
    const t = setTimeout(() => {
      const el = rawDescOverlayRef.current?.querySelector(".manual-hl");
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 80);
    return () => clearTimeout(t);
  }, [atsManualSearch]);

  const atsManualMatchCount = useMemo(() => {
    if (!atsManualSearch.trim()) return 0;
    const re = new RegExp(
      atsManualSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "gi",
    );
    return (form.raw_description.match(re) ?? []).length;
  }, [atsManualSearch, form.raw_description]);

  // ── Prior CV submission history for this company ────────────────────────
  const [companySubmission, setCompanySubmission] = useState<{
    count: number;
    latest: string;
  } | null>(null);

  useEffect(() => {
    if (cv || !job?.company_id) return;
    getAllJobs({ company_id: job.company_id, cv_submitted: "true", limit: 50 })
      .then((res: any) => {
        const payload = res?.data ?? res;
        const rows: any[] = Array.isArray(payload?.data) ? payload.data : [];
        if (rows.length === 0) return;
        const latest = rows.reduce(
          (acc: string | null, r: any) =>
            r.cv_submitted_at && (!acc || r.cv_submitted_at > acc)
              ? r.cv_submitted_at
              : acc,
          null as string | null,
        );
        if (latest) setCompanySubmission({ count: rows.length, latest });
      })
      .catch(() => {});
  }, [cv, job?.company_id]);

  // ── Resizable left panel ─────────────────────────────────────────────────
  const [leftPanelWidth, setLeftPanelWidth] = useState(480);
  const resizingRef = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      setLeftPanelWidth(Math.min(900, Math.max(320, e.clientX)));
    };
    const onMouseUp = () => {
      resizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const startResizing = () => {
    resizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    if (showFullScreenPreview && fullScreenRef.current) {
      fullScreenRef.current.requestFullscreen?.().catch(() => {});
    }
  }, [showFullScreenPreview]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setShowFullScreenPreview(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const exitFullScreenPreview = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    setShowFullScreenPreview(false);
  };

  // ── Load applicants ──────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingApplicants(true);
    getAllApplicants({ limit: 200 })
      .then((res: any) => {
        const payload = res?.data ?? res;
        setApplicants(Array.isArray(payload?.data) ? payload.data : []);
      })
      .finally(() => setLoadingApplicants(false));
  }, []);

  // ── Pre-populate from existing CV ────────────────────────────────────────
  const populateFromData = (data: any) => {
    setSavedId(data.id ?? null);
    setForm({
      cv_title: data.cv_title ?? "",
      applicant_name: data.applicant_name ?? "",
      headline: data.headline ?? "",
      target_job_title: data.target_job_title ?? "",
      job_description: data.job_description ?? "",
      raw_description: data.raw_description ?? "",
      job_link: data.job_link ?? "",
      organization_name: data.organization_name ?? "",
      sponsorship: data.sponsorship ?? "",
      location: data.location ?? "",
      selected_email: data.selected_email ?? "",
      selected_phone: data.selected_phone ?? "",
      linkedin: data.linkedin ?? "",
      github: data.github ?? "",
      summary: data.summary ?? "",
      skills: data.skills ?? "",
      years_of_experience: data.years_of_experience ?? 5,
      status: data.status ?? "cv_created",
      edit_notes: data.edit_notes ?? "",
      edit_audio_url: data.edit_audio_url ?? "",
    });
    setPortfolios(data.portfolios ?? []);
    setExperienceItems(data.experience_items ?? []);
    setEducation(data.education ?? []);
    setProjects(data.projects ?? []);
    setCoreSkills(data.core_skills ?? []);
    setFontSettings({ ...DEFAULT_FONT_SETTINGS, ...(data.font_settings ?? {}) });
    if (data.applicant_id) setSelectedApplicantId(data.applicant_id);
    isDirtyRef.current = false
  };

  useEffect(() => {
    if (cv) {
      if (cv.id) {
        // Fetch fresh data from DB so we never edit stale cached data
        getCVById(cv.id).then((res: any) => {
          const fresh = res?.data ?? res;
          populateFromData(fresh ?? cv);
        }).catch(() => {
          // Fallback to prop data if fetch fails
          populateFromData(cv);
        });
      } else {
        populateFromData(cv);
      }
    } else if (job) {
      setForm((f) => ({
        ...f,
        cv_title: job.job_title ?? "",
        target_job_title: job.job_title ?? "",
        job_description: job.job_complete_description ?? "",
        raw_description: job.raw_description ?? "",
        job_link: job.link ?? "",
        organization_name: job.company_name ?? "",
        sponsorship: job.is_job_sponsored ?? "",
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cv?.id, job]);

  // ── Build experience items from applicant + years ────────────────────────
  const buildExpItems = useCallback(
    (applicant: any, years: number, existing: CVExpItem[]): CVExpItem[] => {
      const filtered = filterByYears(applicant.experience ?? [], years);
      return filtered.map((exp) => {
        const prev = existing.find(
          (e) =>
            e.designation === exp.designation &&
            e.company_name === exp.company_name,
        );
        return {
          designation: exp.designation ?? "",
          company_name: exp.company_name ?? "",
          from_date: exp.from_date ?? "",
          to_date: exp.to_date ?? null,
          currently_working: Boolean(exp.currently_working),
          job_type: prev?.job_type ?? exp.job_type ?? "",
          show_job_type:
            prev !== undefined
              ? Boolean(prev.show_job_type)
              : Boolean(exp.show_job_type),
          job_nature: prev?.job_nature ?? exp.job_nature ?? "",
          show_job_nature:
            prev !== undefined
              ? Boolean(prev.show_job_nature)
              : Boolean(exp.show_job_nature),
          ai_title: prev?.ai_title,
          use_ai_title: prev?.use_ai_title ?? false,
          bullets: prev?.bullets?.length ? prev.bullets : ["", "", "", ""],
        };
      });
    },
    [],
  );

  // ── Applicant selection effect ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedApplicantId || !applicants.length) return;
    const a = applicants.find((a) => a.id === selectedApplicantId);
    if (!a) return;
    setSelectedApplicant(a);
    setApplicantLocations(a.locations ?? []);
    setApplicantEmails(a.emails ?? []);
    setApplicantPhones(a.phone_numbers ?? []);
    if (!cv) {
      const locs: string[] = a.locations ?? [];
      setForm((f) => ({
        ...f,
        applicant_name: a.name ?? f.applicant_name,
        selected_email: (a.emails ?? [])[0] ?? f.selected_email,
        selected_phone: (a.phone_numbers ?? [])[0] ?? f.selected_phone,
        linkedin: a.linkedin ?? f.linkedin,
        github: a.github ?? f.github,
        location: locs[0] ?? f.location,
      }));
      setPortfolios(a.portfolios ?? []);
      setEducation(
        (a.education ?? []).map((e: any) => ({
          university_name: e.university_name ?? "",
          degree_title: e.degree_title ?? "",
          start_date: e.start_date ?? "",
          end_date: e.end_date ?? "",
        })),
      );
      setProjects(
        (a.projects ?? []).map((p: any) => ({
          title: p.title ?? "",
          description: p.description ?? "",
          link: p.link ?? "",
          technologies: p.technologies ?? "",
          start_date: p.start_date ?? "",
          end_date: p.end_date ?? "",
          ongoing: Boolean(p.ongoing),
        })),
      );
      setExperienceItems((prev) =>
        buildExpItems(a, form.years_of_experience, prev),
      );
    }
  }, [selectedApplicantId, applicants]);

  const handleYearsChange = (years: number) => {
    setForm((f) => ({ ...f, years_of_experience: years }));
    if (selectedApplicant) {
      setExperienceItems((prev) =>
        buildExpItems(selectedApplicant, years, prev),
      );
    }
  };

  const set = (field: string, val: any) => {
    isDirtyRef.current = true
    setForm((f) => ({ ...f, [field]: val }))
  };

  // ── Experience helpers ───────────────────────────────────────────────────
  const updateExpField = (expIdx: number, updates: Partial<CVExpItem>) =>
    setExperienceItems((items) =>
      items.map((item, i) => (i !== expIdx ? item : { ...item, ...updates })),
    );

  const setBullet = (expIdx: number, bulletIdx: number, val: string) =>
    setExperienceItems((items) =>
      items.map((item, i) =>
        i !== expIdx
          ? item
          : {
              ...item,
              bullets: (item.bullets ?? []).map((b, bi) =>
                bi === bulletIdx ? val : b,
              ),
            },
      ),
    );

  const addBullet = (expIdx: number) =>
    setExperienceItems((items) =>
      items.map((item, i) =>
        i !== expIdx
          ? item
          : { ...item, bullets: [...(item.bullets ?? []), ""] },
      ),
    );

  const removeBullet = (expIdx: number, bulletIdx: number) =>
    setExperienceItems((items) =>
      items.map((item, i) =>
        i !== expIdx
          ? item
          : {
              ...item,
              bullets: (item.bullets ?? []).filter((_, bi) => bi !== bulletIdx),
            },
      ),
    );

  // ── Education helpers ────────────────────────────────────────────────────
  const addEdu = () => setEducation((e) => [...e, { ...EMPTY_EDU }]);
  const updateEdu = (i: number, edu: CVEduItem) =>
    setEducation((e) => e.map((x, idx) => (idx === i ? edu : x)));
  const updateEduField = (i: number, field: string, value: string) =>
    setEducation((e) =>
      e.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)),
    );
  const removeEdu = (i: number) =>
    setEducation((e) => e.filter((_, idx) => idx !== i));

  // ── Project helpers ──────────────────────────────────────────────────────
  const addProject = () => setProjects((p) => [...p, { ...EMPTY_PROJECT }]);
  const updateProject = (i: number, proj: CVProjectItem) =>
    setProjects((p) => p.map((x, idx) => (idx === i ? proj : x)));
  const updateProjField = (i: number, field: string, value: any) =>
    setProjects((p) =>
      p.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)),
    );
  const removeProject = (i: number) =>
    setProjects((p) => p.filter((_, idx) => idx !== i));

  // ── Experience add/remove (for inline CV editing) ────────────────────────
  const addBlankExperience = () =>
    setExperienceItems((items) => [
      ...items,
      {
        designation: "",
        company_name: "",
        from_date: "",
        to_date: null,
        currently_working: false,
        bullets: [""],
      },
    ]);
  const removeExperience = (i: number) =>
    setExperienceItems((items) => items.filter((_, idx) => idx !== i));

  // ── Core Skills (categorized) helpers ────────────────────────────────────
  const addSkillCategory = () =>
    setCoreSkills((c) => [...c, { category: "", skills: [] }]);
  const updateSkillCategory = (
    i: number,
    updates: Partial<{ category: string; skills: string[] }>,
  ) =>
    setCoreSkills((c) =>
      c.map((g, idx) => (idx === i ? { ...g, ...updates } : g)),
    );
  const removeSkillCategory = (i: number) =>
    setCoreSkills((c) => c.filter((_, idx) => idx !== i));

  // ── Prompt ───────────────────────────────────────────────────────────────
  const canCopyPrompt =
    (form.cv_title.trim() || form.target_job_title.trim()) &&
    experienceItems.length > 0;

  // The applicant's own (non-AI) titles + date ranges for the experiences selected for this CV.
  const linkedInTitles = (() => {
    const MONTHS = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const fmt = (d: string | null | undefined) => {
      if (!d) return "";
      const [y, m] = d.split("-");
      const idx = parseInt(m) - 1;
      return `${MONTHS[idx] ?? m} ${y}`;
    };
    const lines = experienceItems
      .map((exp, i) => {
        if (!exp.designation) return null;
        const start = fmt(exp.from_date);
        const end = exp.currently_working ? "Present" : fmt(exp.to_date);
        const dateRange = start ? `${start} – ${end || "Present"}` : "";
        return `experience${i + 1} = ${exp.designation}${dateRange ? ` (${dateRange})` : ""}`;
      })
      .filter(Boolean);
    return lines.length ? lines.join("\n") : "(none)";
  })();

  const copyPrompt = () => {
    const prompt = buildPrompt(
      form.cv_title.trim() || form.target_job_title.trim(),
      form.raw_description.trim() || "(No job description provided)",
      experienceItems.length,
      linkedInTitles,
    );
    navigator.clipboard.writeText(prompt).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2500);
    });
  };

  // ── AI JSON apply ────────────────────────────────────────────────────────
  const applyJSON = () => {
    const errors: string[] = [];
    let parsed: any;
    try {
      parsed = JSON.parse(jsonPaste.trim());
    } catch {
      setJsonErrors([
        "Invalid JSON syntax — make sure you copied the complete JSON output from ChatGPT without any extra text or markdown.",
      ]);
      return;
    }

    if (!Array.isArray(parsed.core_skills) || parsed.core_skills.length === 0) {
      errors.push(
        '"core_skills" must be a non-empty array of { category, skills[] }',
      );
    } else if (
      parsed.core_skills.some(
        (g: any) =>
          typeof g.category !== "string" ||
          !g.category.trim() ||
          !Array.isArray(g.skills) ||
          g.skills.some((s: any) => typeof s !== "string"),
      )
    ) {
      errors.push(
        'Each "core_skills" item must have a "category" string and a "skills" array of strings',
      );
    }
    if (typeof parsed.summary !== "string" || !parsed.summary.trim())
      errors.push('"summary" must be a non-empty string');
    if (
      !parsed.experience_titles ||
      typeof parsed.experience_titles !== "object" ||
      Array.isArray(parsed.experience_titles)
    )
      errors.push(
        '"experience_titles" must be an object (e.g. { "experience1": "Job Title", ... })',
      );
    if (
      !parsed.experience_content ||
      typeof parsed.experience_content !== "object" ||
      Array.isArray(parsed.experience_content)
    )
      errors.push(
        '"experience_content" must be an object with experienceN arrays',
      );
    else {
      for (const key of Object.keys(parsed.experience_content)) {
        const arr = parsed.experience_content[key];
        if (!Array.isArray(arr))
          errors.push(`"experience_content.${key}" must be an array`);
        else if (arr.some((b: any) => typeof b.point !== "string"))
          errors.push(
            `"experience_content.${key}" items must each have a "point" string property`,
          );
      }
    }

    if (errors.length > 0) {
      setJsonErrors(errors);
      return;
    }

    if (parsed.core_skills) setCoreSkills(parsed.core_skills);
    if (parsed.cv_headline) set("headline", parsed.cv_headline);
    if (parsed.summary) set("summary", parsed.summary);

    setExperienceItems((items) =>
      items.map((item, i) => {
        const key = `experience${i + 1}`;
        const aiTitle: string | undefined = parsed.experience_titles?.[key];
        const aiContent: any[] = parsed.experience_content?.[key] ?? [];
        const bullets = aiContent
          .map((b: any) => b.point ?? "")
          .filter(Boolean);
        return {
          ...item,
          ai_title: aiTitle ?? item.ai_title,
          use_ai_title: !!aiTitle,
          bullets: bullets.length > 0 ? bullets : item.bullets,
        };
      }),
    );

    setJsonErrors([]);
    setJsonPaste("");
    setJsonApplied(true);
    setTimeout(() => setJsonApplied(false), 2500);
  };

  // ── CV preview data ──────────────────────────────────────────────────────
  const cvData: CVData = {
    applicant_name: form.applicant_name,
    headline: form.headline,
    location: form.location,
    selected_email: form.selected_email,
    selected_phone: form.selected_phone,
    linkedin: form.linkedin,
    github: form.github,
    portfolios,
    summary: form.summary,
    skills: form.skills,
    core_skills: coreSkills,
    experience_items: experienceItems,
    education,
    projects,
    raw_description: form.raw_description,
    description_html: form.job_description,
    organization_name: form.organization_name,
    sponsorship: form.sponsorship,
    job_link: form.job_link,
  };

  // ── Inline edit callbacks — wired to existing state setters ─────────────
  const cvEditCallbacks: import("./CVPreview").CVEditCallbacks = {
    name: (v) => set("applicant_name", v),
    headline: (v) => set("headline", v),
    summary: (v) => set("summary", v),
    location: (v) => set("location", v),
    email: (v) => set("selected_email", v),
    phone: (v) => set("selected_phone", v),
    linkedin: (v) => set("linkedin", v),
    github: (v) => set("github", v),
    skillsCategoryRename: (i, v) => updateSkillCategory(i, { category: v }),
    skillsCategorySkills: (i, skills) => updateSkillCategory(i, { skills }),
    skillsCategoryAdd: addSkillCategory,
    skillsCategoryDelete: (i) => {
      if (window.confirm("Remove this skill category?")) removeSkillCategory(i);
    },
    expField: (ei, field, v) => {
      if (field === "currently_working") {
        updateExpField(ei, {
          currently_working: Boolean(v),
          ...(v ? { to_date: null } : {}),
        });
      } else {
        updateExpField(ei, { [field]: v });
      }
    },
    expBulletEdit: (ei, bi, v) => setBullet(ei, bi, v),
    expBulletAdd: (ei) => addBullet(ei),
    expBulletDelete: (ei, bi) => {
      if (window.confirm("Delete this bullet point?")) removeBullet(ei, bi);
    },
    expAdd: addBlankExperience,
    expDelete: (i) => {
      if (window.confirm("Remove this experience entry?")) removeExperience(i);
    },
    eduField: (i, field, v) => updateEduField(i, field, v),
    eduAdd: addEdu,
    eduDelete: (i) => {
      if (window.confirm("Remove this education entry?")) removeEdu(i);
    },
    projField: (i, field, v) => updateProjField(i, field, v),
    projAdd: addProject,
    projDelete: (i) => {
      if (window.confirm("Remove this project?")) removeProject(i);
    },
  };

  // ── ATS keyword source tracking (raw_description vs job_description HTML) ──
  const rawDescKeywords = useMemo(
    () => extractKeywords(form.raw_description),
    [form.raw_description],
  );

  // Keywords extracted from the actual CV content (summary, skills, bullets, experience, education, projects).
  // Used in left-panel ATS mode to highlight which raw-description words are covered by the CV.
  const cvContentKeywords = useMemo(() => {
    const text = [
      form.applicant_name,
      form.headline,
      form.summary,
      form.skills,
      ...coreSkills.flatMap((g) => g.skills),
      ...experienceItems.flatMap((exp) => [
        exp.designation,
        exp.company_name,
        ...(exp.bullets ?? []),
      ]),
      ...education.flatMap((edu) => [edu.degree_title, edu.university_name]),
      ...projects.flatMap((p) => [
        p.title,
        p.description ?? "",
        p.technologies ?? "",
      ]),
    ]
      .filter(Boolean)
      .join(" ");
    return extractKeywords(text);
  }, [
    form.applicant_name,
    form.headline,
    form.summary,
    form.skills,
    coreSkills,
    experienceItems,
    education,
    projects,
  ]);

  const buildPayload = () => {
    const payload = { ...form };
    return {
      ...payload,
      job_id: job?.id ?? cv?.job_id ?? null,
      company_id: job?.company_id ?? cv?.company_id ?? null,
      applicant_id: selectedApplicantId || cv?.applicant_id || null,
      portfolios,
      experience_items: experienceItems,
      education,
      projects: projects.filter((p) => p.title.trim()),
      font_settings: fontSettings,
      core_skills: coreSkills.filter(
        (g) => g.category.trim() && g.skills.length > 0,
      ),
    };
  };

  const getCurrentUserId = () => {
    try { return localStorage.getItem('userId') || null } catch { return null }
  }

  const handleSave = async (openAfter = false) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaving(true);
    setSaveStatus("saving");
    try {
      const changedBy = getCurrentUserId()
      if (savedId) {
        await updateCV(savedId, { ...buildPayload(), _changed_by: changedBy });
        setLastSavedAt(new Date());
        setSaveStatus("saved");
        isDirtyRef.current = false
        onSaved?.();
        if (openAfter) window.open(`/viewCV/${savedId}`, "_blank");
        if (closeAfterSaveRef.current) { closeAfterSaveRef.current = false; onClose() }
      } else {
        const res: any = await createCV({ ...buildPayload(), _changed_by: changedBy });
        const newId = res?.data?.id ?? res?.id ?? null;
        setSavedId(newId);
        setLastSavedAt(new Date());
        setSaveStatus("saved");
        isDirtyRef.current = false
        onSaved?.();
        if (openAfter && newId) window.open(`/viewCV/${newId}`, "_blank");
        if (closeAfterSaveRef.current) { closeAfterSaveRef.current = false; onClose() }
      }
    } catch {
      setSaveStatus("idle");
    } finally {
      setSaving(false);
    }
  };

  // Auto-save 1.5 s after the last change. Works for both new and existing CVs.
  // New CVs auto-create once applicant_name is filled; existing CVs update silently.
  const buildPayloadRef = useRef(buildPayload);
  buildPayloadRef.current = buildPayload;
  const savedIdRef = useRef<number | null>(null);
  savedIdRef.current = savedId;
  useEffect(() => {
    if (!autoSaveEnabled) return;
    if (!form.applicant_name.trim()) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveStatus("idle");
    autoSaveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const currentSavedId = savedIdRef.current;
        if (currentSavedId) {
          await updateCVSilent(currentSavedId, { ...buildPayloadRef.current(), _changed_by: getCurrentUserId() });
        } else {
          const res: any = await createCV(buildPayloadRef.current());
          const newId = res?.data?.id ?? res?.id ?? null;
          if (newId) setSavedId(newId);
        }
        setLastSavedAt(new Date());
        setSaveStatus("saved");
        onSaved?.();
      } catch {
        setSaveStatus("idle");
      }
    }, 1500);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [
    autoSaveEnabled,
    form,
    coreSkills,
    experienceItems,
    education,
    projects,
    fontSettings,
    savedId,
  ]);

  const loadHistory = useCallback(async (cvId: number) => {
    setHistoryLoading(true)
    try {
      const res: any = await getCVHistory(cvId)
      const entries = res?.data ?? res ?? []
      setHistoryEntries(Array.isArray(entries) ? entries : [])
    } catch { setHistoryEntries([]) }
    finally { setHistoryLoading(false) }
  }, [])

  const toggleHistoryPanel = () => {
    const next = !showHistoryPanel
    setShowHistoryPanel(next)
    if (next && savedId) loadHistory(savedId)
  }

  const addHistoryNote = async () => {
    if (!savedId || (!historyNote.trim() && !historyAudioUrl)) return
    setIsAddingNote(true)
    try {
      await addCVHistoryEntry(savedId, {
        note: historyNote.trim() || undefined,
        audio_url: historyAudioUrl || undefined,
        changed_by: getCurrentUserId() || undefined,
      })
      setHistoryNote('')
      setHistoryAudioUrl('')
      await loadHistory(savedId)
    } catch {} finally { setIsAddingNote(false) }
  }

  const handleClose = () => {
    if (isDirtyRef.current && !autoSaveEnabled) {
      setCloseConfirmPending(true)
      return
    }
    onClose()
  }

  const CV_STATUS_LABELS: Record<string, string> = Object.fromEntries(
    CV_STATUSES.map(s => [s.value, s.label])
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 shrink-0 bg-white shadow-sm">
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-700 shrink-0 p-0.5"
        >
          <X size={15} />
        </button>

        {/* CV title with org + visa appended inline */}
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          <EditableTitle
            value={form.cv_title}
            onChange={(v) => set("cv_title", v)}
          />
          {(form.organization_name || form.sponsorship === "yes") && (
            <span className="text-green-600 font-semibold text-[10px] uppercase shrink-0">
              (
              {[
                form.organization_name,
                form.sponsorship === "yes" ? "VISA" : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              )
            </span>
          )}
        </div>

        {/* Applicant selector */}
        {loadingApplicants ? (
          <RefreshCw
            size={11}
            className="animate-spin text-gray-400 shrink-0"
          />
        ) : (
          <select
            value={selectedApplicantId}
            onChange={(e) =>
              setSelectedApplicantId(
                e.target.value ? Number(e.target.value) : "",
              )
            }
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none shrink-0 max-w-[160px]"
          >
            <option value="">— Applicant —</option>
            {applicants.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}

        {/* CV Status — admin only, saves immediately */}
        {isAdmin ? (
          <select
            value={form.status}
            onChange={(e) => {
              const newStatus = e.target.value;
              set("status", newStatus);
              if (savedId) {
                updateCVSilent(savedId, {
                  ...buildPayloadRef.current(),
                  status: newStatus,
                  _changed_by: getCurrentUserId(),
                }).then(() => { if (showHistoryPanel) loadHistory(savedId) }).catch(() => {});
              }
            }}
            className={`text-xs border rounded px-2 py-1 focus:outline-none shrink-0 font-medium ${CV_STATUS_COLORS[form.status] ?? "bg-gray-100 text-gray-600"}`}
          >
            {CV_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`text-xs border rounded px-2 py-1 shrink-0 font-medium ${CV_STATUS_COLORS[form.status] ?? "bg-gray-100 text-gray-600"}`}
          >
            {CV_STATUSES.find((s) => s.value === form.status)?.label ??
              form.status}
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Auto-save toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={e => {
                const v = e.target.checked
                setAutoSaveEnabled(v)
                try { localStorage.setItem('cv_autosave', String(v)) } catch {}
                if (!v && autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
              }}
              className="w-3 h-3 accent-indigo-600"
            />
            <span className="text-[10px] text-gray-500">Auto-save</span>
          </label>

          {/* Auto-save status */}
          <span
            className={`text-[10px] shrink-0 transition-colors ${
              saveStatus === "saving"
                ? "text-amber-500"
                : saveStatus === "saved"
                  ? "text-green-600"
                  : "text-gray-300"
            }`}
          >
            {saveStatus === "saving" && "● Saving…"}
            {saveStatus === "saved" &&
              lastSavedAt &&
              `✓ Saved ${formatLastSaved(lastSavedAt)}`}
            {saveStatus === "idle" &&
              lastSavedAt &&
              `✓ Saved ${formatLastSaved(lastSavedAt)}`}
          </span>
          {form.job_link && (
            <a
              href={form.job_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-500 hover:text-gray-800 hover:underline"
            >
              View Job <ExternalLink size={10} />
            </a>
          )}
          {savedId && (
            <a
              href={`/viewCV/${savedId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-blue-600 hover:underline"
            >
              View CV <ExternalLink size={10} />
            </a>
          )}
          {/* History toggle */}
          <button
            onClick={toggleHistoryPanel}
            title="Show status history &amp; notes"
            className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded border transition-colors ${
              showHistoryPanel
                ? "border-purple-400 bg-purple-50 text-purple-700"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Clock size={12} />
            History
          </button>

          <button
            onClick={() => setShowFontPanel((p) => !p)}
            title="Adjust font sizes"
            className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded border transition-colors ${
              showFontPanel
                ? "border-blue-400 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Type size={12} />
            Adjust Size
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={
              saving ||
              !form.applicant_name.trim() ||
              !form.raw_description.trim()
            }
            title={
              !form.raw_description.trim()
                ? "Job Description is required"
                : !form.applicant_name.trim()
                  ? "Applicant name is required"
                  : ""
            }
            className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={
              saving ||
              !form.applicant_name.trim() ||
              !form.raw_description.trim()
            }
            title={
              !form.raw_description.trim()
                ? "Job Description is required"
                : !form.applicant_name.trim()
                  ? "Applicant name is required"
                  : ""
            }
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ExternalLink size={11} />
            {saving ? "Saving…" : "Save & Open CV"}
          </button>
        </div>
      </div>

      {/* ── Font size adjustment panel ── */}
      {showFontPanel && (
        <div className="flex items-center gap-4 flex-wrap px-4 py-2 border-b border-gray-200 shrink-0 bg-blue-50/40">
          {FONT_SETTING_FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-0.5">
              <label
                className="text-[10px] text-gray-500 font-medium"
                title={f.hint}
              >
                {f.label}
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step={0.5}
                  min={6}
                  max={28}
                  value={fontSettings[f.key]}
                  onChange={(e) =>
                    setFontSettings((s) => ({
                      ...s,
                      [f.key]:
                        Number(e.target.value) || DEFAULT_FONT_SETTINGS[f.key],
                    }))
                  }
                  className="w-16 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gray-500 bg-white"
                />
                <span className="text-[10px] text-gray-400">pt</span>
              </div>
            </div>
          ))}
          <button
            onClick={() => setFontSettings({ ...DEFAULT_FONT_SETTINGS })}
            title="Reset to defaults"
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-1 mt-auto hover:bg-white"
          >
            <RotateCcw size={10} /> Reset
          </button>
        </div>
      )}

      {/* ── Prior submission warning ── */}
      {companySubmission && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-amber-200 shrink-0 bg-amber-50 text-[11px] text-amber-800">
          <span>
            ⚠️ Already submitted {companySubmission.count} CV
            {companySubmission.count > 1 ? "s" : ""} to{" "}
            <strong>{form.organization_name || "this company"}</strong> — most
            recently {timeAgo(companySubmission.latest)}
          </span>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: Form ── */}
        <div
          className={`shrink-0 relative ${rawDescExpanded ? "overflow-hidden" : "overflow-y-auto"}`}
          style={{ width: leftPanelWidth }}
        >
          {/* Full-panel expand overlay for Job Description */}
          {rawDescExpanded && (
            <div className="absolute inset-0 z-10 flex flex-col bg-white p-3 gap-2">
              {/* Header row */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={
                    labelCls +
                    " bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex-1 truncate"
                  }
                >
                  {atsHighlightOn
                    ? "Job Description — hover CV keyword to locate it here"
                    : "Job Description — hover keyword to highlight on CV"}
                </span>
                {/* Font size controls (expanded view) */}
                <div className="flex items-center gap-0.5 border border-blue-200 rounded px-0.5 bg-white shrink-0">
                  <button type="button" onClick={() => changeEditFontSize(-1)} disabled={editFontSize <= 9}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30 w-4 h-4 flex items-center justify-center text-xs font-bold leading-none">−</button>
                  <span className="text-[9px] text-gray-500 w-5 text-center select-none">{editFontSize}</span>
                  <button type="button" onClick={() => changeEditFontSize(1)} disabled={editFontSize >= 22}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30 w-4 h-4 flex items-center justify-center text-xs font-bold leading-none">+</button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRawDescExpanded(false);
                    setAtsManualSearch("");
                    if (atsHighlightOn) setAtsHighlightOn(false);
                  }}
                  className="text-blue-500 hover:text-blue-700 shrink-0"
                  title="Collapse"
                >
                  <Minimize2 size={13} />
                </button>
              </div>
              {/* Manual search input */}
              <div className="shrink-0 flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={atsManualSearch}
                    onChange={(e) => setAtsManualSearch(e.target.value)}
                    placeholder="Search & highlight in green…"
                    className="w-full border border-green-300 rounded px-2 py-1 text-[10.5px] focus:outline-none focus:border-green-500 pr-6"
                  />
                  {atsManualSearch && (
                    <button
                      onClick={() => setAtsManualSearch("")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
                {atsManualSearch.trim() && (
                  <span
                    className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${atsManualMatchCount > 0 ? "bg-green-100 text-green-700" : "bg-red-50 text-red-500"}`}
                  >
                    {atsManualMatchCount > 0
                      ? `${atsManualMatchCount} match${atsManualMatchCount !== 1 ? "es" : ""}`
                      : "no match"}
                  </span>
                )}
              </div>
              {/* Content */}
              {atsHighlightOn ? (
                <div
                  ref={rawDescOverlayRef}
                  className="flex-1 overflow-y-auto leading-relaxed whitespace-pre-wrap bg-blue-50 border border-blue-200 rounded p-3"
                  style={{ fontSize: editFontSize + 'px' }}
                  dangerouslySetInnerHTML={{
                    __html: applyManualHighlight(
                      highlightPlainTextToHtml(
                        form.raw_description,
                        hoveredKeyword ? new Set([hoveredKeyword]) : new Set(),
                      ) ||
                        '<span style="color:#aaa;font-style:italic">Empty</span>',
                      atsManualSearch,
                    ),
                  }}
                />
              ) : (
                <div
                  ref={rawDescOverlayRef}
                  className="flex-1 overflow-y-auto leading-relaxed whitespace-pre-wrap bg-blue-50 border border-blue-200 rounded p-3"
                  style={{ fontSize: editFontSize + 'px' }}
                  dangerouslySetInnerHTML={{
                    __html: applyManualHighlight(
                      highlightPlainTextToHtml(
                        form.raw_description,
                        cvContentKeywords,
                      ) ||
                        '<span style="color:#aaa;font-style:italic">Empty</span>',
                      atsManualSearch,
                    ),
                  }}
                  onMouseOver={(e) => {
                    const word = (e.target as HTMLElement).getAttribute?.(
                      "data-word",
                    );
                    if (word) setHoveredKeyword(word);
                  }}
                  onMouseLeave={() => setHoveredKeyword(null)}
                />
              )}
            </div>
          )}
          <div className="p-4 space-y-5">
            {/* Expand / collapse all sections */}
            <div className="flex items-center justify-end gap-2 -mb-2">
              <button
                type="button"
                onClick={() => {
                  setShowJobContext(true);
                  setShowContact(true);
                  setShowCVContent(true);
                  setShowWorkExperience(true);
                  setShowEducation(true);
                  setShowProjects(true);
                }}
                className="text-[10px] text-gray-400 hover:text-gray-700 underline"
              >
                Expand all
              </button>
              <span className="text-[10px] text-gray-300">|</span>
              <button
                type="button"
                onClick={() => {
                  setShowJobContext(false);
                  setShowContact(false);
                  setShowCVContent(false);
                  setShowWorkExperience(false);
                  setShowEducation(false);
                  setShowProjects(false);
                }}
                className="text-[10px] text-gray-400 hover:text-gray-700 underline"
              >
                Collapse all
              </button>
            </div>

            {/* Job Context */}
            <div className="space-y-2">
              <SectionHeader
                title="Job Context"
                collapsed={!showJobContext}
                onToggle={() => setShowJobContext((p) => !p)}
              />
              {showJobContext && (
                <>
                  <div>
                    <label
                      className={
                        labelCls +
                        " bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex items-center justify-between"
                      }
                    >
                      <span>Job Description (for CV) *</span>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <CopyPromptBtn
                          rawDesc={form.raw_description}
                          jobTitle={form.target_job_title}
                          savedId={savedId}
                        />
                        {/* Raw desc font size */}
                        <div className="flex items-center gap-0.5 border border-blue-200 rounded px-0.5 bg-white">
                          <button type="button" onClick={() => changeEditFontSize(-1)} disabled={editFontSize <= 9}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 w-4 h-4 flex items-center justify-center text-xs font-bold leading-none">−</button>
                          <span className="text-[9px] text-gray-500 w-5 text-center select-none">{editFontSize}</span>
                          <button type="button" onClick={() => changeEditFontSize(1)} disabled={editFontSize >= 22}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 w-4 h-4 flex items-center justify-center text-xs font-bold leading-none">+</button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAtsHighlightOn(false);
                            setRawDescExpanded(true);
                          }}
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${rawDescExpanded && !atsHighlightOn ? "bg-amber-100 border-amber-400 text-amber-700" : "bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100"}`}
                          title="Highlight CV keywords in this description"
                        >
                          ATS Keywords
                        </button>
                      </div>
                    </label>
                    <textarea
                      rows={5}
                      className={`${inputCls} resize-y bg-blue-50 border-blue-200`}
                      style={{ fontSize: editFontSize + 'px' }}
                      placeholder="Raw job description text for CV generation (required)…"
                      value={form.raw_description}
                      onChange={(e) => set("raw_description", e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowLLMPopup(true)}
                      disabled={!canCopyPrompt}
                      title={
                        !canCopyPrompt
                          ? "Fill Target Job Title and select an applicant first"
                          : "Generate with AI"
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors flex-1 justify-center
                                        ${
                                          canCopyPrompt
                                            ? "bg-purple-600 border-purple-600 text-white hover:bg-purple-700"
                                            : "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                                        }`}
                    >
                      <Sparkles size={12} />
                      Generate with AI
                    </button>
                    <button
                      onClick={copyPrompt}
                      disabled={!canCopyPrompt}
                      title={
                        !canCopyPrompt
                          ? "Fill Target Job Title and select an applicant first"
                          : "Copy AI prompt to clipboard"
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors flex-1 justify-center
                                        ${
                                          canCopyPrompt
                                            ? promptCopied
                                              ? "bg-green-50 border-green-300 text-green-700"
                                              : "bg-gray-800 border-gray-800 text-white hover:bg-gray-700"
                                            : "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                                        }`}
                    >
                      {promptCopied ? <Check size={12} /> : <Copy size={12} />}
                      {promptCopied ? "Copied" : "Copy Prompt"}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <SectionHeader
                title="Contact"
                collapsed={!showContact}
                onToggle={() => setShowContact((p) => !p)}
              />
              {showContact && (
                <>
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input
                      className={inputCls}
                      value={form.applicant_name}
                      onChange={(e) => set("applicant_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Headline</label>
                    <input
                      className={inputCls}
                      placeholder="e.g. Senior Software Engineer — Full-Stack Product Engineering"
                      value={form.headline}
                      onChange={(e) => set("headline", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Email</label>
                      {applicantEmails.length > 1 && (
                        <select
                          className={`${inputCls} mb-1`}
                          value={form.selected_email}
                          onChange={(e) =>
                            set("selected_email", e.target.value)
                          }
                        >
                          <option value="">— pick from applicant —</option>
                          {applicantEmails.map((e) => (
                            <option key={e} value={e}>
                              {e}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        className={inputCls}
                        placeholder="email@example.com"
                        value={form.selected_email}
                        onChange={(e) => set("selected_email", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Phone</label>
                      {applicantPhones.length > 1 && (
                        <select
                          className={`${inputCls} mb-1`}
                          value={form.selected_phone}
                          onChange={(e) =>
                            set("selected_phone", e.target.value)
                          }
                        >
                          <option value="">— pick from applicant —</option>
                          {applicantPhones.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        className={inputCls}
                        placeholder="+44 7700 900000"
                        value={form.selected_phone}
                        onChange={(e) => set("selected_phone", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Location</label>
                    {applicantLocations.length > 0 && (
                      <select
                        className={`${inputCls} mb-1`}
                        value={form.location}
                        onChange={(e) => set("location", e.target.value)}
                      >
                        <option value="">— pick from applicant —</option>
                        {applicantLocations.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      className={inputCls}
                      placeholder="e.g. Manchester, UK (or type custom)"
                      value={form.location}
                      onChange={(e) => set("location", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>LinkedIn</label>
                      <input
                        className={inputCls}
                        value={form.linkedin}
                        onChange={(e) => set("linkedin", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>GitHub</label>
                      <input
                        className={inputCls}
                        value={form.github}
                        onChange={(e) => set("github", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* CV Content */}
            <div className="space-y-2">
              <SectionHeader
                title="CV Content"
                collapsed={!showCVContent}
                onToggle={() => setShowCVContent((p) => !p)}
              />
              {showCVContent && (
                <>
                  <div>
                    <label className={labelCls}>Summary</label>
                    <textarea
                      rows={4}
                      className={`${inputCls} resize-y`}
                      placeholder="Brief professional summary…"
                      value={form.summary}
                      onChange={(e) => set("summary", e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <button
                        type="button"
                        onClick={() => setShowCoreSkillsEditor((p) => !p)}
                        className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-semibold hover:text-gray-600"
                      >
                        {showCoreSkillsEditor ? (
                          <ChevronUp size={11} />
                        ) : (
                          <ChevronDown size={11} />
                        )}
                        Core Skills
                      </button>
                      {showCoreSkillsEditor && (
                        <button
                          type="button"
                          onClick={addSkillCategory}
                          className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-800 border border-teal-200 rounded px-2 py-0.5"
                        >
                          <Plus size={9} /> Add Category
                        </button>
                      )}
                    </div>
                    {showCoreSkillsEditor && coreSkills.length === 0 && (
                      <p className="text-[10px] text-gray-400 italic text-center py-2">
                        No skill categories yet — e.g. "Front-End", "Back-End",
                        "Cloud"…
                      </p>
                    )}
                    {showCoreSkillsEditor && (
                      <div className="space-y-2">
                        {coreSkills.map((group, i) => (
                          <div
                            key={i}
                            className="border border-gray-200 rounded p-2 space-y-1.5"
                          >
                            <div className="flex items-center gap-1.5">
                              <input
                                className={`${inputCls} font-medium`}
                                placeholder="Category, e.g. Front-End"
                                value={group.category}
                                onChange={(e) =>
                                  updateSkillCategory(i, {
                                    category: e.target.value,
                                  })
                                }
                              />
                              <button
                                type="button"
                                onClick={() => removeSkillCategory(i)}
                                className="text-gray-300 hover:text-red-500 shrink-0"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              className={`${inputCls} resize-y`}
                              placeholder="TypeScript, Next.js, React…"
                              value={group.skills.join(", ")}
                              onChange={(e) =>
                                updateSkillCategory(i, {
                                  skills: e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowLegacySkills((p) => !p)}
                      className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-50 hover:bg-gray-100 text-[10px] text-gray-500 uppercase font-medium"
                    >
                      Legacy Skills (fallback if no categories)
                      {showLegacySkills ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                    </button>
                    {showLegacySkills && (
                      <div className="p-2">
                        <textarea
                          rows={2}
                          className={`${inputCls} resize-y`}
                          placeholder="Python, JavaScript, React, Node.js, AWS…"
                          value={form.skills}
                          onChange={(e) => set("skills", e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* AI JSON Paste */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                <button
                  type="button"
                  onClick={() => setShowJsonPaste((p) => !p)}
                  className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-semibold hover:text-gray-600"
                >
                  {showJsonPaste ? (
                    <ChevronUp size={11} />
                  ) : (
                    <ChevronDown size={11} />
                  )}
                  Paste AI Output
                </button>
                {jsonApplied && (
                  <span className="flex items-center gap-1 text-[10px] text-green-600">
                    <Check size={10} /> Applied successfully
                  </span>
                )}
              </div>
              {showJsonPaste && (
                <>
                  <textarea
                    rows={6}
                    className={`${inputCls} resize-y font-mono text-[10px] ${jsonErrors.length > 0 ? "border-red-300 bg-red-50" : ""}`}
                    placeholder={
                      "Paste JSON from ChatGPT here…\n\nExpected keys: skills, summary, experience_titles, experience_content"
                    }
                    value={jsonPaste}
                    onChange={(e) => {
                      setJsonPaste(e.target.value);
                      if (jsonErrors.length) setJsonErrors([]);
                    }}
                  />
                  <button
                    onClick={applyJSON}
                    disabled={!jsonPaste.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal-700 text-white rounded hover:bg-teal-800 disabled:opacity-40 w-full justify-center"
                  >
                    <ClipboardPaste size={12} /> Apply JSON to Fields
                  </button>

                  {jsonErrors.length > 0 && (
                    <div className="border border-red-200 rounded bg-red-50 p-3 space-y-2">
                      <div className="text-[10px] font-semibold text-red-700">
                        Validation errors:
                      </div>
                      <ul className="space-y-0.5">
                        {jsonErrors.map((e, i) => (
                          <li
                            key={i}
                            className="text-[10px] text-red-600 flex gap-1"
                          >
                            <span className="shrink-0">•</span> {e}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => setShowExpectedFormat((p) => !p)}
                        className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 mt-1"
                      >
                        {showExpectedFormat ? (
                          <ChevronUp size={10} />
                        ) : (
                          <ChevronDown size={10} />
                        )}
                        {showExpectedFormat ? "Hide" : "Show"} expected format
                      </button>
                      {showExpectedFormat && (
                        <pre className="text-[9px] bg-white border border-red-100 rounded p-2 overflow-x-auto text-gray-700 whitespace-pre-wrap">
                          {EXPECTED_FORMAT}
                        </pre>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Work Experience */}
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-1 mb-2">
                <button
                  type="button"
                  onClick={() => setShowWorkExperience((p) => !p)}
                  className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-semibold hover:text-gray-600"
                >
                  {showWorkExperience ? (
                    <ChevronUp size={11} />
                  ) : (
                    <ChevronDown size={11} />
                  )}
                  Work Experience ({experienceItems.length})
                </button>
              </div>
              {showWorkExperience && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div>
                      <label className={labelCls}>Years of experience</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none w-20 bg-white"
                        value={form.years_of_experience}
                        onChange={(e) =>
                          handleYearsChange(
                            Math.max(1, Math.min(30, Number(e.target.value))),
                          )
                        }
                      />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-3">
                      {experienceItems.length} role
                      {experienceItems.length !== 1 ? "s" : ""} matched
                    </div>
                  </div>

                  {experienceItems.length === 0 && (
                    <p className="text-[10px] text-gray-400 italic text-center py-3">
                      {selectedApplicant
                        ? "No experiences match this duration."
                        : "Select an applicant to load experiences."}
                    </p>
                  )}

                  <div className="space-y-3">
                    {experienceItems.map((exp, expIdx) => (
                      <ExperienceCard
                        key={expIdx}
                        exp={exp}
                        index={expIdx}
                        onUpdateField={(updates) =>
                          updateExpField(expIdx, updates)
                        }
                        onSetBullet={(bi, val) => setBullet(expIdx, bi, val)}
                        onAddBullet={() => addBullet(expIdx)}
                        onRemoveBullet={(bi) => removeBullet(expIdx, bi)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Education */}
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-1 mb-2">
                <button
                  type="button"
                  onClick={() => setShowEducation((p) => !p)}
                  className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-semibold hover:text-gray-600"
                >
                  {showEducation ? (
                    <ChevronUp size={11} />
                  ) : (
                    <ChevronDown size={11} />
                  )}
                  Education ({education.length})
                </button>
                <button
                  onClick={addEdu}
                  className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-800 border border-teal-200 rounded px-2 py-0.5"
                >
                  <Plus size={9} /> Add
                </button>
              </div>
              {showEducation && education.length === 0 && (
                <p className="text-[10px] text-gray-400 italic text-center py-2">
                  No education added.
                </p>
              )}
              {showEducation && (
                <div className="space-y-2">
                  {education.map((edu, i) => (
                    <div
                      key={i}
                      className="border border-gray-200 rounded p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 font-medium truncate">
                          {edu.degree_title ||
                            edu.university_name ||
                            `Education #${i + 1}`}
                        </span>
                        <button
                          onClick={() => removeEdu(i)}
                          className="text-gray-300 hover:text-red-500 shrink-0"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div>
                        <label className={labelCls}>
                          University / Institution
                        </label>
                        <input
                          className={inputCls}
                          value={edu.university_name}
                          placeholder="e.g. University of Manchester"
                          onChange={(e) =>
                            updateEdu(i, {
                              ...edu,
                              university_name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Degree Title</label>
                        <input
                          className={inputCls}
                          value={edu.degree_title}
                          placeholder="e.g. BSc Computer Science"
                          onChange={(e) =>
                            updateEdu(i, {
                              ...edu,
                              degree_title: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelCls}>Start Date</label>
                          <input
                            type="month"
                            className={inputCls}
                            value={edu.start_date ?? ""}
                            onChange={(e) =>
                              updateEdu(i, {
                                ...edu,
                                start_date: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className={labelCls}>End Date</label>
                          <input
                            type="month"
                            className={inputCls}
                            value={edu.end_date ?? ""}
                            onChange={(e) =>
                              updateEdu(i, { ...edu, end_date: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Projects */}
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-1 mb-2">
                <button
                  type="button"
                  onClick={() => setShowProjects((p) => !p)}
                  className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-semibold hover:text-gray-600"
                >
                  {showProjects ? (
                    <ChevronUp size={11} />
                  ) : (
                    <ChevronDown size={11} />
                  )}
                  Projects ({projects.length})
                </button>
                <button
                  onClick={addProject}
                  className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-800 border border-teal-200 rounded px-2 py-0.5"
                >
                  <Plus size={9} /> Add
                </button>
              </div>
              {showProjects && projects.length === 0 && (
                <p className="text-[10px] text-gray-400 italic text-center py-2">
                  No projects added.
                </p>
              )}
              {showProjects && (
                <div className="space-y-2">
                  {projects.map((proj, i) => (
                    <div
                      key={i}
                      className="border border-gray-200 rounded p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 font-medium truncate">
                          {proj.title || `Project #${i + 1}`}
                        </span>
                        <button
                          onClick={() => removeProject(i)}
                          className="text-gray-300 hover:text-red-500 shrink-0"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div>
                        <label className={labelCls}>Title *</label>
                        <input
                          className={inputCls}
                          value={proj.title}
                          placeholder="e.g. E-Commerce Platform"
                          onChange={(e) =>
                            updateProject(i, { ...proj, title: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Description</label>
                        <textarea
                          rows={2}
                          className={`${inputCls} resize-y`}
                          value={proj.description ?? ""}
                          placeholder="What you built and its impact…"
                          onChange={(e) =>
                            updateProject(i, {
                              ...proj,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelCls}>Link</label>
                          <input
                            className={inputCls}
                            value={proj.link ?? ""}
                            placeholder="https://github.com/…"
                            onChange={(e) =>
                              updateProject(i, {
                                ...proj,
                                link: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Technologies</label>
                          <input
                            className={inputCls}
                            value={proj.technologies ?? ""}
                            placeholder="React, Node.js…"
                            onChange={(e) =>
                              updateProject(i, {
                                ...proj,
                                technologies: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 items-end">
                        <div>
                          <label className={labelCls}>Start</label>
                          <input
                            type="month"
                            className={inputCls}
                            value={proj.start_date ?? ""}
                            onChange={(e) =>
                              updateProject(i, {
                                ...proj,
                                start_date: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className={labelCls}>End</label>
                          <input
                            type="month"
                            className={`${inputCls} ${proj.ongoing ? "opacity-40 bg-gray-100" : ""}`}
                            value={proj.end_date ?? ""}
                            disabled={proj.ongoing}
                            onChange={(e) =>
                              updateProject(i, {
                                ...proj,
                                end_date: e.target.value,
                              })
                            }
                          />
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-gray-700 pb-1">
                          <input
                            type="checkbox"
                            className="w-3 h-3"
                            checked={!!proj.ongoing}
                            onChange={(e) =>
                              updateProject(i, {
                                ...proj,
                                ongoing: e.target.checked,
                              })
                            }
                          />
                          Ongoing
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Drag handle ── */}
        <div
          onMouseDown={startResizing}
          className="w-1.5 shrink-0 cursor-col-resize bg-gray-200 hover:bg-blue-400 active:bg-blue-500 transition-colors"
        />

        {/* ── History Panel ── */}
        {showHistoryPanel && (
          <div className="w-72 shrink-0 border-l border-gray-200 flex flex-col bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 shrink-0 bg-gray-50">
              <Clock size={12} className="text-purple-500" />
              <span className="text-[11px] font-semibold text-gray-700 flex-1">Status History &amp; Notes</span>
              <button onClick={() => setShowHistoryPanel(false)} className="text-gray-300 hover:text-gray-600"><X size={12} /></button>
            </div>

            {/* Add note form */}
            <div className="border-b border-gray-100 p-3 space-y-2 shrink-0">
              <textarea
                value={historyNote}
                onChange={e => setHistoryNote(e.target.value)}
                placeholder="Add a note for this CV…"
                rows={3}
                className="w-full text-[11px] border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-purple-400 resize-none"
              />
              {/* Audio recording */}
              <div className="flex items-center gap-2 flex-wrap">
                {!isRecording ? (
                  <button type="button" onClick={startRecording}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
                    🎙 Record Audio
                  </button>
                ) : (
                  <button type="button" onClick={stopRecording}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-red-500 text-white rounded animate-pulse hover:bg-red-600">
                    ⏹ Stop
                  </button>
                )}
                {isUploadingAudio && <span className="text-[10px] text-purple-500 animate-pulse">Uploading…</span>}
              </div>
              {historyAudioUrl && (
                <div className="flex items-center gap-2">
                  <audio controls src={historyAudioUrl} className="h-7 flex-1 min-w-0" />
                  <button type="button" onClick={() => setHistoryAudioUrl('')} title="Remove" className="text-gray-300 hover:text-red-500">
                    <X size={11} />
                  </button>
                </div>
              )}
              <button
                onClick={addHistoryNote}
                disabled={isAddingNote || (!historyNote.trim() && !historyAudioUrl) || !savedId}
                className="w-full px-2 py-1.5 text-[10px] font-medium bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isAddingNote ? 'Adding…' : 'Add Note'}
              </button>
              {!savedId && <p className="text-[10px] text-gray-400 text-center">Save the CV first to add notes</p>}
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {historyLoading ? (
                <div className="flex items-center justify-center py-6"><RefreshCw size={14} className="animate-spin text-gray-300" /></div>
              ) : historyEntries.length === 0 ? (
                <p className="text-[10px] text-gray-400 text-center py-4">No history yet</p>
              ) : historyEntries.map((entry: any) => (
                <div key={entry.id} className="space-y-1">
                  {entry.event_type === 'status_change' ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {entry.from_status ? (
                        <>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${CV_STATUS_COLORS[entry.from_status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {CV_STATUS_LABELS[entry.from_status] ?? entry.from_status}
                          </span>
                          <span className="text-gray-400 text-[9px]">→</span>
                        </>
                      ) : null}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${CV_STATUS_COLORS[entry.to_status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {CV_STATUS_LABELS[entry.to_status] ?? entry.to_status}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <MessageSquare size={10} className="text-purple-400 shrink-0" />
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${CV_STATUS_COLORS[entry.to_status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {CV_STATUS_LABELS[entry.to_status] ?? entry.to_status}
                      </span>
                    </div>
                  )}
                  {entry.note && <p className="text-[11px] text-gray-700 leading-relaxed pl-1">{entry.note}</p>}
                  {entry.audio_url && <audio controls src={entry.audio_url} className="h-7 w-full" />}
                  <p className="text-[10px] text-gray-400">
                    {entry.changed_by ? <span className="font-medium text-gray-500">{entry.changed_by} · </span> : null}
                    {entry.createdAt ? timeAgo(entry.createdAt) : ''}
                  </p>
                  <div className="border-b border-gray-100" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Right: Preview ── */}
        <div className="flex-1 bg-gray-100 overflow-auto p-6 flex flex-col items-center">
          <div
            className="w-full flex items-center justify-center gap-2 mb-3"
            style={{ maxWidth: "680px" }}
          >
            <div className="text-[10px] text-gray-400 uppercase tracking-wide flex-1 text-center">
              Live Preview
            </div>
            <div className="flex items-center gap-2">
              <div className="group relative">
                <button
                  onClick={() => setAtsHighlightOn((p) => !p)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-colors ${
                    atsHighlightOn
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  ATS Keywords {atsHighlightOn ? "On" : "Off"}
                </button>
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded shadow-lg p-2 w-40 text-[10px] space-y-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded shrink-0"
                      style={{ backgroundColor: FULL_MATCH_COLOR }}
                    />
                    <span className="text-gray-600">Full match</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded shrink-0"
                      style={{ backgroundColor: PARTIAL_MATCH_COLOR }}
                    />
                    <span className="text-gray-600">Partial match</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowFullScreenPreview(true)}
                title="View full screen"
                className="flex items-center justify-center p-1.5 rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              >
                <Maximize2 size={12} />
              </button>
            </div>
          </div>
          <div
            className="bg-white shadow-lg w-full"
            style={{ maxWidth: "680px", minHeight: "940px" }}
          >
            <CVPreview
              data={cvData}
              // ATS on → CV highlights all raw_description keywords
              // Expand-only → CV highlights only the hovered keyword from raw desc panel
              highlightEnabled={
                atsHighlightOn || (rawDescExpanded && !!hoveredKeyword)
              }
              forceKeywords={
                !atsHighlightOn && rawDescExpanded && hoveredKeyword
                  ? new Set([hoveredKeyword])
                  : undefined
              }
              fontSettings={fontSettings}
              onSkillsReorder={(newSkills) => set("skills", newSkills)}
              onEdit={
                atsHighlightOn || !!hoveredKeyword ? undefined : cvEditCallbacks
              }
              onKeywordHover={atsHighlightOn ? setHoveredKeyword : undefined}
            />
          </div>
        </div>
      </div>

      {showFullScreenPreview && (
        <div
          ref={fullScreenRef}
          className="fixed inset-0 z-[60] bg-gray-100 flex flex-col"
        >
          <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white shadow-sm shrink-0">
            <button
              onClick={exitFullScreenPreview}
              className="text-gray-400 hover:text-gray-700 p-0.5"
            >
              <X size={18} />
            </button>
            <span className="text-xs font-semibold text-gray-700 flex-1">
              CV Preview — Full Screen
            </span>
            <div className="group relative">
              <button
                onClick={() => setAtsHighlightOn((p) => !p)}
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-colors ${
                  atsHighlightOn
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                ATS Keywords {atsHighlightOn ? "On" : "Off"}
              </button>
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded shadow-lg p-2 w-40 text-[10px] space-y-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity pointer-events-none">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded shrink-0"
                    style={{ backgroundColor: FULL_MATCH_COLOR }}
                  />
                  <span className="text-gray-600">Full match</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded shrink-0"
                    style={{ backgroundColor: PARTIAL_MATCH_COLOR }}
                  />
                  <span className="text-gray-600">Partial match</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-8 flex flex-col items-center">
            <div
              className="bg-white shadow-lg w-full"
              style={{ maxWidth: "900px", minHeight: "1200px" }}
            >
              <CVPreview
                data={cvData}
                highlightEnabled={atsHighlightOn}
                fontSettings={fontSettings}
                onSkillsReorder={(newSkills) => set("skills", newSkills)}
                onEdit={
                  atsHighlightOn || !!hoveredKeyword
                    ? undefined
                    : cvEditCallbacks
                }
                onKeywordHover={setHoveredKeyword}
              />
            </div>
          </div>
        </div>
      )}

      {showLLMPopup && (
        <LLMGeneratorPopup
          prompt={buildPrompt(
            form.cv_title.trim() || form.target_job_title.trim(),
            form.raw_description.trim() || "(No job description provided)",
            experienceItems.length,
            linkedInTitles,
          )}
          isOpen={showLLMPopup}
          onClose={() => setShowLLMPopup(false)}
        />
      )}

      {/* Unsaved changes confirmation */}
      {closeConfirmPending && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4 space-y-3">
            <p className="text-sm font-semibold text-gray-800">Unsaved Changes</p>
            <p className="text-xs text-gray-500">You have unsaved changes. What would you like to do?</p>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setCloseConfirmPending(false)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">
                Keep Editing
              </button>
              <button onClick={() => { setCloseConfirmPending(false); onClose() }}
                className="px-3 py-1.5 text-xs border border-gray-300 text-red-600 rounded hover:bg-red-50">
                Discard &amp; Close
              </button>
              <button onClick={() => { setCloseConfirmPending(false); closeAfterSaveRef.current = true; handleSave(false) }}
                className="px-3 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700">
                Save &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  collapsed,
  onToggle,
}: {
  title: string;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  if (onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-1 text-[10px] text-gray-400 uppercase font-semibold border-b border-gray-100 pb-1 hover:text-gray-600"
      >
        {title}
        {collapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
      </button>
    );
  }
  return (
    <div className="text-[10px] text-gray-400 uppercase font-semibold border-b border-gray-100 pb-1">
      {title}
    </div>
  );
}

// ─── Experience Card ──────────────────────────────────────────────────────────

function ExperienceCard({
  exp,
  index,
  onUpdateField,
  onSetBullet,
  onAddBullet,
  onRemoveBullet,
}: {
  exp: CVExpItem;
  index: number;
  onUpdateField: (updates: Partial<CVExpItem>) => void;
  onSetBullet: (bi: number, val: string) => void;
  onAddBullet: () => void;
  onRemoveBullet: (bi: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const displayTitle =
    exp.use_ai_title && exp.ai_title ? exp.ai_title : exp.designation;
  const dateRange = exp.currently_working
    ? `${exp.from_date} – Present`
    : `${exp.from_date}${exp.to_date ? ` – ${exp.to_date}` : ""}`;

  const ic =
    "w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-400 bg-white";
  const lc = "text-[9px] text-gray-400 uppercase font-medium mb-0.5 block";

  return (
    <div className="border border-gray-200 rounded overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer"
        onClick={() => setOpen((p) => !p)}
      >
        <div>
          <div className="text-xs font-semibold text-gray-700 truncate">
            {displayTitle}
            {exp.company_name && (
              <span className="text-gray-500 font-normal">
                {" "}
                @ {exp.company_name}
              </span>
            )}
          </div>
          <div className="text-[9px] text-gray-400">{dateRange}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <span className="text-[9px] text-gray-400">
            {(exp.bullets ?? []).length} bullets
          </span>
          {open ? (
            <ChevronUp size={13} className="text-gray-400" />
          ) : (
            <ChevronDown size={13} className="text-gray-400" />
          )}
        </div>
      </div>

      {open && (
        <div className="p-3 space-y-3">
          {/* AI Title Toggle */}
          {exp.ai_title && (
            <div className="bg-blue-50 border border-blue-100 rounded p-2 space-y-1">
              <div className="text-[9px] text-blue-500 uppercase font-semibold">
                Job Title Source
              </div>
              <div className="flex gap-3 flex-wrap">
                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-gray-700">
                  <input
                    type="radio"
                    name={`title-${index}`}
                    checked={!exp.use_ai_title}
                    onChange={() => onUpdateField({ use_ai_title: false })}
                    className="w-3 h-3"
                  />
                  Applicant:{" "}
                  <span className="font-medium">{exp.designation}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-gray-700">
                  <input
                    type="radio"
                    name={`title-${index}`}
                    checked={!!exp.use_ai_title}
                    onChange={() => onUpdateField({ use_ai_title: true })}
                    className="w-3 h-3"
                  />
                  AI:{" "}
                  <span className="font-medium text-blue-700">
                    {exp.ai_title}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lc}>From Date</label>
              <div className="flex gap-1">
                <select
                  className={ic}
                  value={(exp.from_date ?? "").split("-")[1] ?? ""}
                  onChange={(e) => {
                    const [y = ""] = (exp.from_date ?? "").split("-");
                    if (y)
                      onUpdateField({ from_date: `${y}-${e.target.value}` });
                  }}
                >
                  <option value="">Month</option>
                  {EXP_MONTHS.map((mn, i) => (
                    <option key={i} value={String(i + 1).padStart(2, "0")}>
                      {mn}
                    </option>
                  ))}
                </select>
                <select
                  className={ic}
                  value={(exp.from_date ?? "").split("-")[0] ?? ""}
                  onChange={(e) => {
                    const m = (exp.from_date ?? "").split("-")[1] ?? "";
                    onUpdateField({
                      from_date: m ? `${e.target.value}-${m}` : e.target.value,
                    });
                  }}
                >
                  <option value="">Year</option>
                  {EXP_YEARS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={lc}>To Date</label>
              <div className="flex gap-1">
                <select
                  className={ic}
                  value={
                    exp.currently_working
                      ? "__present__"
                      : ((exp.to_date ?? "").split("-")[1] ?? "")
                  }
                  onChange={(e) => {
                    if (e.target.value === "__present__") {
                      onUpdateField({ currently_working: true, to_date: null });
                    } else {
                      const [y = ""] = (exp.to_date ?? "").split("-");
                      onUpdateField({
                        currently_working: false,
                        to_date: y ? `${y}-${e.target.value}` : undefined,
                      });
                    }
                  }}
                >
                  <option value="">Month</option>
                  <option value="__present__">Present</option>
                  {EXP_MONTHS.map((mn, i) => (
                    <option key={i} value={String(i + 1).padStart(2, "0")}>
                      {mn}
                    </option>
                  ))}
                </select>
                <select
                  className={ic}
                  disabled={!!exp.currently_working}
                  value={(exp.to_date ?? "").split("-")[0] ?? ""}
                  onChange={(e) => {
                    const m = (exp.to_date ?? "").split("-")[1] ?? "";
                    onUpdateField({
                      currently_working: false,
                      to_date: m ? `${e.target.value}-${m}` : e.target.value,
                    });
                  }}
                >
                  <option value="">Year</option>
                  {EXP_YEARS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Job Type & Nature */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lc}>Job Type</label>
              <select
                className={ic}
                value={
                  JOB_TYPES.includes(exp.job_type ?? "")
                    ? (exp.job_type ?? "")
                    : "__custom__"
                }
                onChange={(e) => {
                  if (e.target.value !== "__custom__")
                    onUpdateField({ job_type: e.target.value });
                }}
              >
                <option value="">—</option>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                {exp.job_type && !JOB_TYPES.includes(exp.job_type) && (
                  <option value="__custom__">{exp.job_type} (custom)</option>
                )}
              </select>
              <input
                className={`${ic} mt-1`}
                placeholder="Custom value…"
                value={exp.job_type ?? ""}
                onChange={(e) => onUpdateField({ job_type: e.target.value })}
              />
            </div>
            <div>
              <label className={lc}>Job Nature</label>
              <select
                className={ic}
                value={
                  JOB_NATURES.includes(exp.job_nature ?? "")
                    ? (exp.job_nature ?? "")
                    : "__custom__"
                }
                onChange={(e) => {
                  if (e.target.value !== "__custom__")
                    onUpdateField({ job_nature: e.target.value });
                }}
              >
                <option value="">—</option>
                {JOB_NATURES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
                {exp.job_nature && !JOB_NATURES.includes(exp.job_nature) && (
                  <option value="__custom__">{exp.job_nature} (custom)</option>
                )}
              </select>
              <input
                className={`${ic} mt-1`}
                placeholder="Custom value…"
                value={exp.job_nature ?? ""}
                onChange={(e) => onUpdateField({ job_nature: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-gray-600">
              <input
                type="checkbox"
                className="w-3 h-3"
                checked={!!exp.show_job_type}
                onChange={(e) =>
                  onUpdateField({ show_job_type: e.target.checked })
                }
              />
              Show type on CV
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-gray-600">
              <input
                type="checkbox"
                className="w-3 h-3"
                checked={!!exp.show_job_nature}
                onChange={(e) =>
                  onUpdateField({ show_job_nature: e.target.checked })
                }
              />
              Show nature on CV
            </label>
          </div>

          {/* Bullets */}
          <div>
            <label className={lc}>Bullet Points</label>
            <div className="space-y-1.5">
              {(exp.bullets ?? []).map((bullet, bi) => (
                <div key={bi} className="flex items-start gap-1.5">
                  <span className="text-[10px] text-gray-400 mt-1.5 shrink-0 select-none">
                    –
                  </span>
                  <input
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-400 bg-white"
                    placeholder={`Bullet point ${bi + 1}…`}
                    value={bullet}
                    onChange={(e) => onSetBullet(bi, e.target.value)}
                  />
                  <button
                    onClick={() => onRemoveBullet(bi)}
                    className="text-gray-300 hover:text-red-500 shrink-0 mt-0.5"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={onAddBullet}
              className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-800 border border-teal-200 rounded px-2 py-0.5 mt-2"
            >
              <Plus size={9} /> Add bullet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
