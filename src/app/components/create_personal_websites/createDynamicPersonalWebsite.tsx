"use client";

import React, { useState, useEffect, use } from "react";
import { addSubmittedUPworkJobs } from "../../api_handlers/api/upwork.api";
import { Elsie_Swash_Caps } from "next/font/google";
import { getALLMainProfiles } from "../../api_handlers/api/main_profiles.api";
import { getAllSkills, findSkills } from "../../api_handlers/api/skills.api";
import { getAllSkillGroups } from "../../api_handlers/api/skill_groups.api";
import { getAllCategories } from "../../api_handlers/api/categories.api";
import ExpandCollapse from "../ui/ExpandCollapse";
import ChecklistSelector from "../ui/ChecklistSelector";
import Loading from "../ui/Loading";
import DropdownTableSearch from "../ui/DropdownTableSearch";
import WebsiteURLs from "./websiteUrls";
import GenericPopup from "../popups/GenericPopup";
import CreateDynamicProfilePage from "@/app/create-personal-profile/page";
import CreateSkill from "./CreateSkill";
import CreateSkillGroup from "./CreateSkillGroup";
import CreateCategory from "./CreateCategory";

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

// Extended skill used in UI, includes matching flags
interface FormattedSkill extends Skill {
  isMatchedSkillGroup?: boolean;
  isMatchedSkillCategory?: boolean;
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

export default function CreateDynamicPersonalWebsite({
  setSelectWebsite = null,
  selectedWebsite = null,
  description = null,
  isCloseOnSelect = false,
  setOpenCloseWebsiteCreatePopUP = null,
  websitePurpose = "remote_job",
  CreatedFor = "",
}) {
  // alert(websitePurpose);
  // --- State Initialization (Angular Properties -> React State) ---
  const [jobDescription, setJobDescription] = useState<string>(description);
  const [matchedCategories, setMatchedCategories] = useState([]);
  const [mainCategoryId, setMainCategoryId] = useState(null);
  const [mainDomain, setMainDomain] = useState<any>({}); // Using 'any' as its shape is complex
  const [tagline, setTagline] = useState<string>("");
  const [designation, setDesignation] = useState<string>("");
  const [privateTitle, setPrivateTitle] = useState<string>("");
  const [hourlyRate, sethourlyRate] = useState(16);
  const [selectedWebsitePurpose, setSelectedWebsitePurpose] =
    useState<string>("upwork");
  const [websiteCreatedFor, setWebsiteCreatedFor] =
    useState<string>(CreatedFor);

  const [experience, setExperience] = useState<string>("");
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [portfoliosList, setPortfoliosList] = useState<string[]>([]);
  const [mainProfiles, setMainProfiles] = useState([]);
  const [uniqueID, setUniqueID] = useState("");
  const [matchedProfiles, setMatchedProfiles] = useState([]);
  const [allSKillGroups, setAllSKillGroups] = useState([]);
  const [allCategoriesRaw, setAllCategoriesRaw] = useState([]); // store all categories from API
  const [profileLinkCv, setProfileLinkCv] = useState<string>("");
  const [profileLinkCoverletter, setProfileLinkCoverletter] =
    useState<string>("");
  const [profileLinkPortfolio, setProfileLinkPortfolio] = useState<string>("");

  const [formatedSelectedSkills, setFormatedSelectedSkills] = useState<
    FormattedSkill[]
  >([]);
  const [allSelectedSkills, setAllSelectedSkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [allSkillsForSearch, setAllSkillsForSearch] = useState<Skill[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]); // filtered by main_profile_id
  const [allCategoriesMultiSelect, setAllCategoriesMultiSelect] = useState([]);

  const [selectedCategories, setSelectedCategories] = useState("");
  const [selectedSkill, setSelectSkill] = useState("");
  const [selectedMainProfile, setSelectedMainProfile] = useState<string | null>(
    "8bc33b51-204f-4a85-9242-4a38c73e35aa"
  );
  const [newlyCreatedProfileLinks, setNewlyCreatedProfileLinks] =
    useState(null);
  const [isLoading, setIsLoading] = useState(null);
  const [isCreateShortURLs, setIsCreateShortURLs] = useState(true);
  const [openAddSkillPopup, setOpenAddSkillPopup] = useState(false);
  const [openAddSkillGroupPopup, setOpenAddSkillGroupPopup] = useState(false);
  const [openAddCategoryPopup, setOpenAddCategoryPopup] = useState(false);
  const [openAddBulkSkillGroupPopup, setOpenAddBulkSkillGroupPopup] =
    useState(false);

  const [selectedSkillToCreateSkillGroup, setSelectedSkillToCreateSkillGroup] =
    useState<string | null>(null);
  const [
    selectedSkillToCreateSkillGroupName,
    setSelectedSkillToCreateSkillGroupName,
  ] = useState<string | null>(null);

  const deleteSkill = (skillId) => {
    // Filter out the skill that matches the given ID
    setAllSelectedSkills((prevSkills) =>
      prevSkills.filter((skillItem) => skillItem.id !== skillId)
    );
    const updatedMatchedCategories = matchedCategories.map((category) => {
      return {
        ...category,
        matchedSkills: category.matchedSkills.filter(
          (item) => item.id !== skillId
        ),
      };
    });
    setMatchedCategories(updatedMatchedCategories);
  };
  const clear = () => {
    setAllSelectedSkills([]);
    setMatchedCategories([]);
    setAllCategoriesMultiSelect([]);
    setAllCategories([]);
    // setMainProfiles([]);
    setAllSkills([]);
    setNewlyCreatedProfileLinks(null);
    isCloseOnSelect && setSelectWebsite && setSelectWebsite(null);
    setSelectSkill("select");
    setSelectedCategories("select");
    setDesignation("");
    setTagline("");
    setExperience("");
    setSelectedMainProfile("8bc33b51-204f-4a85-9242-4a38c73e35aa");
    setMainCategoryId(null);
    setJobDescription("");
  };

  // Load all data on mount
  const handleOnLoad = async () => {
    setIsLoading(true);
    try {
      const [skillsRes, skillGroupsRes, categoriesRes, mainProfilesRes] =
        await Promise.all([
          getAllSkills(),
          getAllSkillGroups(),
          getAllCategories(),
          getALLMainProfiles(),
        ]);
      setAllSkills(skillsRes.data);
      setAllSKillGroups(skillGroupsRes.data);
      setAllCategoriesRaw(categoriesRes.data);
      setMainProfiles(mainProfilesRes.data);
      // Filter categories for default main profile
      if (selectedMainProfile) {
        const filtered = categoriesRes.data.filter(
          (cat) => cat.main_profile_id === selectedMainProfile
        );
        setAllCategories(filtered);
        setAllCategoriesMultiSelect(filtered);
      } else {
        setAllCategories([]);
        setAllCategoriesMultiSelect([]);
      }
    } catch (e) {
      // handle error if needed
    }
    setIsLoading(false);
  };

  useEffect(() => {
    handleOnLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter categories when main profile changes
  useEffect(() => {
    if (allCategoriesRaw && selectedMainProfile) {
      const filtered = allCategoriesRaw.filter(
        (cat) => cat.main_profile_id === selectedMainProfile
      );
      setAllCategories(filtered);
      setAllCategoriesMultiSelect(filtered);
    } else {
      setAllCategories([]);
      setAllCategoriesMultiSelect([]);
    }
  }, [selectedMainProfile, allCategoriesRaw]);
  useEffect(() => {}, [allCategoriesMultiSelect]);

  useEffect(() => {
    const modifiedSelectedSkills: FormattedSkill[] = allSelectedSkills.map(
      (skill) => {
        return {
          ...skill,
          isMatchedSkillGroup: allSKillGroups.some((object) => {
            if (
              object.skills_ids &&
              object.skills_ids.skills_ids &&
              object.skills_ids.skills_ids.includes(skill.id)
            )
              return true;
            else false;
          }),
          isMatchedSkillCategory: allCategories.some((object: any) => {
            if (
              object.skills_ids &&
              object.skills_ids.skills_ids &&
              object.skills_ids.skills_ids.includes(skill.id)
            )
              return true;
            else false;
          }),
        };
      }
    );
    setFormatedSelectedSkills(modifiedSelectedSkills);
  }, [allSKillGroups, allSelectedSkills]);

  const transformCategories = async (categories, skills) => {
    // 1. Create efficient lookups: Set of selected skill IDs
    const selectedSkillIdSet = new Set(skills.map((s) => s.id));
    const skillTitleMap = skills.reduce((map, skill) => {
      map[skill.id] = skill.title;
      return map;
    }, {});

    return categories
      .map((category) => {
        const matchedSkills = [];

        // *** FIX APPLIED HERE: Use Optional Chaining and Nullish Coalescing ***
        // Safely access category.skills_ids, then category.skills_ids.skills_ids.
        // If either is null/undefined, 'requiredIds' defaults to an empty array ([]).
        const requiredIds = category.skills_ids?.skills_ids || [];

        requiredIds.forEach((requiredId) => {
          if (selectedSkillIdSet.has(requiredId)) {
            matchedSkills.push({
              id: requiredId,
              title: skillTitleMap[requiredId],
            });
          }
        });

        // Return object with matched skills
        return {
          ...category,
          matchedSkills: matchedSkills,
        };
      })
      .filter((category) => category.matchedSkills.length > 0);
  };

  // Only set selected and matched skills from findSkills API
  const fetchSkills = async () => {
    setIsLoading(true);
    try {
      if (!selectedMainProfile || selectedMainProfile == "All") {
        alert("first select main profile.");
        setIsLoading(false);
        return;
      }
      const data = {
        description: jobDescription,
      };
      const response = await findSkills(data);
      setAllSelectedSkills(response.data.selectedSkills);
      const matchedSkills = await transformCategories(
        allCategories,
        response.data.selectedSkills
      );
      setMatchedCategories(matchedSkills);
      setIsError(false);
      setErrorMessage("");
    } catch (error: any) {
      setIsError(true);
      setErrorMessage(error.message || "Failed to fetch skills.");
    }
    setIsLoading(false);
  };

  const addSkill = () => {
    const categoryExists = matchedCategories.find(
      (category) => category.id === selectedCategories
    );
    const skill = allSkills.find((skill) => skill.id === selectedSkill);

    if (!categoryExists) {
      const newcategory = allCategories.find(
        (category) => category.id === selectedCategories
      );
      const updatedCategories = [
        ...matchedCategories,
        {
          id: newcategory.id,
          name: newcategory.name,
          matchedSkills: [
            {
              id: selectedSkill,
              title: skill.title,
            },
          ],
        },
      ];
      setMatchedCategories(updatedCategories);
      console.log({
        updatedCategories,
        skill,
        categoryExists,
        selectedCategories,
        selectedSkill,
      });
    } else {
      const updatedCategories = matchedCategories.map((category) => {
        if (category.id === selectedCategories) {
          const isSkillExist = category.matchedSkills.find(
            (skill) => skill.id === selectedSkill
          );
          if (isSkillExist) return category;
          else
            return {
              ...category,
              matchedSkills: [
                ...category.matchedSkills,
                { id: selectedSkill, title: skill.title },
              ],
            };
        }
        return category;
      });

      setMatchedCategories(updatedCategories);
    }

    const isSkillExistInAllSelectedSkills = allSelectedSkills.find(
      (skill) => skill.id === selectedSkill
    );
    if (!isSkillExistInAllSelectedSkills) {
      const updateAllSelectedSkills = [
        ...allSelectedSkills,
        {
          id: selectedSkill,
          title: skill.title,
        },
      ];

      setAllSelectedSkills(updateAllSelectedSkills);
    }
  };

  const addNewSkill = () => {
    const skill = allSkills.find((skill) => skill.id === selectedSkill);
    const isSkillExistInAllSelectedSkills = allSelectedSkills.find(
      (skill) => skill.id === selectedSkill
    );
    if (!isSkillExistInAllSelectedSkills) {
      const updateAllSelectedSkills = [
        ...allSelectedSkills,
        {
          id: selectedSkill,
          title: skill.title,
        },
      ];

      setAllSelectedSkills(updateAllSelectedSkills);
    }
  };

  const changeMaincategory = (categoryid) => {
    const category = allCategories.find(
      (category) => category.id === categoryid
    );
    category && setDesignation(category.designation);
    category && setTagline(category.tagline);
    category && setPrivateTitle(category.designation);
    setMainCategoryId(categoryid);
  };

  const deleteSkillFromCategroy = (skillId, categoryId) => {
    const updateMatchedCategory = matchedCategories?.map((category) => {
      if (category.id == categoryId) {
        return {
          ...category,
          matchedSkills: category.matchedSkills.filter(
            (item) => item.id !== skillId
          ),
        };
      } else return category;
    });
    setMatchedCategories(updateMatchedCategory);
  };
  const deleteSkillCategroy = (categoryId) => {
    const updateMatchedCategory = matchedCategories?.filter(
      (category) => category.id != categoryId
    );
    setMatchedCategories(updateMatchedCategory);
  };
  // useEffect(() => {
  //   const matchedSkills = transformCategories(allCategories, allSelectedSkills);
  //   setMatchedCategories(matchedSkills);

  // }, [allSelectedSkills]);

  const createProfile = async () => {
    let skillsData = allSelectedSkills.map((item) => item.id);
    const detailServices = allCategoriesMultiSelect
      .filter((skill: any) => {
        return skill.checked && skill.checked === true;
      })
      .map((category) => {
        const type = "detail";
        const category_id = category.id;
        return { type, category_id, skills: skillsData };
      });
    if (
      allSelectedSkills.length < 1 ||
      // matchedCategories.length < 1 ||
      detailServices.length < 1 ||
      !designation ||
      !tagline ||
      !privateTitle ||
      !(hourlyRate && hourlyRate > 0) ||
      mainCategoryId == "select" ||
      selectedMainProfile == "select"
    ) {
      alert("Please fill all required inputs! Thanks");
      console.log({
        allSelectedSkillslength: allSelectedSkills.length,
        matchedCategorieslength: matchedCategories.length,
        designation: !designation,
        tagline: !tagline,
        mainCategoryId,
        selectedMainProfile,
      });
      return;
    }
    setIsLoading(true);
    const mainService = {
      type: "main",
      category_id: mainCategoryId,
      skills: skillsData,
    };
    // const detailServices = matchedCategories.map((category) => {
    //   const type = "detail";
    //   const category_id = category.id;
    //   const skillsData = category.matchedSkills.map((item) => item.id);
    //   return { type, category_id, skills: skillsData };
    // });
    const selectedDomain = mainProfiles.find(
      (options) => options.id === selectedMainProfile
    )?.domain;
    const services = [mainService, ...detailServices];
    const data = {
      skills: skillsData,
      services: services,
      designation: designation,
      tag_line: tagline,
      main_id: selectedMainProfile,
      domain: selectedDomain,
      private_title: privateTitle,
      is_create_tiny_url: isCreateShortURLs,
      hourly_rate: hourlyRate,
      website_purpose: selectedWebsitePurpose,
      website_created_for: websiteCreatedFor,
    };

    try {
      const options: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : undefined,
      };
      const response: any = await fetch(
        `${process.env.NEXT_PUBLIC_PERSONAL_SITES_API_DOMAIN}dynamic_Profile/create`,
        options
      );

      if (response.ok) {
        const data = await response.json();
        // setSelectedUniqueID(data.data.unique_id);
        setUniqueID(data.data.unique_id);

        setNewlyCreatedProfileLinks(data.data);
        isCloseOnSelect && setSelectWebsite && setSelectWebsite(data.data);
      }

      setIsCreatingProfile(false);
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      console.error(error);
      setIsError(true);
      setIsCreatingProfile(false);
      setErrorMessage(error.message || "Failed to create profile.");
    }
  };

  const fetchMatchedProfile = async () => {
    setIsLoading(true);
    if (
      allSelectedSkills.length < 1 ||
      !selectedMainProfile ||
      selectedMainProfile == "All"
    ) {
      alert("Please select some skills & select main profile");

      return;
    }

    const skillsData = allSelectedSkills.map((item) => item.id);

    const data = {
      skill: skillsData,
      main_profile_id: selectedMainProfile,
    };

    try {
      const options: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : undefined,
      };
      const response: any = await fetch(
        `${process.env.NEXT_PUBLIC_PERSONAL_SITES_API_DOMAIN}dynamic_Profile/findmatchedProfile`,
        options
      );

      if (response.ok) {
        const data = await response.json();

        setMatchedProfiles(data.data);
      }
    } catch (error: any) {}
    setIsLoading(false);
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
  const handleCopy = (e, linkText) => {
    e.preventDefault();
    e.stopPropagation();

    navigator.clipboard
      .writeText(linkText)
      .then(() => {})
      .catch((err) => {});
  };

  const selectWebsite = () => {
    isCloseOnSelect && setOpenCloseWebsiteCreatePopUP(false);
  };

  // --- Rendering (Angular Template -> React JSX) ---

  return (
    // Main container: Clean background, padding, and min-height
    <div className="min-h-screen bg-gray-50  p-2">
      {openAddSkillPopup && (
        <GenericPopup
          title="Create Skills"
          onClose={() => setOpenAddSkillPopup(false)}
        >
          <CreateSkill />
        </GenericPopup>
      )}
      {openAddSkillGroupPopup && (
        <GenericPopup
          title="Create Skill Group"
          onClose={() => setOpenAddSkillGroupPopup(false)}
        >
          <CreateSkillGroup
            skill_ids={[selectedSkillToCreateSkillGroup]}
            skill_names={[selectedSkillToCreateSkillGroupName]}
            main_profile_id={selectedMainProfile}
            onSuccess={() => {
              setOpenAddSkillGroupPopup(false);
              fetchSkills();
            }}
          />
        </GenericPopup>
      )}
      {openAddBulkSkillGroupPopup && (
        <GenericPopup
          title="Create Missing Skill Groups"
          onClose={() => setOpenAddBulkSkillGroupPopup(false)}
        >
          <CreateSkillGroup
            skill_ids={formatedSelectedSkills
              .filter((skill) => !(skill as any).isMatchedSkillGroup)
              .map((skill) => String(skill.id))}
            skill_names={formatedSelectedSkills
              .filter((skill) => !(skill as any).isMatchedSkillGroup)
              .map((skill) => skill.title)}
            main_profile_id={selectedMainProfile}
            onSuccess={() => {
              setOpenAddBulkSkillGroupPopup(false);
              fetchSkills();
            }}
          />
        </GenericPopup>
      )}
      {openAddCategoryPopup && (
        <GenericPopup
          title="Create Category"
          onClose={() => setOpenAddCategoryPopup(false)}
        >
          <CreateCategory main_profile_id={selectedMainProfile} />
        </GenericPopup>
      )}
      {isLoading && <Loading isLoading={isLoading} />}
      <div className="flex flex-row justify-between  items-center mb-2">
        <h3 className="text-3xl font-extrabold text-gray-900  text-center">
          Create Website
        </h3>

        <div className="flex gap-2   items-center">
          <DropdownTableSearch
            data={mainProfiles}
            valueKey="id"
            displayKeys={["name", "domain"]} // Columns to show in the dropdown
            imageKeys={["profile_photo_1"]} // No images in this case
            isMultiSelect={false}
            mainDisplayKey="name" // Text to show in the button after selection
            initialSelectValue={selectedMainProfile}
            setInitialSelectValue={setSelectedMainProfile}
          />
          <DropdownTableSearch
            data={allCategories}
            valueKey="id"
            displayKeys={["title"]} // Columns to show in the dropdown
            imageKeys={[]} // No images in this case
            isMultiSelect={false}
            mainDisplayKey="title" // Text to show in the button after selection
            initialSelectValue={mainCategoryId}
            setInitialSelectValue={changeMaincategory}
          />

          {isCloseOnSelect && selectedWebsite && (
            <button
              className="p-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 self-end md:self-auto"
              onClick={selectWebsite}
            >
              Select Website
            </button>
          )}
        </div>
      </div>
      <div className="border-b mb-2"></div>
      {/* Error Area */}
      {isError && (
        <div className="p-4 mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded shadow-md">
          <p className="font-bold">Error:</p>
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Top Section: Description Input & Fetch Button */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <textarea
            id="jobDescription"
            rows={20}
            className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-inner flex-1"
            placeholder="Paste the job description or a list of required skills here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          ></textarea>

          <div className="flex flex-col gap-1 ">
            <button
              className=" w-full  px-6 py-2 flex flex-col bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 self-end md:self-auto"
              onClick={fetchSkills}
            >
              Analyze & Fetch Skills
            </button>
            <button
              className="w-full px-6 py-2 flex flex-col disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed  bg-amber-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 self-end md:self-auto"
              onClick={fetchMatchedProfile}
              disabled={
                !selectedMainProfile ||
                selectedMainProfile == "ALL" ||
                allSelectedSkills.length < 1
              }
            >
              Get Matched Profiles
            </button>
            <button
              className={`
                            w-full px-4 py-2 text-white font-bold rounded-lg shadow-xl transition duration-200 
                            ${
                              isCreatingProfile
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700"
                            }
                        `}
              disabled={isCreatingProfile}
              onClick={createProfile}
            >
              {isCreatingProfile
                ? "Creating Profile..."
                : "Create Dynamic Profile"}
            </button>

            <button
              className={` 
                            w-full px-4 py-2   text-white font-bold rounded-lg shadow-xl transition duration-200 
                             
                                 bg-error-700 hover:bg-error-900
                            
                        `}
              onClick={clear}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <DropdownTableSearch
          data={allSkills}
          valueKey="id"
          displayKeys={["title"]} // Columns to show in the dropdown
          imageKeys={[]} // No images in this case
          isMultiSelect={false}
          mainDisplayKey="title" // Text to show in the button after selection
          initialSelectValue={selectedSkill}
          setInitialSelectValue={setSelectSkill}
        />
        {/* <select
                value={selectedSkill}
                onChange={(e) => setSelectSkill(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-sm flex-1 min-w-[150px] focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="select">-- Select Skill --</option>
                {allSkills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.title}
                  </option>
                ))}
              </select> */}
        <button
          onClick={addNewSkill}
          className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-green-700 transition disabled:opacity-50"
          disabled={!selectedSkill}
        >
          + Add Skill
        </button>
        <button
          className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-green-700 transition disabled:opacity-50"
          onClick={() => setOpenAddSkillPopup(true)}
        >
          Create Skill
        </button>
        <button
          className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-green-700 transition disabled:opacity-50"
          onClick={() => setOpenAddCategoryPopup(true)}
        >
          Create Category
        </button>
        <button
          className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-purple-700 transition disabled:opacity-50"
          onClick={() => setOpenAddBulkSkillGroupPopup(true)}
          disabled={
            !formatedSelectedSkills.some((skill) => !skill.isMatchedSkillGroup)
          }
        >
          Create Missing Skill Groups
        </button>
      </div>
      {/* Main Content Area: Divided into 3 Columns on large screens */}
      <div className="flex flex-col w-full">
        <div>
          {/* --- COLUMN 1: Selected Skills (Left) --- */}

          {formatedSelectedSkills.length > 0 && (
            <ExpandCollapse
              title={`Selected Skills (${formatedSelectedSkills.length})`}
            >
              <div className="lg:col-span-1  bg-white p-5 rounded-xl shadow-lg border border-gray-200">
                <div className="max-h-96 overflow-y-auto">
                  {formatedSelectedSkills.length === 0 ? (
                    <p className="p-4 text-center text-gray-500 italic">
                      Run analysis to see selected skills.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {formatedSelectedSkills.map((skillItem: any) => (
                        <li
                          key={skillItem.id}
                          className="flex items-center justify-between py-2 group hover:bg-indigo-50 rounded-md pr-2 transition-colors"
                        >
                          {/* Skill Title */}
                          <span className="ml-2 text-sm font-medium text-gray-700 truncate">
                            {skillItem.title}
                          </span>
                          <div>
                            {!skillItem.isMatchedSkillCategory ? (
                              <span className="text-red-500 mr-4">
                                No Skill Category
                              </span>
                            ) : (
                              ""
                            )}
                            {!skillItem.isMatchedSkillGroup ? (
                              <button
                                className={
                                  "px-4 py-2 text-white font-bold rounded-lg shadow-xl transition duration-200 bg-gray-400  bg-green-600 hover:bg-green-700"
                                }
                                onClick={() => {
                                  setOpenAddSkillGroupPopup(true);
                                  setSelectedSkillToCreateSkillGroup(
                                    skillItem.id
                                  );
                                  setSelectedSkillToCreateSkillGroupName(
                                    skillItem.title
                                  );
                                }}
                              >
                                Create Skill Group
                              </button>
                            ) : (
                              ""
                            )}
                            {/* Delete Button */}
                            <button
                              onClick={() => deleteSkill(skillItem.id)}
                              className="p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-opacity"
                              title={`Remove ${skillItem.title}`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </ExpandCollapse>
          )}

          {matchedProfiles.length > 0 && (
            <ExpandCollapse
              title={`Matched Profiles (${matchedProfiles.length})`}
            >
              <div className="lg:col-span-1  bg-white p-5 rounded-xl shadow-lg border border-gray-200">
                <div className="max-h-96 overflow-y-auto">
                  {matchedProfiles.length === 0 ? (
                    <p className="p-4 text-center text-gray-500 italic">
                      Run analysis to see Matched Profiles.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {matchedProfiles
                        .sort(
                          (a, b) => b.matched_percentage - a.matched_percentage
                        )
                        .map((profile) => (
                          <li
                            key={profile.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between py-3 px-3 group hover:bg-indigo-50 rounded-lg transition-colors border-b last:border-b-0 border-gray-100"
                          >
                            <div className="flex-shrink-0 mb-2 sm:mb-0 sm:mr-4 min-w-0">
                              <span className="text-sm font-semibold text-gray-800 truncate">
                                <span className="text-indigo-600 font-extrabold mr-1">
                                  {profile.private_title}
                                </span>
                                <span className="text-gray-500 font-normal">
                                  ({profile.matched_percentage}%)
                                </span>
                                <span className="text-blue-600 font-normal">
                                  ({profile.uniqe_id})
                                </span>
                              </span>
                            </div>

                            <div className="flex-grow flex flex-wrap gap-2 items-center min-w-0 mb-2 sm:mb-0">
                              {profile.skills_ids?.length > 0 ? (
                                [
                                  // 1. Render Matched Skills First (Green pills)
                                  ...profile.skills_ids
                                    .filter((skillId) =>
                                      allSelectedSkills.find(
                                        (s) => s.id === skillId
                                      )
                                    )
                                    .map((skillId) => {
                                      const skillTitle =
                                        allSkills.find((s) => s.id === skillId)
                                          ?.title || "...";
                                      return (
                                        <span
                                          key={skillId}
                                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-green-100 text-green-600"
                                        >
                                          {skillTitle}
                                        </span>
                                      );
                                    }),

                                  // 2. Render Unmatched Skills Next (Gray pills)
                                  ...profile.skills_ids
                                    .filter(
                                      (skillId) =>
                                        !allSelectedSkills.find(
                                          (s) => s.id === skillId
                                        )
                                    )
                                    .map((skillId) => {
                                      const skillTitle =
                                        allSkills.find((s) => s.id === skillId)
                                          ?.title || "...";
                                      return (
                                        <span
                                          key={skillId}
                                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-gray-200 text-gray-700"
                                        >
                                          {skillTitle}
                                        </span>
                                      );
                                    }),
                                ]
                              ) : (
                                <span className="text-xs text-gray-400 italic">
                                  No skills listed
                                </span>
                              )}
                            </div>

                            <div className="flex-shrink-0 self-end sm:self-center">
                              <button
                                onClick={() => {
                                  setSelectWebsite && setSelectWebsite(profile);
                                  setNewlyCreatedProfileLinks(profile);
                                }}
                                className="p-1.5 px-3 text-sm rounded-lg text-red-600 border border-red-200 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity transition-colors duration-200"
                                aria-label={`Select profile ${profile.private_title}`}
                              >
                                Select
                              </button>
                            </div>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            </ExpandCollapse>
          )}
          {mainCategoryId && (
            <ExpandCollapse title={"Profile Data"}>
              {/* <DropdownTableSearch
              data={allCategories}
              valueKey="id"
              displayKeys={["name"]} // Columns to show in the dropdown
              imageKeys={[]} // No images in this case
              isMultiSelect={false}
              mainDisplayKey="name" // Text to show in the button after selection
              initialSelectValue={mainCategoryId}
              setInitialSelectValue={changeMaincategory}
            /> */}
              {/* --- COLUMN 3: Profile Details & Output (Right) --- */}
              <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                {/* Input Fields (Styled with better spacing and labels) */}
                {[
                  {
                    label: "Designation",
                    state: designation,
                    setter: setDesignation,
                    type: "text",
                  },

                  {
                    label: "Tag Line",
                    state: tagline,
                    setter: setTagline,
                    type: "text",
                  },
                  {
                    label: "Private Title",
                    state: privateTitle,
                    setter: setPrivateTitle,
                    type: "text",
                  },
                ].map((field, index) => (
                  <div key={index} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1 ">
                      {field.label}
                    </label>
                    <input
                      value={field.state}
                      onChange={(e) => field.setter(e.target.value)}
                      type={field.type}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                    />
                  </div>
                ))}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1 ">
                    Hourly Rate
                  </label>
                  <input
                    value={hourlyRate}
                    onChange={(e) => {
                      const rawValue = e.target.value;

                      if (rawValue === "") {
                        sethourlyRate(0);
                      } else {
                        const numericValue = parseFloat(rawValue);

                        if (!isNaN(numericValue)) {
                          sethourlyRate(numericValue);
                        }
                      }
                    }}
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1 ">
                    Website Purpose
                  </label>
                  <select
                    value={selectedWebsitePurpose}
                    onChange={(e) => setSelectedWebsitePurpose(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                  >
                    <option value="upwork">Upwork</option>
                    <option value="other_freelance_or_remote_jobs">
                      Other Freelance or Remote Jobs
                    </option>
                    <option value="real_office_jobs_remote_hybrid">
                      Real Office Jobs Remote/Hybrid
                    </option>
                    <option value="startups_clients">Startups Clients</option>
                    <option value="students">Students</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1 ">
                    Website Created For (URL)
                  </label>
                  <input
                    value={websiteCreatedFor}
                    onChange={(e) => setWebsiteCreatedFor(e.target.value)}
                    type="text"
                    placeholder="https://example.com"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1 ">
                    <input
                      checked={isCreateShortURLs}
                      onChange={(e) => setIsCreateShortURLs(e.target.checked)}
                      type="checkbox"
                      className="mr-2"
                    />
                    Create Short URLs
                  </label>
                </div>

                {/* Select Fields */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Main Service Category
                  </label>
                  {/* <select
                  value={mainCategoryId}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                  onChange={(e) => changeMaincategory(e.target.value)}
                >
                  <option value="select">-- Select Category --</option>
                  {allCategories.map((category, index) => (
                    <option key={index} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select> */}
                </div>

                {/* Create Profile Button */}
                {/* <button
                className={`
                            w-full px-4 py-3 text-white font-bold rounded-lg shadow-xl transition duration-200 
                            ${
                              isCreatingProfile
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700"
                            }
                        `}
                disabled={isCreatingProfile}
                onClick={createProfile}
              >
                {isCreatingProfile
                  ? "Creating Profile..."
                  : "Create Dynamic Profile"}
              </button>

              <button
                className={` mt-2
                            w-full px-4 py-3 text-white font-bold rounded-lg shadow-xl transition duration-200 
                             
                                 bg-error-700 hover:bg-error-900
                            
                        `}
                onClick={clear}
              >
                Clear
              </button> */}
                {/* Newly Created Links Output */}
                <WebsiteURLs
                  data={newlyCreatedProfileLinks}
                  setData={setNewlyCreatedProfileLinks}
                  websitePurpose={websitePurpose}
                />
              </div>
            </ExpandCollapse>
          )}
          {allCategoriesMultiSelect.length > 0 && (
            <ExpandCollapse
              title={`Select Caegories (${allCategoriesMultiSelect.length})`}
            >
              <br />
              <ChecklistSelector
                items={allCategoriesMultiSelect}
                setItems={setAllCategoriesMultiSelect}
                displayKey={"title"}
                valueKey={"id"}
              />
            </ExpandCollapse>
          )}
          {/* <ExpandCollapse title={"Matched Categories & Add Skill"}>
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-gray-200 h-full">
              <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
                Matched Categories & Skills {matchedCategories.length}
              </h2>

              <div className="flex flex-wrap gap-3 p-3 mb-6 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                <select
                  value={selectedCategories}
                  onChange={(e) => setSelectedCategories(e.target.value)}
                  className="p-2 border border-gray-300 rounded-lg text-sm flex-1 min-w-[150px] focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="select">-- Select Category --</option>
                  {allCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category?.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectSkill(e.target.value)}
                  className="p-2 border border-gray-300 rounded-lg text-sm flex-1 min-w-[150px] focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="select">-- Select Skill --</option>
                  {allSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addSkill}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-green-700 transition disabled:opacity-50"
                  disabled={!selectedCategories || !selectedSkill}
                >
                  + Add Skill
                </button>
              </div>

              <div className="space-y-6 h-full overflow-y-auto pr-2 ">
                {matchedCategories.length === 0 ? (
                  <div className="text-center p-8 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="text-indigo-600 font-medium">
                      No categories matched yet. Start the analysis!
                    </p>
                  </div>
                ) : (
                  matchedCategories.map((category) => (
                    <div
                      key={category.id}
                      // Make the entire card the group for hover deletion
                      className="border group border-gray-200 rounded-xl p-5 bg-white shadow-lg hover:shadow-xl transition duration-300"
                    >
                      <div className="flex justify-between items-start mb-3 border-b pb-2">
                        <h3 className="text-2xl font-extrabold text-indigo-700">
                          {category?.name}
                        </h3>

                        <button
                          onClick={() => deleteSkillCategroy(category.id)}
                          className="p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-opacity"
                          title="Remove Category"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>

                      <p className="text-md font-semibold text-gray-600 mb-2">
                        {category.designation}
                      </p>
                      <p className="text-gray-600 text-sm mb-4 italic border-l-4 border-indigo-300 pl-3 bg-indigo-50 p-2 rounded-md">
                        "{category.tagline}"
                      </p>

                      <h4 className="text-base font-semibold text-gray-700 mb-2 mt-4">
                        Skills ({category.matchedSkills.length}):
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {category.matchedSkills.map((skill: any) => (
                          <span
                            key={skill.id}
                            // Skill Chip: Shows red cross on hover for removal
                            className="group inline-flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-xs font-medium rounded-full border border-teal-300 transition duration-150 ease-in-out cursor-pointer"
                            onClick={() =>
                              deleteSkillFromCategroy(skill.id, category.id)
                            }
                            title={`Remove ${skill.title} from ${category.name}`}
                          >
                            <span className="mr-1">{skill.title}</span>

                            <span
                              className="
                                                        ml-1 p-0.5 
                                                        text-red-500 text-sm font-bold leading-none 
                                                        opacity-0 group-hover:opacity-100 group-hover:bg-red-100 rounded-full 
                                                        transition-opacity duration-150 ease-in-out
                                                    "
                            >
                              &times;
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ExpandCollapse> */}
        </div>

        {/* --- COLUMN 2: Matched Categories & Add Skill Controls (Middle) --- */}
      </div>
    </div>
  );
}
