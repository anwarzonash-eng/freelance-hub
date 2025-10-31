import React, {
  useState,
  useMemo,
  useCallback,
  Dispatch,
  SetStateAction,
  useRef,
  useEffect,
} from "react";
import { createPortal } from "react-dom";

// --- Type Aliases ---
type DataItem<T, V extends string | number> = T & {
  [key: string]: V | string | number | boolean;
};

type SelectValue<V extends string | number> = V | V[];

type DropdownProps<T, V extends string | number> = {
  data: DataItem<T, V>[];
  valueKey: keyof DataItem<T, V>;
  displayKeys: (keyof DataItem<T, V>)[];
  mainDisplayKey: keyof DataItem<T, V>;
  imageKeys?: (keyof DataItem<T, V>)[];
  isMultiSelect?: boolean;
  initialSelectValue: SelectValue<V> | null;
  setInitialSelectValue: Dispatch<SetStateAction<SelectValue<V> | null>>;
};

// ====================================================================================

const DropdownTableSearch = <T, V extends string | number>({
  data,
  valueKey,
  displayKeys,
  mainDisplayKey,
  imageKeys = [],
  isMultiSelect = false,
  initialSelectValue,
  setInitialSelectValue,
}: DropdownProps<T, V>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [alignmentClass, setAlignmentClass] = useState<"left-0" | "right-0">(
    "left-0"
  );
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Refs
  const componentRef = useRef<HTMLDivElement>(null); // NEW: Ref for the entire component container
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const popupWidth = 640; // w-[40rem]

  // --- Utility Functions ---
  const selectedValues: V[] = useMemo(() => {
    if (isMultiSelect) {
      return Array.isArray(initialSelectValue)
        ? (initialSelectValue as V[])
        : [];
    }
    return initialSelectValue ? [initialSelectValue as V] : [];
  }, [isMultiSelect, initialSelectValue]);

  const selectedItems = useMemo(() => {
    return data.filter((item) => selectedValues.includes(item[valueKey] as V));
  }, [data, selectedValues, valueKey]);

  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return data;
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    const searchableKeys = [...displayKeys, ...imageKeys];

    return data.filter((item) =>
      searchableKeys.some((key) =>
        String(item[key]).toLowerCase().includes(lowerCaseSearch)
      )
    );
  }, [data, searchTerm, displayKeys, imageKeys]);

  // --- Handlers ---
  const handleSelect = useCallback(
    (item: DataItem<T, V>) => {
      const value = item[valueKey] as V;

      if (isMultiSelect) {
        const isSelected = selectedValues.includes(value);
        let newValues: V[];

        if (isSelected) {
          newValues = selectedValues.filter((v) => v !== value);
        } else {
          newValues = [...selectedValues, value];
        }

        setInitialSelectValue(
          newValues.length > 0 ? (newValues as SelectValue<V>) : null
        );
        setSearchTerm("");
      } else {
        setInitialSelectValue(value as SelectValue<V> | null);
        setIsOpen(false);
      }
    },
    [isMultiSelect, selectedValues, valueKey, setInitialSelectValue]
  );

  const handleRemoveSelected = useCallback(
    (valueToRemove: V) => {
      const newValues = selectedValues.filter((v) => v !== valueToRemove);
      setInitialSelectValue(
        newValues.length > 0 ? (newValues as SelectValue<V>) : null
      );
    },
    [selectedValues, setInitialSelectValue]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      const listLength = filteredData.length;
      let newIndex = focusedIndex;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          newIndex = (focusedIndex + 1) % listLength;
          break;
        case "ArrowUp":
          e.preventDefault();
          newIndex = (focusedIndex - 1 + listLength) % listLength;
          break;
        case "Space":
          e.preventDefault();
          if (focusedIndex >= 0) {
            handleSelect(filteredData[focusedIndex]);
          }
          return;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          buttonRef.current?.focus();
          return;
        default:
          return;
      }

      setFocusedIndex(newIndex);
      const focusedElement = listRef.current?.children[newIndex];
      focusedElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
    [isOpen, focusedIndex, filteredData, handleSelect]
  );

  const toggleDropdown = () => setIsOpen(!isOpen);

  // -----------------------------------------------------------------------------------

  // --- EFFECT: Click Outside Detection (THE NEW FEATURE) ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click occurred outside the component's main container
      if (
        componentRef.current &&
        !componentRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Attach the listener only when the popup is open
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Cleanup: Remove the listener when the component unmounts or isOpen changes to false
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // --- Other Effects (Alignment and Focus remain the same) ---
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - buttonRect.right;

      if (spaceRight < popupWidth && buttonRect.left > popupWidth) {
        setAlignmentClass("right-0");
      } else {
        setAlignmentClass("left-0");
      }
    }
    setFocusedIndex(-1);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  // -----------------------------------------------------------

  const buttonText =
    selectedItems.length > 0
      ? isMultiSelect
        ? `${selectedItems.length} selected`
        : String(selectedItems[0][mainDisplayKey])
      : "Select an Item";

  return (
    // ⚡ NEW: Attach the ref to the outermost container
    <div
      className="relative max-w-sm"
      ref={componentRef}
      onKeyDown={handleKeyDown}
    >
      {/* -------------------- Selected Items Display (Multi-Select Only) -------------------- */}
      {isMultiSelect && selectedItems.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 p-1 border border-gray-200 rounded-lg bg-gray-50">
          {selectedItems.map((item) => (
            <div
              key={String(item[valueKey])}
              className="flex items-center bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full"
            >
              <span>{String(item[mainDisplayKey])}</span>
              <button
                type="button"
                onClick={() => handleRemoveSelected(item[valueKey] as V)}
                className="ml-1.5 -mr-0.5 text-indigo-600 hover:text-indigo-900 focus:outline-none"
                aria-label={`Remove ${String(item[mainDisplayKey])}`}
              >
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* -------------------- Dropdown Button -------------------- */}
      <button
        ref={buttonRef}
        type="button"
        className="w-full p-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 hover:bg-gray-50 flex justify-between items-center transition duration-150"
        onClick={toggleDropdown}
      >
        <span className="truncate">{buttonText}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* -------------------- Dropdown Panel -------------------- */}
      {isOpen && (
        <div
          className={`absolute z-[99999] mt-2 bg-white border border-gray-200 rounded-lg shadow-2xl max-h-96 overflow-y-auto w-[40rem] ${alignmentClass}`}
        >
          {/* Search Input */}
          <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search by: ${displayKeys
                .map(String)
                .join(", ")}...`}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Table-like Header */}
          <div className="flex text-sm font-semibold text-gray-600 border-b border-gray-200 px-4 py-2 bg-gray-100 sticky top-[72px] z-10">
            {isMultiSelect && <span className="w-10 flex-shrink-0"></span>}

            {displayKeys.map((key) => (
              <span
                key={String(key)}
                className={`flex-1 truncate px-1 ${
                  imageKeys.length > 0 && key === displayKeys[0] ? "pl-24" : ""
                }`}
              >
                {String(key).replace(/_/g, " ").toUpperCase()}
              </span>
            ))}
          </div>

          {/* List Items */}
          <div ref={listRef}>
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => {
                const isItemFocused = index === focusedIndex;
                const isItemSelected = selectedValues.includes(
                  item[valueKey] as V
                );

                return (
                  <div
                    key={String(item[valueKey])}
                    className={`group flex text-base py-3 px-4 cursor-pointer transition-colors duration-100 border-b border-gray-100 last:border-b-0 ${
                      isItemSelected
                        ? "bg-indigo-50 font-medium text-indigo-700 hover:bg-indigo-100"
                        : "hover:bg-gray-50"
                    } ${
                      isItemFocused
                        ? "ring-2 ring-indigo-500 ring-offset-1"
                        : ""
                    }`}
                    onClick={() => handleSelect(item)}
                    role="option"
                    aria-selected={isItemSelected}
                  >
                    {/* Checkbox Column */}
                    {isMultiSelect && (
                      <div className="w-10 flex-shrink-0 flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isItemSelected}
                          readOnly
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    {/* Display Keys */}
                    {displayKeys.map((key, dIndex) => (
                      <span
                        key={`${String(item[valueKey])}-${String(key)}`}
                        className="flex-1 truncate px-1 text-gray-800"
                      >
                        {dIndex === 0 && imageKeys.length > 0 && (
                          <div className="flex flex-shrink-0 items-center space-x-1 float-left mr-3">
                            {imageKeys.slice(0, 4).map((imgKey, imgIndex) => {
                              const imageUrl = String(item[imgKey]);

                              if (!imageUrl || imageUrl === "null") {
                                return (
                                  <div
                                    key={imgIndex}
                                    className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs border border-gray-300 flex-shrink-0"
                                  >
                                    ?
                                  </div>
                                );
                              }
                              return (
                                <img
                                  key={imgIndex}
                                  src={imageUrl}
                                  alt={`Image ${imgIndex + 1}`}
                                  className="w-8 h-8 rounded-full object-cover transition-all duration-200 ease-in-out 
                                                border-2 border-transparent group-hover:border-indigo-400 group-hover:scale-110 flex-shrink-0"
                                />
                              );
                            })}
                          </div>
                        )}
                        {String(item[key])}
                      </span>
                    ))}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-base text-gray-500">
                No results found for "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DropdownTableSearch;
