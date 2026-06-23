// components/Header.tsx
"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ChevronLeft,
  ChevronDown,
  FileText,
  Clock,
  Settings,
  Globe,
  Tag,
  LucideIcon,
  Contact,
  Proportions,
  Mail,
  Mails,
  UserPen,
  Aperture,
  Binoculars,
  CalendarCheck,
  CircleDashed,
  File,
  KeyboardMusic,
  UserCheck,
  Handshake,
  Link2,
  BriefcaseBusiness,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";
import LogoutButton from "./auth/LogoutButton";
import NotificationBell from "./notifications/NotificationBell";
import { GlobalConstants } from "@/utils/global";

// --- 1. Typescript Interfaces & Definitions ---

interface NavItem {
  title: string;
  href?: string;
  icon: keyof typeof iconMap;
  children?: NavItem[];
}

interface MenuItemProps {
  item: NavItem;
  isCollapsed: boolean;
  level?: number;
  activeMenu: string[];
  setActiveMenu: React.Dispatch<React.SetStateAction<string[]>>;
  openPopover?: (title: string) => void;
  closePopover?: () => void;
}

interface HeaderProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  collapsedWidth: string;
  expandedWidth: string;
  useData: any; // Keeping the 'any' type as requested
}

const iconMap: { [key: string]: LucideIcon } = {
  Dashboard: LayoutDashboard,
  Leads: Users,
  UpworkJobs: Briefcase,

  Analytics: Globe,
  Reporting: FileText,
  TimeTracking: Clock,
  Configuration: Settings,
  Tags: Tag,
  Contact: Contact,
  SubmittedProposals: Proportions,
  Campaigns: Mail,
  NewsLetters: Mails,
  CreateProfile: UserPen,
  PersonalWebsites: Globe,
  Skills: Tag,
  Categories: Briefcase,
  Icon1: Aperture,
  Icon2: Binoculars,
  Icon3: CalendarCheck,
  Icon4: CircleDashed,
  Icon5: File,
  Icon6: KeyboardMusic,
  Professionals: UserCheck,
  Clients: Handshake,
  SettingsIcon: Settings,
  EmailGateway: Mail,
  ReferralSettings: Link2,
  GlobalSettings: SlidersHorizontal,
  VerifaliaCredentials: ShieldCheck,
  Jobs: BriefcaseBusiness,
};

// --- 2. Flat Menu Data Structure ---
const navItems: NavItem[] = [
  {
    title: "Leads",

    icon: "UpworkJobs",
    children: [
      {
        title: "All Leads",
        href: "/leads",
        icon: "UpworkJobs",
      },
      {
        title: "Upwork Leads",
        href: "/upwork-jobs?type=all",
        icon: "Contact",
      },
      // {
      //   title: "Upwork Submitted Proposals",
      //   href: "/upwork-jobs?type=submitted",
      //   icon: "SubmittedProposals",
      // },
    ],
  },
  // {
  //   title: "Campaigns",
  //   icon: "Campaigns",
  //   children: [
  //     {
  //       title: "Campaigns",
  //       href: "/campaigns",
  //       icon: "Campaigns",
  //     },
  //     {
  //       title: "News Letters",
  //       href: "/newsletters",
  //       icon: "NewsLetters",
  //     },
  //   ],
  // },
  {
    title: "Personal Websites",
    icon: "PersonalWebsites",
    children: [
      {
        title: "Websites",
        href: "/manage-detail-profiles",
        icon: "CreateProfile",
      },
      {
        title: "Main Profiles",
        href: "/main-profiles",
        icon: "Users",
      },
      {
        title: "Portfolios",
        href: "/manage-portfolios",
        icon: "Briefcase",
      },
      {
        title: "Educations",
        href: "/manage-educations",
        icon: "FileText",
      },
      {
        title: "Experiences",
        href: "/experiences",
        icon: "Briefcase",
      },
      {
        title: "Media Upload",
        href: "/media-upload",
        icon: "Aperture",
      },
      {
        title: "Testimonials",
        href: "/manage-testimonials",
        icon: "Contact",
      },
      {
        title: "FAQ",
        href: "/faq",
        icon: "FileText",
      },
      {
        title: "Skill Groups",
        href: "/manage-skill-groups",
        icon: "Categories",
      },
      {
        title: "Skills",
        href: "/manage-skills",
        icon: "Skills",
      },
      {
        title: "Categories",
        href: "/manage-categories",
        icon: "Categories",
      },
    ],
  },
  {
    title: "Jobs",
    icon: "Jobs",
    children: [
      {
        title: "AI Jobs",
        href: "/jobs/ai-jobs",
        icon: "Jobs",
      },
      {
        title: "Companies",
        href: "/jobs/companies",
        icon: "Clients",
      },
      {
        title: "Listed Jobs",
        href: "/jobs/listed-jobs",
        icon: "Reporting",
      },
      {
        title: "CVs",
        href: "/jobs/cvs",
        icon: "Leads",
      },
      {
        title: "Applicants",
        href: "/applicants",
        icon: "Professionals",
      },
    ],
  },
  {
    title: "Professionals",
    icon: "Professionals",
    children: [
      {
        title: "All Professionals",
        href: "/professionals",
        icon: "Professionals",
      },
      {
        title: "Email Campaigns",
        href: "/professionals/email-campaigns",
        icon: "EmailGateway",
      },
      {
        title: "Clients",
        href: "/clients",
        icon: "Clients",
      },
    ],
  },
];
// ...existing code...
// ------------------------------------------

