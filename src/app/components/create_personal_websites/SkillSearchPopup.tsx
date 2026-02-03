"use client";

import React, { useState, useMemo } from "react";
import { Search, X, Plus } from "lucide-react";

interface Skill {
  id: string | number;
  title: string;
  variation?: string[];
  description?: string | null;
  icon?: string;
  catagory?: string;
}

interface SkillSearchPopupProps {
  allSkills: Skill[];
  onClose: () => void;
  onConfirm?: (selectedSkills: Skill[]) => void;
}

export default function SkillSearchPopup({
  allSkills,
  onClose,
  onConfirm,
}: SkillSearchPopupProps) {
  const [description, setDescription] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Match skills based on description - keywords must exactly match title or variations
  const matchedSkillsFromDescription = useMemo(() => {
    if (!description.trim()) return [];

    const lowerDesc = description.toLowerCase();
    const descWords = lowerDesc
      .split(/[\s,;:.!?\-]+/)
      .filter((word) => word.length > 2); // Only consider words with 3+ characters

    const matched = new Set<string | number>();

    allSkills.forEach((skill) => {
      // Check if any keyword from description exactly matches skill title or variations
      for (const keyword of descWords) {
        const skillTitleLower = skill.title.toLowerCase();
        const skillVariations = skill.variation?.map((v) => v.toLowerCase()) || [];

        // Exact match with title
        if (keyword === skillTitleLower || skillTitleLower === keyword) {
          matched.add(skill.id);
          return;
        }

        // Exact match with any variation
        if (skillVariations.includes(keyword)) {
          matched.add(skill.id);
          return;
        }
      }
    });

    return Array.from(matched)
      .map((id) => allSkills.find((s) => s.id === id))
      .filter(Boolean) as Skill[];
  }, [description, allSkills]);

  // Filter skills for searchable list (exclude already selected)
  const filteredSkills = useMemo(() => {
    const selectedIds = new Set(selectedSkills.map((s) => s.id));
    const searchLower = searchQuery.toLowerCase();

    return allSkills.filter((skill) => {
      if (selectedIds.has(skill.id)) return false;

      if (!searchQuery) return true;

      return (
        skill.title.toLowerCase().includes(searchLower) ||
        skill.variation?.some((v) =>
          v.toLowerCase().includes(searchLower)
        ) ||
        skill.catagory?.toLowerCase().includes(searchLower)
      );
    });
  }, [allSkills, selectedSkills, searchQuery]);

  // Add skill from matched list
  const addMatchedSkill = (skill: Skill) => {
    if (!selectedSkills.find((s) => s.id === skill.id)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  // Add skill from search list
  const addSearchedSkill = (skill: Skill) => {
    if (!selectedSkills.find((s) => s.id === skill.id)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  // Remove skill
  const removeSkill = (skillId: string | number) => {
    setSelectedSkills(selectedSkills.filter((s) => s.id !== skillId));
  };

  const handleConfirm = () => {
    onConfirm?.(selectedSkills);
    onClose();
  };

  return (
    <div className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
      <div className="flex flex-col gap-4">
        {/* Description Input */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Paste Description or Text
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Paste job description, profile text, or any content here. Skills will be automatically matched..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            rows={4}
          />
        </div>

        {/* Selected Skills */}
        <div>
          <span className="block text-sm font-semibold text-gray-700 mb-2">
            Selected Skills ({selectedSkills.length})
          </span>
          {selectedSkills.length === 0 ? (
            <div className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-xs text-gray-500">
                No skills selected. Add from matched or search list below.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold border border-indigo-200"
                >
                  {skill.icon && (
                    <img
                      src={skill.icon}
                      alt={skill.title}
                      className="w-4 h-4 rounded"
                    />
                  )}
                  <span>{skill.title}</span>
                  <button
                    onClick={() => removeSkill(skill.id)}
                    className="ml-1 hover:bg-indigo-200 rounded-full p-0.5 transition"
                    title="Remove skill"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Matched Skills from Description */}
        {matchedSkillsFromDescription.length > 0 && (
          <div>
            <span className="block text-sm font-semibold text-gray-700 mb-2">
              Auto-Matched Skills ({matchedSkillsFromDescription.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {matchedSkillsFromDescription.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => addMatchedSkill(skill)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-semibold border border-green-200 hover:bg-green-100 transition"
                  title={`Variations: ${skill.variation?.join(", ") || "None"}`}
                >
                  {skill.icon && (
                    <img
                      src={skill.icon}
                      alt={skill.title}
                      className="w-3 h-3 rounded"
                    />
                  )}
                  <span>{skill.title}</span>
                  <Plus className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search & Add Skills */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Search & Add More Skills
          </label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by skill name, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
            {filteredSkills.length === 0 ? (
              <p className="text-xs text-gray-500 w-full text-center py-4">
                {searchQuery
                  ? "No skills found matching your search"
                  : "All available skills already selected"}
              </p>
            ) : (
              filteredSkills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => addSearchedSkill(skill)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200 hover:bg-blue-100 transition"
                  title={`Category: ${skill.catagory || "N/A"}`}
                >
                  {skill.icon && (
                    <img
                      src={skill.icon}
                      alt={skill.title}
                      className="w-3 h-3 rounded"
                    />
                  )}
                  <span>{skill.title}</span>
                  <Plus className="w-3 h-3" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold text-sm"
          >
            Confirm ({selectedSkills.length} skills)
          </button>
        </div>
      </div>
    </div>
  );
}
