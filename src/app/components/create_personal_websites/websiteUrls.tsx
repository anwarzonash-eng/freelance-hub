"use client";

import React, { useState, useEffect, use } from "react";

export default function WebsiteURLs({ newlyCreatedProfileLinks }) {
  const handleCopy = (e, linkText) => {
    e.preventDefault();
    e.stopPropagation();

    navigator.clipboard
      .writeText(linkText)
      .then(() => {})
      .catch((err) => {});
  };
  return (
    <>
      {newlyCreatedProfileLinks !== null && (
        <div className="mt-6 p-4 border border-blue-200 bg-blue-50 rounded-lg shadow-inner">
          <div>
            <h1 className="text-amber-950 text-xl border-b pb-4 m-4">
              Website ID: {newlyCreatedProfileLinks.designation} (
              {newlyCreatedProfileLinks.uniqe_id}) <br />
              <span className="text-xs">
                {newlyCreatedProfileLinks.private_title}
              </span>
            </h1>
          </div>

          <div className="space-y-2">
            {newlyCreatedProfileLinks?.urls?.map((url) => {
              return (
                <div key={url} className="flex items-center justify-between">
                  <div className={url.is_portfolio_detail ? "pl-6" : ""}>
                    {url.page}
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2 justify-start">
                      {/* Card 1: Short Link (Tiny without U) */}
                      {url.tiny_link_without_u && (
                        <a
                          href={url.tiny_link_without_u}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative
      px-3 py-2 text-sm font-medium whitespace-nowrap
      bg-blue-50 text-blue-800 border border-blue-200 
      rounded-md shadow-sm 
      hover:bg-blue-100 hover:shadow-md transition duration-200
    "
                        >
                          Short Link{" "}
                          <span
                            className="
      absolute right-0 top-0 bottom-0 px-2 flex items-center 
      text-gray-500 bg-blue-300 hover:bg-blue-500 opacity-0 group-hover:opacity-100 
      cursor-pointer rounded-r-md transition-opacity duration-200
    "
                            onClick={(e) => {
                              handleCopy(e, url.tiny_link_without_u);
                            }}
                            title="Copy Link"
                          >
                            {/* Use a simple character or a font icon here */}
                            📋
                          </span>
                        </a>
                      )}

                      {/* Card 2: Direct Link U (Tiny with U) */}
                      {url.tiny_link_with_u && (
                        <a
                          href={url.tiny_link_with_u}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative
      px-3 py-2 text-sm font-medium whitespace-nowrap
      bg-blue-50 text-blue-800 border border-blue-200 
      rounded-md shadow-sm 
      hover:bg-blue-100 hover:shadow-md transition duration-200
    "
                        >
                          Short Link (U)
                          <span
                            className="
      absolute right-0 top-0 bottom-0 px-2 flex items-center 
      text-gray-500 bg-blue-300 hover:bg-blue-500 opacity-0 group-hover:opacity-100 
      cursor-pointer rounded-r-md transition-opacity duration-200
    "
                            onClick={(e) => {
                              handleCopy(e, url.tiny_link_with_u);
                            }}
                            title="Copy Link"
                          >
                            {/* Use a simple character or a font icon here */}
                            📋
                          </span>
                        </a>
                      )}

                      {/* Card 3: Direct Link (Full without U) */}
                      <a
                        href={url.link_without_u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative
      px-3 py-2 text-sm font-medium whitespace-nowrap
      bg-green-50 text-green-800 border border-green-200 
      rounded-md shadow-sm
      hover:bg-green-100 hover:shadow-md transition duration-200
    "
                      >
                        Direct Link
                        <span
                          className="
      absolute right-0 top-0 bottom-0 px-2 flex items-center 
      text-gray-500 bg-green-300 hover:bg-green-500 opacity-0 group-hover:opacity-100 
      cursor-pointer rounded-r-md transition-opacity duration-200
    "
                          onClick={(e) => {
                            handleCopy(e, url.link_without_u);
                          }}
                          title="Copy Link"
                        >
                          {/* Use a simple character or a font icon here */}
                          📋
                        </span>
                      </a>

                      {/* Card 4: Direct Link U (Full with U) */}
                      <a
                        href={url.link_with_u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative
      px-3 py-2 text-sm font-medium whitespace-nowrap
      bg-green-50 text-green-800 border border-green-200 
      rounded-md shadow-sm
      hover:bg-green-100 hover:shadow-md transition duration-200
    "
                      >
                        Direct Link (U){" "}
                        <span
                          className="
      absolute right-0 top-0 bottom-0 px-2 flex items-center 
      text-gray-500 bg-green-300 hover:bg-green-500 opacity-0 group-hover:opacity-100 
      cursor-pointer rounded-r-md transition-opacity duration-200
    "
                          onClick={(e) => {
                            handleCopy(e, url.link_with_u);
                          }}
                          title="Copy Link"
                        >
                          {/* Use a simple character or a font icon here */}
                          📋
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