// --- 3. Helper Functions ---

/**
 * Normalizes path by removing trailing slashes, treating empty string as '/'.
 */
const normalizePath = (path: string | undefined): string | null => {
  if (!path) return null;
  // Remove trailing slash, unless the path is just '/'
  const normalized = path.replace(/\/$/, "");
  return normalized === "" ? "/" : normalized;
};

/**
 * Strip query string then normalize, for role comparison.
 * e.g. "/upwork-jobs?type=all" → "/upwork-jobs"
 */
const hrefToPath = (href: string | undefined): string | null =>
  normalizePath((href || "").split("?")[0]);

/**
 * Returns true if `currentPath` is allowed by any entry in `allowedPaths`.
 * Supports prefix matching for dynamic-ID routes:
 *   role "/viewCV"  matches  "/viewCV/1", "/viewCV/42", etc.
 */
export const pathAllowed = (currentPath: string, allowedPaths: string[]): boolean => {
  const curr = normalizePath(currentPath) ?? "";
  return allowedPaths.some((role) => {
    const r = normalizePath(role) ?? "";
    return curr === r || curr.startsWith(r + "/");
  });
};

/**
 * Returns a filtered copy of navItems based on allowed role paths.
 * - Never mutates the original array.
 * - Hides a parent whose every child is inaccessible.
 */
const filterNavItems = (list: NavItem[], allowedPaths: string[]): NavItem[] => {
  const filtered: NavItem[] = [];

  for (const nav of list) {
    if (nav.children && nav.children.length > 0) {
      const accessibleChildren = nav.children.filter((child) => {
        const p = hrefToPath(child.href);
        return p !== null && pathAllowed(p, allowedPaths);
      });
      if (accessibleChildren.length > 0) {
        filtered.push({ ...nav, children: accessibleChildren });
      }
    } else {
      const p = hrefToPath(nav.href);
      if (p !== null && pathAllowed(p, allowedPaths)) {
        filtered.push({ ...nav });
      }
    }
  }

  return filtered;
};

