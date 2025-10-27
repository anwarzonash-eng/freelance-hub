// components/ChecklistSelector.tsx

import React, { useState, useMemo, ChangeEvent } from "react";

type ChecklistSelectorProps = {
  items: any[];
  setItems: (updatedItems: any[]) => void;
  displayKey: string;
  valueKey: string;
  title?: string;
};

const ChecklistSelector = ({
  items,
  setItems,
  displayKey,
  valueKey,
  title = null,
}: ChecklistSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleToggle = (id: any) => {
    const updatedItems = items.map((item) => {
      if (item[valueKey] === id) {
        return {
          ...item,
          checked: !item.checked,
        };
      }
      return item;
    });
    setItems(updatedItems);
  };

  const sortedAndFilteredItems = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();

    const filtered = items.filter((item) => {
      if (!searchTerm) return true;
      const displayValue = String(item[displayKey] || "").toLowerCase();
      return displayValue.includes(lowerSearchTerm);
    });

    return [...filtered].sort((a, b) => {
      if (a.checked && !b.checked) return -1;
      if (!a.checked && b.checked) return 1;
      return 0;
    });
  }, [items, searchTerm, displayKey]);

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white w-full ">
      {title && (
        <h3 className="text-xl font-semibold mb-3 text-gray-800">{title}</h3>
      )}
      <input
        type="text"
        placeholder={`Search by ${displayKey}...`}
        value={searchTerm}
        onChange={handleSearchChange}
        className="w-full p-2 mb-4 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
      />
      <div className="max-h-64 overflow-y-auto space-y-2">
        {sortedAndFilteredItems.length > 0 ? (
          sortedAndFilteredItems.map((item) => (
            <div
              key={String(item[valueKey])}
              className={`flex items-center p-2 rounded-md transition duration-150 cursor-pointer ${
                item.checked
                  ? "bg-blue-200 hover:bg-blue-100"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => handleToggle(item[valueKey])}
            >
              <input
                type="checkbox"
                checked={!!item.checked}
                readOnly
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-3 text-sm font-medium text-gray-700 select-none flex-grow">
                {String(item[displayKey])}
              </label>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 p-2">No results found.</p>
        )}
      </div>
    </div>
  );
};

export default ChecklistSelector;
