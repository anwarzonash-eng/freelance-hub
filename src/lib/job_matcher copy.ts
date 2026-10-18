"use server";

import fs, { link } from "fs";
import OpenAI from "openai";
import path from "path";
import { parse } from "csv-parse/sync";

const client = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });
const EMBED_MODEL = "text-embedding-3-small";
const EMBEDDINGS_FILE = path.join(process.cwd(), "./jobs_with_embeddings.json");
const JOBS_CSV_WITH_EMBEDDINGS = "completed_jobs_embeddings.csv";
// const JOBS_CSV_WITH_EMBEDDINGS = path.join(process.cwd(), "completed_jobs_embeddings.csv");
export type Job = {
  title: string;
  description: string;
  embedding?: number[];
  link: string;
  skills: string;
  earnings: string;
};

async function loadJobsFromCSV() {

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/jobs`);
  const csvData = await res.text();
  // console.log(res);
  // console.log(csvData);



  // const csvData = fs.readFileSync(JOBS_CSV_WITH_EMBEDDINGS, "utf-8");
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
  });
  return records;
}

function cosineSim(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  const normB = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
  return dot / (normA * normB);
}

function makeDoc(job: Job): string {
  return `Skills: ${job.skills}\nTitle: ${job.title}\nDescription: ${job.description}`;
}

export async function queryJob(
  newJob: Job,

  threshold = 0.1,
  topK = 20
): Promise<{ id: string; title: string; similarity: number, link: string, skills: string, earnings: string, description: string }[]> {

  // console.log(JOBS_CSV_WITH_EMBEDDINGS)

  // if (!fs.existsSync(JOBS_CSV_WITH_EMBEDDINGS)) {
  //   console.error("Jobs CSV file not found. Run createEmbeddings() first!");
  //   return;
  // }

  const storedJobs: any = await loadJobsFromCSV();
  console.log(storedJobs);
  const newText = makeDoc(newJob);

  const resp = await client.embeddings.create({
    model: EMBED_MODEL,
    input: [newText],
  });

  const newEmbedding = resp.data[0].embedding;

  const results = storedJobs
    .filter(job => job.embedding)
    .map(job => ({
      title: job.title,
      skills: job.skills
        ? job.skills.split("\n").map(s => s.trim()).filter(s => s.length > 0)
        : [],
      description: job.description,
      earnings: job.earnings,
      link: job.link,
      similarity: cosineSim(
        newEmbedding,
        JSON.parse(job.embedding)
      ),
    }));

  // const results = storedJobs.map(job => ({
  //   title: job.title,
  //   link: job.link,
  //   skills: job.skills,
  //   earnings: job.earnings,
  //   similarity: cosineSim(newEmbedding, job.embedding as number[]),
  //   description: job.description
  // }));

  return results
    .filter(r => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