// Helper to flatten navItems (including nested children)
export function getAllNavRoles(
  items = navItems,
): { label: string; value: string }[] {
  return [
    { label: "All", value: "*" },
    { label: "Leads", value: "/leads" },
    { label: "Upwork Jobs", value: "/upwork-jobs" },
    { label: "Manage Detail Profiles", value: "/manage-detail-profiles" },
    { label: "Manage Educations", value: "/manage-educations" },
    { label: "Manage Portfolios", value: "/manage-portfolios" },
    { label: "Main Profiles", value: "/main-profiles" },
    { label: "Experiences", value: "/experiences" },
    { label: "Media Upload", value: "/media-upload" },
    { label: "Manage Testimonials", value: "/manage-testimonials" },
    { label: "Manage Skills", value: "/manage-skills" },
    { label: "Manage Skill Groups", value: "/manage-skill-groups" },
    { label: "FAQ", value: "/faq" },
    { label: "Manage Categories", value: "/manage-categories" },
    { label: "Auth", value: "/auth" },
    { label: "Best Match", value: "/best-match" },
    { label: "AI Jobs", value: "/jobs/ai-jobs" },
    { label: "Companies", value: "/jobs/companies" },
    { label: "Listed Jobs", value: "/jobs/listed-jobs" },
    { label: "CVs", value: "/jobs/cvs" },
    { label: "View CV (print)", value: "/viewCV" },
    { label: "Professionals", value: "/professionals" },
    { label: "Email Campaigns", value: "/professionals/email-campaigns" },
    { label: "Clients", value: "/clients" },
    { label: "Applicants", value: "/applicants" },
    { label: "Settings", value: "/settings" },
  ];
  // const roles: { label: string; value: string }[] = [];
  // function traverse(list: NavItem[], isFirst: boolean = true) {
  //   for (const item of list) {
  //     if (item.href && !isFirst) {
  //       roles.push({ label: item.title, value: item.href });
  //     }
  //     if (item.children) {
  //       traverse(item.children, false);
  //     }
  //   }
  // }
  // traverse(items);
  // return roles;
}
/**
 * Recursively searches navItems for a matching href and returns the title.
 */
const findCurrentMenuItem = (
  items: NavItem[],
  currentPath: string,
): string | null => {
  // Note: This helper must use path normalization too to be reliable with usePathname
  const normalizedCurrentPath = normalizePath(currentPath);

  for (const item of items) {
    if (normalizePath(item.href) === normalizedCurrentPath) {
      return item.title;
    }

    if (item.children) {
      const foundTitle = findCurrentMenuItem(item.children, currentPath);
      if (foundTitle) {
        return foundTitle;
      }
    }
  }
  return null;
};

