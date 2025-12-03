"use client";

import React, { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const QuillEditor: React.FC<QuillEditorProps> = ({
  value,
  onChange,
  placeholder = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const valueRef = useRef<string>(value);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
      if (quillRef.current) {
        quillRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current || quillRef.current) return;

    // Clear any existing content
    containerRef.current.innerHTML = "";

    // Create editor div
    const editorDiv = document.createElement("div");
    containerRef.current.appendChild(editorDiv);

    // Initialize Quill
    const quill = new Quill(editorDiv, {
      theme: "snow",
      placeholder: placeholder || "Enter text...",
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link"],
          ["clean"],
        ],
      },
    });

    quillRef.current = quill;

    // Set initial content
    if (value) {
      const delta = quill.clipboard.convert({ html: value });
      quill.setContents(delta, "silent");
    } else {
      quill.setText("");
    }

    // Handle text change
    const handleChange = () => {
      const html = quill.root.innerHTML;
      valueRef.current = html;
      onChange(html);
    };

    quill.on("text-change", handleChange);

    // Cleanup function
    return () => {
      quill.off("text-change", handleChange);
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      quillRef.current = null;
    };
  }, [mounted]);

  // Update editor content when value changes externally (not from this editor)
  useEffect(() => {
    if (!quillRef.current) return;

    const currentHtml = quillRef.current.root.innerHTML;

    // Normalize HTML for comparison
    const normalizeHtml = (html: string) => {
      return html
        .replace(/<p><br><\/p>/g, "")
        .replace(/<p><\/p>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    const normalizedValue = normalizeHtml(value || "");
    const normalizedCurrent = normalizeHtml(currentHtml || "");
    const normalizedRef = normalizeHtml(valueRef.current || "");

    // Only update if:
    // 1. The incoming value differs from current editor content
    // 2. The incoming value differs from our ref (which tracks what we last set/emitted)
    if (
      normalizedValue !== normalizedCurrent &&
      normalizedValue !== normalizedRef
    ) {
      const delta = quillRef.current.clipboard.convert({ html: value || "" });
      quillRef.current.setContents(delta, "silent");
      valueRef.current = value;
    }
  }, [value]);

  if (!mounted) {
    return (
      <div className="border rounded-lg px-3 py-2 bg-gray-50 h-32">
        Loading editor...
      </div>
    );
  }

  return <div ref={containerRef} className="bg-white min-h-[200px]" />;
};

export default QuillEditor;
