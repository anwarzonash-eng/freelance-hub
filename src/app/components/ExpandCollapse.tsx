import React, { useState, useRef, useEffect } from "react";

function ExpandCollapse({
  title,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className = "",
}) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const contentRef = useRef(null);
  const [contentMaxH, setContentMaxH] = useState("0px");

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // measure scrollHeight for smooth transition
    const height = el.scrollHeight;
    setContentMaxH(isOpen ? `${height}px` : "0px");
  }, [isOpen, children]);

  function toggle() {
    const next = !isOpen;
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  return (
    <div className={`border rounded-lg overflow-hidden shadow-sm ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 focus:outline-none"
      >
        <div className="text-left">
          {title ?? <span className="font-medium">Details</span>}
        </div>
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 8l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* animated container using measured maxHeight */}
      <div
        ref={contentRef}
        style={{ maxHeight: contentMaxH }}
        className="transition-[max-height] duration-300 ease-in-out overflow-hidden bg-white px-4"
      >
        <div className="py-3">{children}</div>
      </div>
    </div>
  );
}

export default ExpandCollapse;