// --- 4. Popover Content Component ---
const PopoverMenuContent: React.FC<{
  item: NavItem;
  closePopover: () => void;
}> = ({ item, closePopover }) => {
  const pathname = usePathname();
  // FIX: Use normalizePath here for consistency
  const isActive = (href: string | undefined) =>
    !!href && normalizePath(pathname) === normalizePath(href);

  const [nestedOpen, setNestedOpen] = useState("");

  const baseClasses = `flex items-center my-px rounded text-[11px] font-medium px-2 py-1 transition-colors duration-150 cursor-pointer`;
  const activeStyle = "bg-teal-50 text-teal-700";
  const hoverStyle = "hover:bg-gray-100 hover:text-gray-900";
  const inactiveStyle = "text-gray-600";

  return (
    <div className="flex flex-col w-48 bg-white p-1.5 rounded shadow-lg border border-gray-200 animate-in fade-in slide-in-from-left-1">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 px-1 pb-1 border-b border-gray-100">
        {item.title}
      </div>

      {item.children?.map((child) => {
        const IconComponent = iconMap[child.icon] || LayoutDashboard;
        const isChildParent = child.children && child.children.length > 0;

        if (isChildParent) {
          return (
            <div key={child.title} className="relative">
              <div
                onClick={() =>
                  setNestedOpen(nestedOpen === child.title ? "" : child.title)
                }
                className={`${baseClasses} ${
                  nestedOpen === child.title ? activeStyle : hoverStyle
                }`}
              >
                <span className="grow">{child.title}</span>
                <ChevronDown
                  size={11}
                  className={`transition-transform duration-150 ${
                    nestedOpen === child.title ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </div>

              {nestedOpen === child.title && (
                <div className="pl-3 flex flex-col">
                  {child.children?.map((grandchild) => (
                    <Link
                      key={grandchild.title}
                      href={grandchild.href || "#"}
                      onClick={closePopover}
                      className={`${baseClasses} ${
                        isActive(grandchild.href) ? activeStyle : hoverStyle
                      } ${inactiveStyle}`}
                    >
                      <span>{grandchild.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <Link
            key={child.title}
            href={child.href || "#"}
            onClick={closePopover}
            className={`${baseClasses} ${
              isActive(child.href) ? activeStyle : hoverStyle
            } ${inactiveStyle}`}
          >
            <span>{child.title}</span>
          </Link>
        );
      })}
    </div>
  );
};

// --- 5. Recursive Menu Item Component ---
const MenuItem: React.FC<MenuItemProps> = ({
  item,
  isCollapsed,
  level = 1,
  activeMenu,
  setActiveMenu,
  openPopover,
}) => {
  const pathname = usePathname();
  const IconComponent = iconMap[item.icon] || LayoutDashboard;
  const isParent = item.children && item.children.length > 0;
  // FIX: Use normalizePath here for consistency
  const isActive = (href: string | undefined) =>
    !!href && normalizePath(pathname) === normalizePath(href);
  const isOpen = activeMenu.includes(item.title);

  // Determines if THIS item itself is the active page link
  const isSelfActive = isActive(item.href);

  const handleItemClick = () => {
    // Popover logic for collapsed Level 1 parent
    if (isCollapsed && isParent && level === 1 && openPopover) {
      openPopover(item.title);
      return;
    }

    // Normal sidebar expansion/collapse logic
    setActiveMenu((prev) =>
      !isOpen
        ? [...prev, item.title]
        : prev.filter((title) => title !== item.title),
    );
  };

  const baseClasses = `flex items-center my-px rounded text-[11px] font-medium transition-colors duration-150 cursor-pointer`;
  const paddingClass =
    level === 1 ? "px-2.5 py-1.5" : level === 2 ? "pl-3 py-1" : "pl-5 py-1";
  const activeStyle =
    level === 1 ? "bg-gray-100 text-gray-900 font-semibold" : "text-teal-700 font-semibold";
  const hoverStyle = "hover:bg-gray-100 hover:text-gray-900";
  const inactiveStyle = level === 1 ? "text-gray-700 font-semibold" : "text-gray-500";

  // --- Render Logic for Parent/Link ---
  if (isParent) {
    return (
      <div className={level > 1 ? "mt-px" : "mt-0.5"}>
        <div
          onClick={handleItemClick}
          className={`${baseClasses} ${paddingClass} ${
            isSelfActive || isOpen ? activeStyle : `${hoverStyle} ${inactiveStyle}`
          } ${isCollapsed && level === 1 ? "justify-center" : ""}`}
        >
          {isCollapsed && level === 1 ? (
            <IconComponent size={14} className="shrink-0" />
          ) : (
            <>
              <span className="grow overflow-hidden whitespace-nowrap">
                {item.title}
              </span>
              <ChevronDown
                size={10}
                className={`transition-transform duration-150 shrink-0 text-gray-400 ${
                  isOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </>
          )}
        </div>
        {!isCollapsed && isOpen && (
          <div className="flex flex-col border-l-2 border-gray-100 ml-3 mt-0.5 mb-0.5">
            {item.children!.map((child) => (
              <MenuItem
                key={child.title}
                item={child}
                isCollapsed={isCollapsed}
                level={level + 1}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Render Logic for Leaf Link ---
  const isCurrentActive = isSelfActive;

  return (
    <Link
      href={item.href || "#"}
      passHref
      className={`${baseClasses} ${paddingClass} ${
        isCurrentActive ? activeStyle : `${hoverStyle} ${inactiveStyle}`
      } ${isCollapsed ? "justify-center" : ""} relative`}
    >
      {isCollapsed ? (
        <IconComponent size={14} className="shrink-0" />
      ) : (
        <span className="overflow-hidden whitespace-nowrap">{item.title}</span>
      )}
    </Link>
  );
};

// --- 6. Main Header Component ---
const Header: React.FC<HeaderProps> = ({
  isCollapsed,
  toggleSidebar,
  collapsedWidth,
  expandedWidth,
  useData,
}) => {
  const [activeMenu, setActiveMenu] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("sidebar_expanded_menus");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [popoverMenuTitle, setPopoverMenuTitle] = useState<string | null>(null);
  const pathname = usePathname();

  // Persist which submenus are expanded so they stay open across navigations/reloads.
  useEffect(() => {
    try {
      localStorage.setItem("sidebar_expanded_menus", JSON.stringify(activeMenu));
    } catch {}
  }, [activeMenu]);

  const roles = JSON.parse(localStorage.getItem("roles")) || ["*"];

  // --- FILTERING LOGIC IMPLEMENTED HERE ---

  // Normalize stored role paths (strip trailing slashes; query strings already absent in roles)
  const allowedPaths = roles
    .map((path: string) => normalizePath(path))
    .filter((path: string | null): path is string => path !== null);

  // Filter nav: pass normalised allowedPaths so hrefToPath comparisons are symmetric
  const filteredNavItems = roles.includes("*")
    ? navItems
    : filterNavItems(navItems, allowedPaths);

  // --- END FILTERING LOGIC ---

  // Settings is no longer part of the main nav — only show its icon to roles that include it
  const canAccessSettings = roles.includes("*") || pathAllowed("/settings", allowedPaths);

  // --- EFFECT TO UPDATE DOCUMENT TITLE ---
  useEffect(() => {
    const currentTitle = findCurrentMenuItem(navItems, pathname);
    const baseTitle = GlobalConstants.APP_BASE_TITLE;

    if (currentTitle) {
      document.title = `${currentTitle} | ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [pathname]);

  // --- Component Logic ---
  const handleToggle = () => {
    toggleSidebar();
    setActiveMenu([]);
    setPopoverMenuTitle(null);
  };

  const sidebarWidthClass = isCollapsed ? collapsedWidth : expandedWidth;
  // Use the original navItems for the Popover logic (though popover won't show with flat structure)
  const activePopoverItem = navItems.find(
    (item) => item.title === popoverMenuTitle,
  );

  const openPopover = (title: string) => {
    setPopoverMenuTitle((prev) => (prev === title ? null : title));
  };
  const closePopover = () => setPopoverMenuTitle(null);

  return (
    <>
      <aside
        className={`bg-white text-gray-700 shadow-sm fixed left-0 top-0 h-screen ${sidebarWidthClass} flex flex-col transition-all duration-300 z-50 border-r border-gray-200`}
      >
        {/* 1. Header/Logo Section */}
        {isCollapsed && (
          <div className="flex items-center justify-center h-9 px-1 border-b border-gray-100 transition-all duration-300">
            <span className="text-sm font-extrabold text-teal-600">M</span>
          </div>
        )}

        {/* 2. Navigation Section */}
        <nav className="flex flex-col grow px-1.5 mt-1 overflow-y-auto">
          {/* 🔑 RENDER THE FILTERED MENU ITEMS */}
          {filteredNavItems.map((item) => (
            <MenuItem
              key={item.title}
              item={item}
              isCollapsed={isCollapsed}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              openPopover={item.children ? openPopover : undefined}
            />
          ))}
        </nav>

        {!isCollapsed && <LogoutButton />}
        {/* 3. Footer/Toggle Button Section */}
        <div className={`px-1.5 py-1 border-t border-gray-200 flex items-center ${canAccessSettings ? "justify-between" : "justify-center"}`}>
          {canAccessSettings && (
            <div className="flex items-center gap-0.5">
              <Link
                href="/settings"
                passHref
                className={`p-1 rounded transition-colors ${
                  normalizePath(pathname)?.startsWith("/settings")
                    ? "text-teal-600 bg-teal-50"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                }`}
                aria-label="Settings"
                title="Settings"
              >
                <Settings size={14} />
              </Link>
              <NotificationBell />
            </div>
          )}
          <button
            onClick={handleToggle}
            className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              size={14}
              className={`transition-transform duration-300 ${
                isCollapsed ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>
        </div>
      </aside>

      {/* --- FLOATING POPOVER MENU (CONDITIONAL RENDERING) --- */}
      {isCollapsed && activePopoverItem && activePopoverItem.children && (
        <div
          className="fixed left-0 top-0 h-screen w-full z-40"
          onClick={closePopover}
        >
          <div
            className="absolute left-14 top-2 pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <PopoverMenuContent
              item={activePopoverItem}
              closePopover={closePopover}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
