"use client";
import dynamic from "next/dynamic";

const ManageExperiences = dynamic(
  () => import("../components/experiences/ManageExperiences"),
  { ssr: false }
);

export default function ExperiencesPage() {
  return <ManageExperiences />;
}
