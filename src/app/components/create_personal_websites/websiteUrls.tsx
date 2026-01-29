"use client";

import {
  generatePDF,
  resetAllDetailProfilesPDFURLs,
} from "@/app/api_handlers/api/detail_profiles.api";

import React, { useState } from "react";
import ViewPDF from "./ViewPDF";

export default function WebsiteURLs({ data, setData, websitePurpose }) {
  // const [data, setData] = useState(newlyCreatedProfileLinks);

  const [loading, setLoading] = useState(false);
  const [viewPDFOpen, setViewPDFOpen] = useState(false);
  const [selectedPDFUrl, setSelectedPDFUrl] = useState<string | null>(null);
  const [selectedPDFName, setSelectedPDFName] = useState<string>("");

  const handleCopy = (e, linkText) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard
      .writeText(linkText)
      .then(() => {})
      .catch(() => {});
  };

  const handleResetPDF = async () => {
    setLoading(true);
    try {
      const payload: any = {
        id: data.id,
        unique_id: data.uniqe_id,
        type: "single",
      };
      // Use the same API but with type: 'single'
      const res = await resetAllDetailProfilesPDFURLs(payload);
      if (res && res.data && res.data.pdf_urls) {
        setData({ ...data, pdf_urls: res.data.pdf_urls });
      }
    } catch (err) {
      // Optionally handle error
    }
    setLoading(false);
  };

  const fetchPdf = async (type) => {
    setLoading(true);

    const payload: any = {
      unique_id: data.uniqe_id,
      domain: data.domain,
      type,
    };
    const res = await generatePDF(payload);

    if (!res) {
      setLoading(false);
    }
    const responseData = res.data;
    console.log({ responseData });
    if (responseData?.pdf_urls)
      setData({ ...data, pdf_urls: responseData.pdf_urls });

    console.log({ afterData: data });

    setLoading(false);
  };

  return (
    <>
      <ViewPDF
        isOpen={viewPDFOpen}
        onClose={() => {
          setViewPDFOpen(false);
          setSelectedPDFUrl(null);
          setSelectedPDFName("");
        }}
        pdfUrl={selectedPDFUrl || ""}
        fileName={selectedPDFName}
      />
      {data !== null && (
        <div className="mt-6 p-4 border border-blue-200 bg-blue-50 rounded-lg shadow-inner">
          <div>
            <h1 className="text-amber-950 text-xl border-b pb-4 m-4">
              Website ID: {data.designation} ({data.uniqe_id}) <br />
              <span className="text-xs">{data.private_title}</span>
            </h1>
          </div>

          <div className="space-y-2">
            {data?.urls?.map((url, index) => {
              return (
                <div
                  key={`${url.page}-${index}`}
                  className="flex items-center justify-between"
                >
                  <div className={url.is_portfolio_detail ? "pl-6" : ""}>
                    {url.page}
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2 justify-start">
                      {websitePurpose != "personal_website" &&
                        url.tiny_link_without_u && (
                          <a
                            href={url.tiny_link_without_u}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative px-3 py-2 text-sm font-medium whitespace-nowrap bg-blue-50 text-blue-800 border border-blue-200 rounded-md shadow-sm hover:bg-blue-100 hover:shadow-md transition duration-200"
                          >
                            Short Link{" "}
                            <span
                              className="absolute right-0 top-0 bottom-0 px-2 flex items-center text-gray-500 bg-blue-300 hover:bg-blue-500 opacity-0 group-hover:opacity-100 cursor-pointer rounded-r-md transition-opacity duration-200"
                              onClick={(e) =>
                                handleCopy(e, url.tiny_link_without_u)
                              }
                              title="Copy Link"
                            >
                              📋
                            </span>
                          </a>
                        )}

                      {url.tiny_link_with_u && (
                        <a
                          href={url.tiny_link_with_u}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative px-3 py-2 text-sm font-medium whitespace-nowrap bg-blue-50 text-blue-800 border border-blue-200 rounded-md shadow-sm hover:bg-blue-100 hover:shadow-md transition duration-200"
                        >
                          Short Link (U)
                          <span
                            className="absolute right-0 top-0 bottom-0 px-2 flex items-center text-gray-500 bg-blue-300 hover:bg-blue-500 opacity-0 group-hover:opacity-100 cursor-pointer rounded-r-md transition-opacity duration-200"
                            onClick={(e) => handleCopy(e, url.tiny_link_with_u)}
                            title="Copy Link"
                          >
                            📋
                          </span>
                        </a>
                      )}
                      {websitePurpose != "personal_website" &&
                        url.link_without_u && (
                          <a
                            href={url.link_without_u}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative px-3 py-2 text-sm font-medium whitespace-nowrap bg-green-50 text-green-800 border border-green-200 rounded-md shadow-sm hover:bg-green-100 hover:shadow-md transition duration-200"
                          >
                            Direct Link
                            <span
                              className="absolute right-0 top-0 bottom-0 px-2 flex items-center text-gray-500 bg-green-300 hover:bg-green-500 opacity-0 group-hover:opacity-100 cursor-pointer rounded-r-md transition-opacity duration-200"
                              onClick={(e) => handleCopy(e, url.link_without_u)}
                              title="Copy Link"
                            >
                              📋
                            </span>
                          </a>
                        )}
                      <a
                        href={url.link_with_u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative px-3 py-2 text-sm font-medium whitespace-nowrap bg-green-50 text-green-800 border border-green-200 rounded-md shadow-sm hover:bg-green-100 hover:shadow-md transition duration-200"
                      >
                        Direct Link (U)
                        <span
                          className="absolute right-0 top-0 bottom-0 px-2 flex items-center text-gray-500 bg-green-300 hover:bg-green-500 opacity-0 group-hover:opacity-100 cursor-pointer rounded-r-md transition-opacity duration-200"
                          onClick={(e) => handleCopy(e, url.link_with_u)}
                          title="Copy Link"
                        >
                          📋
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}

            {data?.pdf_urls?.length > 0 && (
              <div className="mt-6 p-4 border border-purple-200 bg-purple-50 rounded-lg shadow-inner">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-purple-800 font-semibold">PDF URLs</h2>
                  <div className="flex justify-end mb-2">
                    <button
                      disabled={loading}
                      onClick={handleResetPDF}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        loading
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-purple-600 text-white hover:bg-purple-700"
                      }`}
                    >
                      Reset PDF URLs
                    </button>
                  </div>
                  {loading && (
                    <div className="flex gap-2">
                      Generating...
                      <div className="w-6 h-6 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                  )}
                  {data?.pdf_urls?.every((p) => p.url === null) && (
                    <>
                      <button
                        disabled={loading}
                        onClick={() => fetchPdf("all")}
                        className={`px-4 py-2 text-sm font-medium rounded-md ${
                          loading
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-purple-600 text-white hover:bg-purple-700"
                        }`}
                      >
                        {"Generate All"}
                      </button>
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  {data.pdf_urls.map((p, i) => (
                    <React.Fragment key={`pdf-${p.type}-${i}`}>
                      {(websitePurpose === "personal_website"
                        ? p.type.endsWith("_with_u")
                        : true) && (
                        <div className="flex justify-between items-center border-b border-purple-200 pb-2">
                          <span className="text-purple-900">{p.type}</span>
                          {p.url ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedPDFUrl(p.url);
                                  setSelectedPDFName(`${p.type}.pdf`);
                                  setViewPDFOpen(true);
                                }}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                              >
                                👁️ View
                              </button>
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                              >
                                ⬇️ Download
                              </a>
                            </div>
                          ) : (
                            <button
                              disabled={loading}
                              onClick={() => fetchPdf(p.type)}
                              className={`px-3 py-1 rounded-md ${
                                loading
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : "bg-blue-500 text-white hover:bg-blue-600"
                              }`}
                            >
                              {"Generate"}
                            </button>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
