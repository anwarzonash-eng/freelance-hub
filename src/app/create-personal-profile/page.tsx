"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { initFlowbite } from "flowbite"; // Assuming flowbite is installed and available
// In a real Next.js app, 'environment' would typically be a process.env variable.
// For this example, I'll define it as a constant.
const environment = {
  apiDomain:
    process.env.NEXT_PUBLIC_PERSONAL_SITES_API_DOMAIN ||
    "http://localhost:3000/api/",
};

// --- Type Definitions (Highly Recommended in TypeScript) ---
interface Skill {
  id: number | string;
  title: string;
  variation: string | null;
  catagory: string;
  isDeleteButtonVisible?: boolean;
}

interface Category {
  id: string;
  name: string;
  designation: string;
  tagline: string;
  expand?: boolean;
}

interface MainProfile {
  id: string;
  name: string;
  domain: string;
}

interface MatchedProfile {
  unique_id: string;
  designation: string;
  matched_percentage: number;
  new_skills: { id: string; title: string }[];
  isOpen: boolean;
}

// --- Utility Functions ---

// Replacement for 'ngx-pipes' filterBy pipe
const filterBy = <T extends Record<string, any>>(
  array: T[],
  keys: (keyof T)[],
  value: any
): T[] => {
  if (!array || !keys || value === undefined) return array;
  return array.filter((item) => {
    return keys.some((key) => item[key] === value);
  });
};

// --- API Wrapper Functions ---

const fetcher = async (url: string, data?: any) => {
  const options: RequestInit = {
    method: data ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  };

  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "An API error occurred");
  }
  return response.json();
};

// --- Next.js Client Component ---

