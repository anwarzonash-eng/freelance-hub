"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";

interface SearchableSelectProps {
  options: Array<{ id: string; name?: string; title?: string }>;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select Option",
  disabled = false,
  searchPlaceholder = "Search...",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);
  const optionName = (opt: any) => opt.name || opt.title || "";
  const filteredOptions = options.filter((opt) =>
    optionName(opt).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          padding: "0.625rem 1rem",
          border: "1px solid #d1d5db",
          borderRadius: "0.5rem",
          width: "100%",
          color: "black",
          backgroundColor: disabled ? "#f3f4f6" : "white",
          fontSize: "0.95rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          fontWeight: "500",
        }}
      >
        <span className="truncate">
          {selectedOption?.name || selectedOption?.title || placeholder}
        </span>
        <ChevronDown
          className="w-5 h-5 flex-shrink-0 ml-2"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "0.5rem",
            backgroundColor: "white",
            border: "1px solid #d1d5db",
            borderRadius: "0.5rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
            zIndex: 50,
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          {/* Search Input */}
          <div
            style={{
              padding: "0.75rem",
              borderBottom: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Search
                className="w-4 h-4"
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  color: "#6b7280",
                }}
              />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  paddingLeft: "2rem",
                  paddingRight: "0.75rem",
                  paddingTop: "0.625rem",
                  paddingBottom: "0.625rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.375rem",
                  color: "black",
                  fontSize: "0.875rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Options List */}
          <div style={{ padding: "0.5rem" }}>
            {/* Clear Option */}
            <button
              onClick={() => {
                onChange(null);
                setIsOpen(false);
                setSearchQuery("");
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "0.625rem 0.875rem",
                marginBottom: "0.25rem",
                backgroundColor: "transparent",
                border: "none",
                borderRadius: "0.375rem",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: "0.875rem",
                transition: "all 0.15s",
                fontStyle: "italic",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = "#f3f4f6";
                (e.target as HTMLElement).style.color = "black";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = "transparent";
                (e.target as HTMLElement).style.color = "#6b7280";
              }}
            >
              ✕ Clear Selection
            </button>

            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: "1rem 0.875rem",
                  color: "#9ca3af",
                  fontSize: "0.875rem",
                  textAlign: "center",
                }}
              >
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.625rem 0.875rem",
                    marginBottom: "0.25rem",
                    backgroundColor:
                      value === option.id ? "#e0e7ff" : "transparent",
                    border: "none",
                    borderRadius: "0.375rem",
                    color: value === option.id ? "#4f46e5" : "black",
                    fontWeight: value === option.id ? "600" : "500",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (value !== option.id) {
                      (e.target as HTMLElement).style.backgroundColor =
                        "#f3f4f6";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (value !== option.id) {
                      (e.target as HTMLElement).style.backgroundColor =
                        "transparent";
                    }
                  }}
                >
                  {option.name || option.title}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
