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
} from "lucide-react";
import { getAllApplicants } from "@/app/api_handlers/api/job-applicants.api";
import { createCV, updateCV } from "@/app/api_handlers/api/job-cvs.api";
import { getAllJobs } from "@/app/api_handlers/api/sponsored-jobs.api";
import { timeAgo } from "@/app/utils/time";
import CVPreview, {
  CVData,
  CVExpItem,
  CVEduItem,
  CVProjectItem,
  FULL_MATCH_COLOR,
  PARTIAL_MATCH_COLOR,
  extractKeywords,
  highlightWords,
  stripHtml,
  TOKEN_REGEX,
} from "./CVPreview";
import LLMGeneratorPopup from "../llm/LLMGeneratorPopup";

// ─── Constants ───────────────────────────────────────────────────────────────

const JOB_TYPES = ["Remote", "Hybrid", "Onsite"];
const JOB_NATURES = [
  "Full Time",
  "Freelance",
  "Contract",
  "Part Time",
  "Volunteer",
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

Generate a single comma-separated string named "skills".

OBJECTIVE

Create a skills section that maximizes ATS relevance while remaining credible, concise, and recruiter-friendly.

The final skills section should look like it was written by an experienced professional, not generated to maximize keyword density.

SKILL EXTRACTION PROCESS

Step 1 — Extract Explicit Requirements

Identify all technologies, tools, platforms, frameworks, methodologies, regulations, certifications, domain knowledge areas, professional competencies, responsibilities, and technical capabilities explicitly mentioned in the Job Description.

These are mandatory and must be prioritized.

Step 2 — Add Strongly Implied Skills

Include only skills that are directly required to perform the responsibilities described in the Job Description, even if not explicitly stated.

Examples:

* REST API Development may support API Development
* Systems Integration may support Integration Engineering
* Design Patterns may support Software Architecture
* Release Management may support Software Delivery

Do not add skills with weak or indirect relevance.

Step 3 — Add Limited ATS Supporting Skills

Only where appropriate, include a small number of industry-standard skills, alternative terminology, or closely related capabilities commonly searched by recruiters for the target role.

Every additional skill must have a clear connection to the Job Description.

SKILL PRIORITIZATION

Order skills by relevance:

1. Explicit Job Description requirements
2. Core technical or professional capabilities
3. Strongly implied skills
4. Relevant supporting skills

Most important skills must appear first.

SKILLS RULES

* Prioritize exact Job Description terminology whenever possible.
* Prefer recognized professional skills over broad concepts.
* Prefer concise skill names.
* Avoid unnecessary fragmentation of related skills.
* Use the most widely recognized ATS keyword when multiple variations exist.
* Every skill must be relevant to the target role.
* Every skill must be defensible based on the Job Description.
* Do not include duplicate or near-duplicate skills.
* Do not include skills solely to increase keyword count.
* Do not include skills unrelated to the role.
* Do not include generic personality traits.
* Do not include vague business buzzwords.
* Do not include filler keywords.

EXCLUDED TERMS

Unless explicitly required by the Job Description, exclude:

Communication
Collaboration
Team Player
Problem Solving
Results Driven
Hard Working
Leadership
Self-Motivated
Detail Oriented
Fast Learner
Strategic Thinker
Customer Focused

and similar generic CV buzzwords.

SKILL COUNT

Do not target a fixed number of skills.

Generate only the number of skills required to accurately represent the role.

Include all high-value requirements.

Stop adding skills when no additional skill meaningfully improves ATS relevance or recruiter confidence.

QUALITY OVER QUANTITY

A concise list of highly relevant skills is preferred over a larger list containing weaker or partially relevant skills.

VALIDATION

Before generating the final skills string:

1. Extract all unique skill phrases from the Job Description.
2. Ensure all critical Job Description requirements are represented.
3. Remove duplicates and near-duplicates.
4. Remove generic recruiter buzzwords.
5. Remove low-value ATS filler.
6. Remove skills that a hiring manager would not reasonably expect to see in a skills section.
7. Confirm every remaining skill is directly relevant to the target role.

RECRUITER REVIEW

Review the final skills list as a hiring manager.

Ask:

* Does this accurately represent the role?
* Does this look like a genuine professional CV?
* Would a recruiter immediately understand the candidate's expertise?
* Does the list avoid obvious AI keyword stuffing?

If any skill weakens credibility, remove it.

Return a single comma-separated string only.


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

Generate a realistic job title for each of the ${numExperiences} experience(s).

Requirements:
* Titles must be closely related to the target Job Title.
* Use real-world job titles commonly found on CVs, LinkedIn, and job boards.
* Show realistic career progression.
* Most recent experience should be closest to the target role.
* Older experiences should represent earlier stages of the career.
* Keep titles ATS-friendly.
* Avoid unusual or invented titles.
* Avoid repeating the exact same title for every experience.

Career Progression Rules:
* experience1 = most recent role
* experience2 = previous role
* experience3 = older role (and so on)

Recent roles should demonstrate greater responsibility, specialization, ownership, or expertise.
Older roles should demonstrate foundational experience and career development.

========================================
PART 4 — EXPERIENCE CONTENT
===========================

Generate professional experience bullet points for each of the ${numExperiences} experience(s).

Bullet Count Rules:
* If Number Of Past Experiences <= 3: generate exactly 4 bullet points per experience.
* If Number Of Past Experiences > 3: generate exactly 3 bullet points per experience.

Each bullet:
* Must be under 180 characters.
* Must focus on outcomes and impact rather than responsibilities.
* Must reference skills from the generated skills list naturally.
* Must include important Job Description keywords where relevant.
* Must sound realistic.
* Must not contain unrealistic metrics.
* Must not contain generic filler.

========================================
VALIDATION REQUIREMENTS
=======================

Before generating output, internally verify:
* Skills accurately reflect the Job Description.
* No duplicate skills exist.
* Summary contains important Job Description keywords.
* Experience job titles show logical career progression.
* Bullet count rules are respected.
* Output is valid JSON.
* No markdown, no explanations, no comments, no extra text.

========================================
OUTPUT FORMAT
=============

Return ONLY valid JSON — no markdown code blocks, no extra text.

{
  "skills": "skill1, skill2, skill3, skill4",
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
  "skills": "skill1, skill2, skill3",
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

const INIT_FORM = {
  cv_title: "",
  applicant_name: "",
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
};

const inputCls =
  "w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500 bg-white";
const labelCls = "text-[10px] text-gray-400 uppercase font-medium mb-0.5 block";

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
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

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
  const [showJsonPaste, setShowJsonPaste] = useState(true);
  const [showWorkExperience, setShowWorkExperience] = useState(true);
  const [showRawDescriptionView, setShowRawDescriptionView] = useState(false);
  const [showJobDescriptionView, setShowJobDescriptionView] = useState(false);
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null);
  const rawDescRef = useRef<HTMLDivElement>(null);
  const jobDescRef = useRef<HTMLDivElement>(null);
  const fullScreenRef = useRef<HTMLDivElement>(null);

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
  useEffect(() => {
    if (cv) {
      setSavedId(cv.id ?? null);
      setForm({
        cv_title: cv.cv_title ?? "",
        applicant_name: cv.applicant_name ?? "",
        target_job_title: cv.target_job_title ?? "",
        job_description: cv.job_description ?? "",
        raw_description: cv.raw_description ?? "",
        job_link: cv.job_link ?? "",
        organization_name: cv.organization_name ?? "",
        sponsorship: cv.sponsorship ?? "",
        location: cv.location ?? "",
        selected_email: cv.selected_email ?? "",
        selected_phone: cv.selected_phone ?? "",
        linkedin: cv.linkedin ?? "",
        github: cv.github ?? "",
        summary: cv.summary ?? "",
        skills: cv.skills ?? "",
        years_of_experience: cv.years_of_experience ?? 5,
      });
      setPortfolios(cv.portfolios ?? []);
      setExperienceItems(cv.experience_items ?? []);
      setEducation(cv.education ?? []);
      setProjects(cv.projects ?? []);
      if (cv.applicant_id) setSelectedApplicantId(cv.applicant_id);
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
  }, [cv, job]);

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

  const set = (field: string, val: any) =>
    setForm((f) => ({ ...f, [field]: val }));

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
  const removeEdu = (i: number) =>
    setEducation((e) => e.filter((_, idx) => idx !== i));

  // ── Project helpers ──────────────────────────────────────────────────────
  const addProject = () => setProjects((p) => [...p, { ...EMPTY_PROJECT }]);
  const updateProject = (i: number, proj: CVProjectItem) =>
    setProjects((p) => p.map((x, idx) => (idx === i ? proj : x)));
  const removeProject = (i: number) =>
    setProjects((p) => p.filter((_, idx) => idx !== i));

  // ── Prompt ───────────────────────────────────────────────────────────────
  const canCopyPrompt =
    form.target_job_title.trim() && experienceItems.length > 0;

  const copyPrompt = () => {
    const prompt = buildPrompt(
      form.target_job_title.trim(),
      form.raw_description.trim() || "(No job description provided)",
      experienceItems.length,
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

    if (typeof parsed.skills !== "string" || !parsed.skills.trim())
      errors.push('"skills" must be a non-empty string');
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

    if (parsed.skills) set("skills", parsed.skills);
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
    location: form.location,
    selected_email: form.selected_email,
    selected_phone: form.selected_phone,
    linkedin: form.linkedin,
    github: form.github,
    portfolios,
    summary: form.summary,
    skills: form.skills,
    experience_items: experienceItems,
    education,
    projects,
    raw_description: form.raw_description,
    description_html: form.job_description,
    organization_name: form.organization_name,
    sponsorship: form.sponsorship,
    job_link: form.job_link,
  };

  // ── ATS keyword source tracking (raw_description vs job_description HTML) ──
  const rawDescKeywords = useMemo(
    () => extractKeywords(form.raw_description),
    [form.raw_description],
  );
  const jobDescKeywords = useMemo(
    () => extractKeywords(stripHtml(form.job_description)),
    [form.job_description],
  );

  const hoverSourceInfo = useMemo(() => {
    if (!hoveredKeyword) return null;
    const inRaw = rawDescKeywords.has(hoveredKeyword);
    const inJobDesc = jobDescKeywords.has(hoveredKeyword);
    return { word: hoveredKeyword, inRaw, inJobDesc };
  }, [hoveredKeyword, rawDescKeywords, jobDescKeywords]);

  // Auto-expand whichever source panel(s) contain the hovered keyword.
  useEffect(() => {
    if (!hoveredKeyword) return;
    if (rawDescKeywords.has(hoveredKeyword)) setShowRawDescriptionView(true);
    if (jobDescKeywords.has(hoveredKeyword)) setShowJobDescriptionView(true);
  }, [hoveredKeyword, rawDescKeywords, jobDescKeywords]);

  // Auto-scroll the matching <mark> into view inside each source panel.
  useEffect(() => {
    if (!hoveredKeyword) return;
    const t = setTimeout(() => {
      const selector = `mark[data-word="${hoveredKeyword}"]`;
      rawDescRef.current
        ?.querySelector(selector)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
      jobDescRef.current
        ?.querySelector(selector)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
    return () => clearTimeout(t);
  }, [hoveredKeyword]);

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
    };
  };

  const handleSave = async (openAfter = false) => {
    setSaving(true);
    try {
      if (savedId) {
        await updateCV(savedId, buildPayload());
        onSaved?.();
        if (openAfter) window.open(`/viewCV/${savedId}`, "_blank");
      } else {
        const res: any = await createCV(buildPayload());
        const newId = res?.data?.id ?? res?.id ?? null;
        setSavedId(newId);
        onSaved?.();
        if (openAfter && newId) window.open(`/viewCV/${newId}`, "_blank");
      }
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 shrink-0 bg-white shadow-sm">
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 shrink-0 p-0.5"
        >
          <X size={15} />
        </button>
        <input
          className="flex-1 text-xs border-none outline-none font-medium text-gray-800 placeholder-gray-300 max-w-xs"
          placeholder="CV Title (internal label)"
          value={form.cv_title}
          onChange={(e) => set("cv_title", e.target.value)}
        />
        {job && (
          <span className="text-[10px] text-gray-400 truncate max-w-[200px] hidden sm:block">
            For: {job.job_title} @ {job.company_name}
          </span>
        )}
        <div className="flex items-center gap-2 ml-auto shrink-0">
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
          <button
            onClick={() => handleSave(false)}
            disabled={
              saving ||
              !form.applicant_name.trim() ||
              !form.target_job_title.trim() ||
              !form.raw_description.trim()
            }
            title={
              !form.target_job_title.trim()
                ? "Target Job Title is required"
                : !form.raw_description.trim()
                  ? "Job Description is required"
                  : !form.applicant_name.trim()
                    ? "Applicant name is required"
                    : ""
            }
            className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={
              saving ||
              !form.applicant_name.trim() ||
              !form.target_job_title.trim() ||
              !form.raw_description.trim()
            }
            title={
              !form.target_job_title.trim()
                ? "Target Job Title is required"
                : !form.raw_description.trim()
                  ? "Job Description is required"
                  : !form.applicant_name.trim()
                    ? "Applicant name is required"
                    : ""
            }
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ExternalLink size={11} />
            {saving ? "Saving…" : "Save & View"}
          </button>
        </div>
      </div>

      {/* ── Job Context bar ── */}
      {(form.organization_name || form.sponsorship || form.job_link) && (
        <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-1.5 border-b border-gray-200 shrink-0 bg-gray-50 text-[11px] text-gray-600">
          <div className="flex items-center gap-4 flex-wrap">
            {form.organization_name && (
              <span>
                <strong className="text-gray-700">Organization:</strong>{" "}
                {form.organization_name}
              </span>
            )}
            {form.sponsorship && (
              <span>
                <strong className="text-gray-700">Sponsorship:</strong>{" "}
                {form.sponsorship === "yes"
                  ? "Yes"
                  : form.sponsorship === "no"
                    ? "No"
                    : "Unknown"}
              </span>
            )}
          </div>
          {form.job_link && (
            <a
              href={form.job_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-medium hover:underline whitespace-nowrap"
            >
              View Job →
            </a>
          )}
        </div>
      )}

      {/* ── Prior submission warning ── */}
      {companySubmission && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-amber-200 shrink-0 bg-amber-50 text-[11px] text-amber-800">
          <span>
            ⚠️ Already submitted {companySubmission.count} CV
            {companySubmission.count > 1 ? "s" : ""} to{" "}
            <strong>{form.organization_name || "this company"}</strong> —
            most recently {timeAgo(companySubmission.latest)}
          </span>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: Form ── */}
        <div
          className="shrink-0 overflow-y-auto"
          style={{ width: leftPanelWidth }}
        >
          <div className="p-4 space-y-5">
            {/* Applicant select */}
            <div>
              <label className={labelCls}>Select Applicant</label>
              {loadingApplicants ? (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <RefreshCw size={11} className="animate-spin" /> Loading…
                </div>
              ) : (
                <select
                  value={selectedApplicantId}
                  onChange={(e) =>
                    setSelectedApplicantId(
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                  className={inputCls}
                >
                  <option value="">-- Select applicant --</option>
                  {applicants.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
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
                <label className={labelCls}>Target Job Title</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Senior React Developer"
                  value={form.target_job_title}
                  onChange={(e) => set("target_job_title", e.target.value)}
                />
              </div>
              <div className="border border-gray-200 rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdditionalJobDetails((p) => !p)}
                  className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-50 hover:bg-gray-100 text-[10px] text-gray-500 uppercase font-medium"
                >
                  Additional Job Details
                  {showAdditionalJobDetails ? (
                    <ChevronUp size={12} />
                  ) : (
                    <ChevronDown size={12} />
                  )}
                </button>
                {showAdditionalJobDetails && (
                  <div className="p-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>Organisation</label>
                        <input
                          className={inputCls}
                          placeholder="Company name"
                          value={form.organization_name}
                          onChange={(e) =>
                            set("organization_name", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Sponsorship</label>
                        <select
                          className={inputCls}
                          value={form.sponsorship}
                          onChange={(e) => set("sponsorship", e.target.value)}
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Job Link (optional)</label>
                      <input
                        className={inputCls}
                        placeholder="https://…"
                        value={form.job_link}
                        onChange={(e) => set("job_link", e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label
                  className={
                    labelCls +
                    " bg-blue-50 border border-blue-200 px-2 py-0.5 rounded block"
                  }
                >
                  Job Description (for CV) *
                </label>
                <textarea
                  rows={5}
                  className={`${inputCls} resize-y bg-blue-50 border-blue-200`}
                  placeholder="Raw job description text for CV generation (required)…"
                  value={form.raw_description}
                  onChange={(e) => set("raw_description", e.target.value)}
                />
              </div>

              {hoverSourceInfo && (
                <div className="text-[10px] rounded border border-amber-200 bg-amber-50 px-2 py-1 flex items-center gap-2">
                  <span className="font-semibold text-amber-800">
                    "{hoverSourceInfo.word}"
                  </span>
                  <span
                    className={
                      hoverSourceInfo.inRaw
                        ? "text-green-700"
                        : "text-gray-400"
                    }
                  >
                    {hoverSourceInfo.inRaw ? "✓" : "✕"} Raw Description
                  </span>
                  <span
                    className={
                      hoverSourceInfo.inJobDesc
                        ? "text-green-700"
                        : "text-gray-400"
                    }
                  >
                    {hoverSourceInfo.inJobDesc ? "✓" : "✕"} Job Description
                  </span>
                </div>
              )}

              <div className="border border-gray-200 rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRawDescriptionView((p) => !p)}
                  className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-50 hover:bg-gray-100 text-[10px] text-gray-500 uppercase font-medium"
                >
                  Raw Description (View Mode)
                  {showRawDescriptionView ? (
                    <ChevronUp size={12} />
                  ) : (
                    <ChevronDown size={12} />
                  )}
                </button>
                {showRawDescriptionView && (
                  <div
                    ref={rawDescRef}
                    className="p-2 text-[10.5px] leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto"
                    dangerouslySetInnerHTML={{
                      __html:
                        highlightPlainTextToHtml(
                          form.raw_description,
                          atsHighlightOn && hoveredKeyword
                            ? new Set([hoveredKeyword])
                            : new Set(),
                        ) || '<span class="text-gray-400 italic">Empty</span>',
                    }}
                  />
                )}
              </div>

              <div className="border border-gray-200 rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowJobDescriptionView((p) => !p)}
                  className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-50 hover:bg-gray-100 text-[10px] text-gray-500 uppercase font-medium"
                >
                  Job Description (HTML View)
                  {showJobDescriptionView ? (
                    <ChevronUp size={12} />
                  ) : (
                    <ChevronDown size={12} />
                  )}
                </button>
                {showJobDescriptionView && (
                  <div
                    ref={jobDescRef}
                    className="p-2 text-[10.5px] leading-relaxed max-h-64 overflow-y-auto"
                    dangerouslySetInnerHTML={{
                      __html:
                        highlightHtmlString(
                          form.job_description,
                          atsHighlightOn && hoveredKeyword
                            ? new Set([hoveredKeyword])
                            : new Set(),
                        ) || '<span class="text-gray-400 italic">Empty</span>',
                    }}
                  />
                )}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Email</label>
                  {applicantEmails.length > 1 && (
                    <select
                      className={`${inputCls} mb-1`}
                      value={form.selected_email}
                      onChange={(e) => set("selected_email", e.target.value)}
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
                      onChange={(e) => set("selected_phone", e.target.value)}
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
                <label className={labelCls}>Skills</label>
                <textarea
                  rows={3}
                  className={`${inputCls} resize-y`}
                  placeholder="Python, JavaScript, React, Node.js, AWS…"
                  value={form.skills}
                  onChange={(e) => set("skills", e.target.value)}
                />
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
                    onUpdateField={(updates) => updateExpField(expIdx, updates)}
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
                  ATS Highlight {atsHighlightOn ? "On" : "Off"}
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
              highlightEnabled={atsHighlightOn}
              onSkillsReorder={(newSkills) => set("skills", newSkills)}
              onBulletEdit={(expIdx, bulletIdx, val) =>
                setBullet(expIdx, bulletIdx, val)
              }
              onKeywordHover={setHoveredKeyword}
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
                ATS Highlight {atsHighlightOn ? "On" : "Off"}
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
                onSkillsReorder={(newSkills) => set("skills", newSkills)}
                onBulletEdit={(expIdx, bulletIdx, val) =>
                  setBullet(expIdx, bulletIdx, val)
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
            form.target_job_title.trim(),
            form.raw_description.trim() || "(No job description provided)",
            experienceItems.length,
          )}
          isOpen={showLLMPopup}
          onClose={() => setShowLLMPopup(false)}
        />
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