export default function CreateDynamicProfilePage() {
  // --- State Initialization (Angular Properties -> React State) ---
  const [jobDescription, setJobDescription] = useState<string>(
    "react, javascript, express, graphql, wordpress, shopify, php, laravel, mysql, postgres, tailwind, MUI, bootstrap"
  );
  const [mainCategoryId, setMainCategoryId] = useState<string>("frontend");
  const [mainDomain, setMainDomain] = useState<any>({}); // Using 'any' as its shape is complex
  const [tagline, setTagline] = useState<string>("");
  const [designation, setDesignation] = useState<string>("");
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [portfoliosList, setPortfoliosList] = useState<string[]>([]);
  const [mainProfiles, setMainProfiles] = useState<MainProfile[]>([]);
  const [matchedProfiles, setMatchedProfiles] = useState<MatchedProfile[]>([]);
  const [matchedProfilesForSearch, setMatchedProfilesForSearch] = useState<
    MatchedProfile[]
  >([]);
  const [currentDomain, setCurrentDomain] = useState<string>("");

  const [profileLinkCv, setProfileLinkCv] = useState<string>("");
  const [profileLinkCoverletter, setProfileLinkCoverletter] =
    useState<string>("");
  const [profileLinkPortfolio, setProfileLinkPortfolio] = useState<string>("");

  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [allSkillsForSearch, setAllSkillsForSearch] = useState<Skill[]>([]);

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("frontend"); // Used for 'All Skills' category select

  // --- Effects (Angular Lifecycle Hooks -> React useEffect) ---

  // Equivalent to ngAfterViewInit for Flowbite
  useEffect(() => {
    initFlowbite();
  }, []);

  // Handler for category change (to update designation/tagline)
  const onChangeCategory = useCallback(
    (categoryId: string) => {
      setMainCategoryId(categoryId);
      const selectedCat = allCategories.find(
        (options) => options.id === categoryId
      );
      if (selectedCat) {
        setDesignation(selectedCat.designation);
        setTagline(selectedCat.tagline);
      }
    },
    [allCategories]
  );

  // Auto-run onChangeCategory when allCategories loads
  useEffect(() => {
    if (allCategories.length > 0 && mainCategoryId) {
      onChangeCategory(mainCategoryId);
    }
  }, [allCategories, mainCategoryId, onChangeCategory]);

  // --- Methods (Angular Component Methods -> React Functions) ---

  const searchSkills = (skillKeyword: string) => {
    setAllSkills(
      allSkillsForSearch.filter((skill) =>
        skill.title.toLowerCase().includes(skillKeyword.toLowerCase())
      )
    );
  };

  const searchMatchedProfiles = (matchedProfileKeyword: string) => {
    setMatchedProfiles(
      matchedProfilesForSearch.filter((profile) =>
        profile.designation
          .toLowerCase()
          .includes(matchedProfileKeyword.toLowerCase())
      )
    );
  };

  const toggleItem = (index: number) => {
    setMatchedProfiles((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, isOpen: !item.isOpen } : item
      )
    );
  };

  const onDeleteClick = (id: string | number, arrayType: "SelectedSkills") => {
    if (arrayType === "SelectedSkills") {
      setSelectedSkills((prev) => prev.filter((skill) => skill.id !== id));
    }
    // Ignoring 'SelectedCategories' and 'AllSkills' deletions as they are not used in the Angular component's logic
  };

  const onAddClick = (skill: Skill, category: string) => {
    // Angular's logic allowed duplicates but the HTML was rendering unique skills per category.
    // I'll follow the Angular TS logic: simply add the skill to the list.
    // if (!selectedSkills.find((s) => s.id === skill.id)) { // Angular's commented logic
    setSelectedSkills((prev) => [
      ...prev,
      { id: skill.id, title: skill.title, variation: null, catagory: category },
    ]);
    // }
  };

  const showDeleteButton = (skill: Skill) => {
    setSelectedSkills((prev) =>
      prev.map((item) =>
        item.id === skill.id ? { ...item, isDeleteButtonVisible: true } : item
      )
    );
  };
  const hideDeleteButton = (skill: Skill) => {
    setSelectedSkills((prev) =>
      prev.map((item) =>
        item.id === skill.id ? { ...item, isDeleteButtonVisible: false } : item
      )
    );
  };

  const expandCollapse = (category: Category) => {
    setAllCategories((prev) =>
      prev.map((item) =>
        item.id === category.id
          ? { ...item, expand: !item.expand }
          : { ...item, expand: false }
      )
    );
  };

  const fetchSkills = async () => {
    try {
      const data = { description: jobDescription };
      const response = await fetcher(
        `${environment.apiDomain}skillFinder/find`,
        data
      );

      setAllSkills(response.data.allSkills);
      setSelectedSkills(response.data.selectedSkills);
      setAllCategories(response.data.allCategories);
      // selectedCategories is not used in the provided template
      setAllSkillsForSearch(response.data.allSkills);
      setMainProfiles(response.data.mainProfiles);

      const domainObj = response.data.mainProfiles.find(
        (options: any) => options.id === mainDomain?.main_id
      );
      if (domainObj) {
        setCurrentDomain(domainObj.domain);
      } else if (response.data.mainProfiles.length > 0) {
        // Default to the first domain if none is selected
        setMainDomain({
          main_id: response.data.mainProfiles[0].id,
          domain: response.data.mainProfiles[0].domain,
        });
        setCurrentDomain(response.data.mainProfiles[0].domain);
      }

      // Check if mainCategoryId is still valid after fetching
      const initialCategoryId =
        mainCategoryId &&
        response.data.allCategories.find(
          (c: Category) => c.id === mainCategoryId
        )
          ? mainCategoryId
          : response.data.allCategories[0]?.id;
      if (initialCategoryId) {
        onChangeCategory(initialCategoryId);
      }

      setIsError(false);
      setErrorMessage("");
    } catch (error: any) {
      console.error(error);
      setIsError(true);
      setErrorMessage(error.message || "Failed to fetch skills.");
    }
  };

  const fetchMatchedProfiles = async () => {
    try {
      const ids = selectedSkills.map((item) => item.id);
      const data = { skill: ids };

      const response = await fetcher(
        `${environment.apiDomain}dynamic_detProfile/findmatchedProfile`,
        data
      );

      const updatedProfiles: MatchedProfile[] = response.data.map(
        (profile: MatchedProfile) => ({
          ...profile,
          isOpen: false, // Initialize accordion state
          new_skills: profile.new_skills.map((currentSkill) => {
            const newSkill = allSkills.find(
              (skill) => skill.id == currentSkill.id
            );
            return {
              ...currentSkill,
              title: newSkill ? newSkill.title : currentSkill.id,
            };
          }),
        })
      );

      setMatchedProfiles(updatedProfiles);
      setMatchedProfilesForSearch(updatedProfiles);
      setIsError(false);
      setErrorMessage("");
    } catch (error: any) {
      console.error(error);
      setIsError(true);
      setErrorMessage(error.message || "Failed to fetch matched profiles.");
    }
  };

  const createProfile = async () => {
    if (selectedSkills.length < 1 || !designation || !tagline) {
      alert("Please fill all required inputs! Thanks");
      return;
    }

    setIsError(false);
    setErrorMessage("");
    setIsCreatingProfile(true);

    const skillsData = selectedSkills.map((item) => ({
      id: item.id,
      title: item.title,
      category: item.catagory,
    }));

    const data = {
      skills: skillsData,
      intro_category_id: mainCategoryId,
      designation: designation,
      experience_in_years: "a",
      tag_line: tagline,
      domain: mainDomain,
    };

    try {
      const response = await fetcher(
        `${environment.apiDomain}dynamic_detProfile/add`,
        data
      );

      const selectedDomain = mainProfiles.find(
        (options) => options.id === mainDomain.main_id
      )?.domain;

      if (!selectedDomain) {
        throw new Error("Could not find selected domain for profile links.");
      }

      setProfileLinkCoverletter(
        `http://${selectedDomain}/${response.data.unique_id}/offer`
      );
      setProfileLinkCv(
        `http://${selectedDomain}/${response.data.unique_id}/cv`
      );
      setProfileLinkPortfolio(
        `http://${selectedDomain}/${response.data.unique_id}/portfolio`
      );

      const portfolios = response.data.portfolios_ids.portfolio_ids.map(
        (portfolio: string) =>
          `http://${selectedDomain}/${response.data.unique_id}/portfolio/detail/${portfolio}`
      );
      setPortfoliosList(portfolios);

      setIsCreatingProfile(false);
    } catch (error: any) {
      console.error(error);
      setIsError(true);
      setIsCreatingProfile(false);
      setErrorMessage(error.message || "Failed to create profile.");
    }
  };

  const copyText = (type: string, portfolioIndex: number) => {
    let textToCopy = "";
    const portfolioLink = portfoliosList[portfolioIndex];

    switch (type) {
      case "cv":
        textToCopy = profileLinkCv;
        break;
      case "cv_u":
        textToCopy = profileLinkCv + "?u=_";
        break;
      case "coverletter":
        textToCopy = profileLinkCoverletter;
        break;
      case "coverletter_u":
        textToCopy = profileLinkCoverletter + "?u=_";
        break;
      case "main_portfolio":
        textToCopy = profileLinkPortfolio;
        break;
      case "main_portfolio_u":
        textToCopy = profileLinkPortfolio + "?u=_";
        break;
      case "detail_portfolio":
        textToCopy = portfolioLink;
        break;
      case "detail_portfolio_u":
        textToCopy = portfolioLink + "?u=_";
        break;
      case "copyall":
        textToCopy = `CV: ${profileLinkCv}\nCover letter: ${profileLinkCoverletter}\nPortfolio Main: ${profileLinkPortfolio}\n${portfoliosList
          .map((obj, index) => `Portfolio ${index + 1}: ${obj}`)
          .join("\n")}`;
        break;
      case "copyall_u":
        textToCopy = `CV: ${profileLinkCv + "?u=_"}\nCover letter: ${
          profileLinkCoverletter + "?u=_"
        }\nPortfolio Main: ${profileLinkPortfolio + "?u=_"}\n${portfoliosList
          .map((obj, index) => `Portfolio ${index + 1}: ${obj + "?u=_"}`)
          .join("\n")}`;
        break;
      default:
        return;
    }

    navigator.clipboard.writeText(textToCopy);
    alert(`Copied ${type.toUpperCase()} link to clipboard!`); // Simple confirmation
  };

  // --- Rendering (Angular Template -> React JSX) ---

  return (
    <div className="w-full h-screen flex-col">
      {/* Error Area */}
      {isError && (
        <div className="flex flex-col gap-4">
          <div className="alert alert-danger" role="alert">
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Text Area and Matched Skills list */}
      <div className="w-auto p-3 flex-grow">
        <div className="flex mb-2">
          {/* Textarea (Angular #jobDescription ref is now state + onChange) */}
          <textarea
            rows={15}
            className="textarea h-3/4 flex-1"
            placeholder="Write message"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          ></textarea>

          {/* Matched Profiles Area */}
          <div className="flex-col w-[50%] ml-4 h-[320px] overflow-y-auto overflow-x-hidden border p-2">
            <input
              type="text"
              className="input p-1 mb-2 w-full border rounded"
              placeholder="search matched profiles"
              onChange={(e) => searchMatchedProfiles(e.target.value)}
            />
            {matchedProfiles.map((item, i) => (
              <div key={item.unique_id} className="border-b">
                <h2>
                  <button
                    type="button"
                    className="text-[15px] flex items-center justify-between w-full py-2 font-medium rtl:text-right text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400 gap-3"
                    onClick={() => toggleItem(i)}
                  >
                    {item.designation}
                    <div className="text-green-500 font-bold">
                      {item.matched_percentage} %
                    </div>
                  </button>
                </h2>
                <div
                  className={`${!item.isOpen ? "hidden" : ""} p-2 bg-gray-50`}
                >
                  <p className="m-2">
                    <a
                      target="_blank"
                      href={`http://${currentDomain}/${item.unique_id}`}
                    >
                      Visit Website
                    </a>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {item.new_skills.map((itemChild) => (
                      <span
                        key={itemChild.id}
                        className="text-xs bg-blue-100 px-2 py-1 rounded"
                      >
                        {itemChild.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-3/4">
          <button
            className="btn btn-primary mr-2 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            onClick={fetchSkills}
          >
            Fetch Skills
          </button>
          <button
            className="btn btn-secondary bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
            onClick={fetchMatchedProfiles}
          >
            Fetch Matched Profiles
          </button>
        </div>
      </div>

      <div className="flex h-3/4 border-t mt-4 pt-4">
        {/* Selected Skills Area (Left Column) */}
        <div className="w-1/3 m-3 flex-col overflow-y-auto border p-2">
          <h3 className="font-bold mb-3">Selected Skills by Category</h3>
          {allCategories.map((category, index) => {
            // Replaces Angular pipe
            const skillsInCategory = filterBy(
              selectedSkills,
              ["catagory"],
              category.id
            );

            return (
              <div key={index}>
                {skillsInCategory.length > 0 && (
                  <div
                    className="my-2 p-2 bg-neutral-200 rounded-lg cursor-pointer flex justify-between hover:bg-neutral-300"
                    onClick={() => expandCollapse(category)}
                  >
                    <div>{category.id}</div>
                  </div>
                )}

                {category.expand && (
                  <div>
                    {skillsInCategory.map((skill, index) => (
                      <div
                        key={index}
                        className="ml-7 flex justify-between border rounded-lg bg-slate-100 p-2 py-2 pl-2 my-2"
                        onMouseEnter={() => showDeleteButton(skill)}
                        onMouseLeave={() => hideDeleteButton(skill)}
                      >
                        <div className="">{skill.title}</div>
                        {skill.isDeleteButtonVisible && (
                          <div className="ml-auto flex">
                            <button
                              onClick={() =>
                                onDeleteClick(skill.id, "SelectedSkills")
                              }
                            >
                              <div className="text-red-700 font-bold border px-2 bg-red-100 rounded-lg mr-2 text-sm">
                                Delete
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* All Skills Area (Middle Column) */}
        <div className="w-1/3 m-3 flex-col overflow-y-auto border p-2">
          <h3 className="font-bold mb-3">All Skills</h3>
          {/* Category Select for New Skills */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="select w-full p-2 border rounded mb-2"
          >
            {allCategories.map((category, index) => (
              <option key={index} value={category.id}>
                {category.id}
              </option>
            ))}
          </select>
          {/* Search Input */}
          <input
            type="text"
            className="input p-1 w-full border rounded mb-3"
            placeholder="search all skills"
            onChange={(e) => searchSkills(e.target.value)}
          />

          {/* List of All Skills */}
          {allSkills.map((skill, index) => (
            <div
              key={index}
              className="my-2 p-2 flex justify-between border rounded-lg bg-slate-100 hover:bg-slate-200"
              onMouseEnter={() => showDeleteButton(skill)}
              onMouseLeave={() => hideDeleteButton(skill)}
            >
              <div>{skill.title}</div>
              {skill.isDeleteButtonVisible && (
                <button onClick={() => onAddClick(skill, selectedCategory)}>
                  <div className="text-green-950 font-bold border px-2 bg-green-300 rounded-lg text-sm">
                    Add
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Profile Creation Area (Right Column) */}
        <div className="w-1/3 m-3 flex-col overflow-y-auto border p-2">
          <h3 className="font-bold mb-3">Profile Details</h3>
          <div className="flex-col mb-3">
            Main Category Intro
            <select
              value={mainCategoryId}
              className="select w-full mt-2 p-2 border rounded"
              onChange={(e) => onChangeCategory(e.target.value)}
            >
              {allCategories.map((category, index) => (
                <option key={index} value={category.id}>
                  {category.id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-col mt-3">
            Designation
            <input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              type="text"
              className="input w-full mt-2 p-2 border rounded"
              placeholder="Designation"
            />
          </div>
          <div className="flex-col mt-3">
            Experience (Not used in TS logic but in HTML)
            <input
              type="text"
              className="input w-full mt-2 p-2 border rounded"
              placeholder="Experience"
            />
          </div>
          <div className="flex-col mt-3">
            Tag Line
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              type="text"
              className="input w-full mt-2 p-2 border rounded"
              placeholder="Tagline"
            />
          </div>
          <div className="flex-col mt-3">
            Domain
            <select
              value={mainDomain.main_id || ""}
              className="select w-full mt-3 p-2 border rounded"
              onChange={(e) => {
                const selected = mainProfiles.find(
                  (p) => p.id === e.target.value
                );
                if (selected) {
                  setMainDomain({
                    main_id: selected.id,
                    domain: selected.domain,
                  });
                }
              }}
            >
              {mainProfiles.map((mainProfile, index) => (
                <option key={index} value={mainProfile.id}>
                  {mainProfile.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex mt-4 items-center">
            <button
              className="btn btn-primary bg-green-600 text-white p-2 rounded disabled:opacity-50"
              disabled={isCreatingProfile}
              onClick={createProfile}
            >
              {isCreatingProfile ? "Creating ..." : "Create Profile"}
            </button>

            {profileLinkCoverletter && (
              <div className="ml-4 flex items-center">
                <button
                  className="mr-1 px-2 bg-slate-300 text-gray-800 border rounded-md text-sm"
                  onClick={() => copyText("copyall", 0)}
                >
                  Copy All
                </button>
                <button
                  className="px-2 bg-green-300 text-green-800 border rounded text-sm"
                  onClick={() => copyText("copyall_u", 0)}
                >
                  Copy All U
                </button>
              </div>
            )}
          </div>

          <div className="mt-3">
            <hr />
          </div>

          {/* Profile Links Output */}
          {profileLinkCv && (
            <LinkOutputRow
              label="CV"
              link={profileLinkCv}
              type="cv"
              copyText={copyText}
            />
          )}
          {profileLinkCoverletter && (
            <LinkOutputRow
              label="Cover Letter"
              link={profileLinkCoverletter}
              type="coverletter"
              copyText={copyText}
            />
          )}
          {profileLinkPortfolio && (
            <LinkOutputRow
              label="Portfolio Main"
              link={profileLinkPortfolio}
              type="main_portfolio"
              copyText={copyText}
            />
          )}

          {portfoliosList.map((portfolio, i) => (
            <LinkOutputRow
              key={i}
              label={`P${i + 1}`}
              link={portfolio}
              type="detail_portfolio"
              copyText={copyText}
              portfolioIndex={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Helper Component for Link Output (to clean up the main return) ---

interface LinkOutputRowProps {
  label: string;
  link: string;
  type: string;
  copyText: (type: string, portfolioIndex: number) => void;
  portfolioIndex?: number;
}

const LinkOutputRow: React.FC<LinkOutputRowProps> = ({
  label,
  link,
  type,
  copyText,
  portfolioIndex = 0,
}) => (
  <div className="mt-2 p-1 flex justify-between border-b border-dashed">
    <div className="flex items-center">
      <span className="w-24">
        <a className="pl-4 hover:underline text-sm" href={link} target="_blank">
          {label}
        </a>
      </span>
      <span className="w-4">
        <a
          className="pl-4 text-green-700 hover:underline text-sm"
          href={`${link}?u=_`}
          target="_blank"
        >
          U
        </a>
      </span>
    </div>
    <div>
      <button
        className="mr-1 px-2 bg-slate-300 text-gray-800 border rounded-md text-sm"
        onClick={() => copyText(type, portfolioIndex)}
      >
        Copy
      </button>
      <button
        className="px-2 bg-green-300 text-green-800 border rounded text-sm"
        onClick={() => copyText(`${type}_u`, portfolioIndex)}
      >
        Copy U
      </button>
    </div>
  </div>
);
