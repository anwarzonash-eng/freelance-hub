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
} from "lucide-react";
import LogoutButton from "./auth/LogoutButton";
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
};

// --- 2. Flat Menu Data Structure ---
const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: "Dashboard",
  },
  {
    title: "Leads",
    href: "/leads",
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
      {
        title: "Upwork Submitted Proposals",
        href: "/upwork-jobs?type=submitted",
        icon: "SubmittedProposals",
      },
    ],
  },
  {
    title: "Campaigns",
    icon: "Campaigns",
    children: [
      {
        title: "Campaigns",
        href: "/campaigns",
        icon: "Campaigns",
      },
      {
        title: "News Letters",
        href: "/newsletters",
        icon: "NewsLetters",
      },
    ],
  },
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
        title: "Portfolios",
        href: "/manage-portfolios",
        icon: "Briefcase",
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
 * Filters the flat navigation items based on allowed roles (paths).
 */
const filterNavItems = (
  items: NavItem[],
  allowedPaths: string[]
): NavItem[] => {
  return items.filter((item) => {
    if (item.href) {
      const normalizedHref = normalizePath(item.href);
      // Check if the normalized href is in the list of allowed paths
      return normalizedHref && allowedPaths.includes(normalizedHref);
    }
    // Since the structure is flat, any item without an href should be excluded
    return false;
  });
};

/**
 * Recursively searches navItems for a matching href and returns the title.
 */
const findCurrentMenuItem = (
  items: NavItem[],
  currentPath: string
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

  const baseClasses = `flex items-center my-0.5 rounded-sm text-xs font-medium p-1.5 transition-colors duration-200 cursor-pointer`;
  const activeStyle = "bg-teal-600 text-white";
  const hoverStyle = "hover:bg-gray-600 hover:text-white";
  const inactiveStyle = "text-gray-300";

  return (
    <div className="flex flex-col w-52 bg-gray-700 p-2 rounded shadow-2xl border border-gray-600 animate-in fade-in slide-in-from-left-1">
      <h3 className="text-sm font-bold text-white mb-2 pb-1 border-b border-gray-600">
        {item.title}
      </h3>

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
                {/* <IconComponent size={16} className="flex-shrink-0" /> */}
                <span className="ml-2 flex-grow">{child.title}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    nestedOpen === child.title ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </div>

              {nestedOpen === child.title && (
                <div className="pl-4 flex flex-col">
                  {child.children?.map((grandchild) => (
                    <Link
                      key={grandchild.title}
                      href={grandchild.href || "#"}
                      onClick={closePopover}
                      className={`${baseClasses} pl-5 ${
                        isActive(grandchild.href) ? activeStyle : hoverStyle
                      } ${inactiveStyle}`}
                    >
                      <IconComponent size={14} className="flex-shrink-0" />
                      <span className="ml-2">{grandchild.title}</span>
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
            <IconComponent size={16} className="flex-shrink-0" />
            <span className="ml-2">{child.title}</span>
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
        : prev.filter((title) => title !== item.title)
    );
  };

  const baseClasses = `flex items-center my-0.5 rounded-sm text-xs font-medium transition-colors duration-200 cursor-pointer`;
  const paddingClass =
    level === 1 ? "p-2" : level === 2 ? "pl-5 py-1.5" : "pl-9 py-1.5";
  const activeStyle = "bg-gray-700 text-white";
  const hoverStyle = "hover:bg-gray-700 hover:text-white";
  const inactiveStyle = "text-gray-400";

  // --- Render Logic for Parent/Link ---
  if (isParent) {
    return (
      <div className={`space-y-0.5 ${level > 1 ? "mt-0.5" : "mt-1"}`}>
        <div
          onClick={handleItemClick}
          // Parent is active only if it is the current page link OR if it's open (to show children)
          className={`${baseClasses} ${paddingClass} ${
            isSelfActive || isOpen ? activeStyle : hoverStyle
          } ${isCollapsed && level === 1 ? "justify-center" : ""}`}
        >
          <IconComponent size={16} className="flex-shrink-0" />
          {!isCollapsed && (
            <span
              className={`ml-2 flex-grow overflow-hidden whitespace-nowrap ${
                // Change text color based on active state
                level > 1
                  ? "text-gray-300"
                  : isSelfActive
                  ? "text-white"
                  : "text-white font-semibold"
              }`}
            >
              {item.title}
            </span>
          )}
          {!(isCollapsed && level === 1) && (
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${
                isOpen ? "rotate-0" : "-rotate-90"
              } flex-shrink-0`}
            />
          )}
        </div>
        {!isCollapsed && isOpen && (
          <div className="flex flex-col">
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

  // --- Render Logic for Leaf Link (Only this link should be active) ---
  const isCurrentActive = isSelfActive; // Using isSelfActive which is already calculated

  return (
    <Link
      href={item.href || "#"}
      passHref
      className={`${baseClasses} ${paddingClass} ${
        // Leaf links only use isCurrentActive for styling
        isCurrentActive ? activeStyle : `${hoverStyle} ${inactiveStyle}`
      } ${isCollapsed ? "justify-center" : ""} relative`}
    >
      <IconComponent size={16} className="flex-shrink-0" />
      {!isCollapsed && (
        <span
          className={`ml-2 overflow-hidden whitespace-nowrap ${
            isCurrentActive ? "text-white" : "text-gray-300"
          }`}
        >
          {item.title}
        </span>
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
  const [activeMenu, setActiveMenu] = useState<string[]>([]);
  const [popoverMenuTitle, setPopoverMenuTitle] = useState<string | null>(null);
  const pathname = usePathname();

  const roles = useData?.roles || [];

  // --- FILTERING LOGIC IMPLEMENTED HERE ---

  // 1. Normalize the allowed paths from roles
  const allowedPaths = roles
    .map((path: string) => normalizePath(path))
    .filter((path: string | null): path is string => path !== null);

  // 2. Filter the navigation items
  const filteredNavItems = roles.includes("*")
    ? navItems
    : filterNavItems(navItems, allowedPaths);

  // --- END FILTERING LOGIC ---

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
    (item) => item.title === popoverMenuTitle
  );

  const openPopover = (title: string) => {
    setPopoverMenuTitle((prev) => (prev === title ? null : title));
  };
  const closePopover = () => setPopoverMenuTitle(null);

  return (
    <>
      <aside
        className={`bg-gray-800 text-gray-300 shadow-xl fixed left-0 top-0 h-screen ${sidebarWidthClass} flex flex-col transition-all duration-300 z-50 border-r border-gray-700`}
      >
        {/* 1. Header/Logo Section */}
        <div className="flex items-center justify-center h-12 p-1 border-b border-gray-700 transition-all duration-300">
          <Link
            href="/"
            passHref
            className={`text-xl font-bold text-teal-400 hover:text-white ${
              isCollapsed ? "hidden" : "block"
            }`}
          >
            Marketing Tool
          </Link>
          {isCollapsed && (
            <span className="text-xl font-extrabold text-teal-400">T</span>
          )}
        </div>

        {/* 2. Navigation Section */}
        <nav className="flex flex-col flex-grow px-1.5 mt-2 overflow-y-auto">
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
        <div className="p-1.5 border-t border-gray-700 flex justify-center">
          <button
            onClick={handleToggle}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              size={18}
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
