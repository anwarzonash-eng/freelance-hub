"use client";

import { getALLUPworkJobsStats } from "@/app/api_handlers/api/upwork.api";
import { useEffect, useState } from "react";
import Loading from "../../components/ui/Loading";
export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [expandedSubcategories, setExpandedSubcategories] = useState<
    Set<string>
  >(new Set());
  const [isLoading, setIsLoading] = useState(null);

  const highlightSkills = [
    "React",
    "Next.js",
    "JavaScript",
    "Node.js",
    "TypeScript",
    "API",
    "Web Development",
    "WordPress",
    "PHP",
    "CSS",
    "HTML5",
    "HTML",
    "Python",
    "Web Design",
    "API Integration",
  ];

  const onload = async () => {
    setIsLoading(true);
    const res: any = await getALLUPworkJobsStats();
    if (res) {
      setData(res.data);
      console.log(res.data);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    onload();
  }, []);

  const toggleSubcategory = (subcategory: string) => {
    const newSet = new Set(expandedSubcategories);
    if (newSet.has(subcategory)) newSet.delete(subcategory);
    else newSet.add(subcategory);
    setExpandedSubcategories(newSet);
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      {isLoading && <Loading isLoading={isLoading} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* All Skills Table */}
        <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            All Skills
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-600">
                <th className="py-2 text-left">Skill</th>
                <th className="py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {data?.all_skills.map((item: any, idx: number) => {
                const isHighlighted = highlightSkills.includes(item.skill_name);
                return (
                  <tr
                    key={idx}
                    className={`border-b last:border-none  ${
                      isHighlighted
                        ? "bg-yellow-300 font-semibold text-gray-900"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="py-2 p-4">{item.skill_name}</td>
                    <td className="py-2 text-right p-4">{item.skill_count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Subcategory Skills */}
        <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Skills by Subcategory
          </h2>

          <div className="space-y-4">
            {data?.skills_by_categories.subcategory_skills_summary.map(
              (sub: any, idx: number) => (
                <div key={idx}>
                  <div
                    onClick={() => toggleSubcategory(sub.subcategory)}
                    className="cursor-pointer flex justify-between items-center bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg border border-gray-200"
                  >
                    <span className="font-medium text-gray-800">
                      {sub.subcategory}
                    </span>
                    <span className="text-gray-600 font-semibold">
                      {sub.occurrences}
                    </span>
                  </div>

                  {expandedSubcategories.has(sub.subcategory) && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-4 border border-gray-100 shadow-inner">
                      {sub.skills.map((item: any, idx2: number) => {
                        const isHighlighted = highlightSkills.includes(
                          item.skill_name
                        );
                        return (
                          <div
                            key={idx2}
                            className={`flex justify-between py-1.5 border-b last:border-none ${
                              isHighlighted
                                ? "bg-yellow-300 font-semibold px-2 rounded text-gray-900"
                                : "hover:bg-white/50"
                            }`}
                          >
                            <span>{item.skill_name}</span>
                            <span className="text-gray-700">
                              {item.skill_count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
