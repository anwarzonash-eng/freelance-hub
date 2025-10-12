"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";

export type ParamsMap = Record<string, string>;

export type NewsletterType =
  | "student"
  | "upwork"
  | "tech_stack_wise"
  | "newly_created_domain"
  | "startups";

type TemplateEditorProps = {
  isOpen: boolean;
  onClose: () => void;
  initialHtml?: string;
  initialTitle?: string;
  initialType?: NewsletterType;
  initialValues?: ParamsMap;
  onSubmit?: (data: {
    html: string;
    title: string;
    type: NewsletterType;
    values: ParamsMap;
  }) => void;
};

export default function TemplateEditor({
  isOpen = true,
  onClose = () => {},
  initialHtml = `<h1>Hi \${clientName}</h1>\n<p>Click <a href="\${profile_link}">here</a> to view profile.</p>\n<img src="\${profile_img}" />`,
  initialTitle = "",
  initialType = "student",
  initialValues = { clientName: "", profile_link: "", profile_img: "" },
  onSubmit = () => {},
}: TemplateEditorProps) {
  const [html, setHtml] = useState<string>(initialHtml);
  const [values, setValues] = useState<ParamsMap>(initialValues);
  const [title, setTitle] = useState<string>(initialTitle);
  const [type, setType] = useState<NewsletterType>(initialType);
  const [params, setParams] = useState<string[]>(Object.keys(initialValues));
  const [generated, setGenerated] = useState<boolean>(true);
  const [selectedParam, setSelectedParam] = useState<string>(params[0] || "");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setHtml(initialHtml);
    setTitle(initialTitle);
    setType(initialType);
    setValues(initialValues);
    setParams(Object.keys(initialValues));
    setSelectedParam(Object.keys(initialValues)[0] || "");
    setGenerated(true);
  }, [isOpen, initialHtml, initialTitle, initialType, initialValues]);

  const renderedHtml = useMemo(
    () => applyParamsToHtml(html, values),
    [html, values]
  );

  const updateValue = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleGenerate = () => {
    const regex = /\$\{(.*?)\}/g;
    const found: string[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (!found.includes(match[1])) found.push(match[1]);
    }
    setParams(found);
    setSelectedParam(found[0] || "");

    const newValues: ParamsMap = {};
    found.forEach((p) => (newValues[p] = values[p] ?? ""));
    setValues(newValues);
    setGenerated(true);
  };

  const handleAddParamToSelection = () => {
    if (!selectedParam || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const before = html.substring(0, start);
    const after = html.substring(end);
    setHtml(`${before}\${${selectedParam}}${after}`);
  };

  const handleSubmit = () => {
    if (onSubmit) onSubmit({ html, title, type, values });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/50 p-2 overflow-auto">
      <div className="bg-white w-full w-full h-full rounded-lg shadow-lg flex overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 px-2 py-1 text-xs border rounded-md z-10"
        >
          Close
        </button>

        {/* Left: HTML preview */}
        <div
          className="w-[610px] p-2 border-r overflow-auto bg-white"
          style={{ minWidth: 610 }}
        >
          <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
        </div>

        {/* Right: Editor + Params + Title/Type */}
        <div className="flex-1 flex flex-col p-2 overflow-auto">
          {/* Editor */}
          <textarea
            ref={textareaRef}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="w-full flex-shrink-0 h-1/2 p-2 border rounded-md font-mono text-xs resize-none"
          />

          {/* Parameter select */}
          {params.length > 0 && (
            <div className="flex gap-2 mt-2">
              <select
                value={selectedParam}
                onChange={(e) => setSelectedParam(e.target.value)}
                className="p-1 border rounded-md text-xs"
              >
                {params.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                className="px-2 py-1 text-xs rounded-md border"
                onClick={handleAddParamToSelection}
              >
                Add
              </button>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-2 flex gap-2">
            <button
              className="px-2 py-1 text-xs rounded-md border"
              onClick={handleGenerate}
            >
              Generate Parameters Form
            </button>
            <button
              className="px-2 py-1 text-xs rounded-md border"
              onClick={handleSubmit}
            >
              Save
            </button>
          </div>

          {/* Parameter values form */}
          {generated && params.length > 0 && (
            <div className="mt-2 flex-1 overflow-auto border rounded-md p-2 space-y-2">
              {params.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <label className="w-32 text-xs">{p}</label>
                  <input
                    type="text"
                    placeholder={`Value for ${p}`}
                    value={values[p] ?? ""}
                    onChange={(e) => updateValue(p, e.target.value)}
                    className="flex-1 p-1 border rounded-md text-xs"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Newsletter title and type */}
          <div className="mt-2 flex flex-col gap-2">
            <input
              type="text"
              placeholder="Newsletter Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="p-1 border rounded-md text-xs"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as NewsletterType)}
              className="p-1 border rounded-md text-xs"
            >
              <option value="student">student</option>
              <option value="upwork">upwork</option>
              <option value="tech_stack_wise">tech_stack_wise</option>
              <option value="newly_created_domain">newly_created_domain</option>
              <option value="startups">startups</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function applyParamsToHtml(template: string, values: ParamsMap): string {
  let result = template;
  Object.keys(values).forEach((key) => {
    const val = values[key] ?? "";
    const regex = new RegExp(`\\$\\{${key}\\}`, "g");
    result = result.replace(regex, val);
  });
  return result;
}
