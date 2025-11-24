"use client";
import React, { useState, useMemo } from "react";
export default function DashboardPage() {
  const [unrelatedState, setUnrelatedState] = useState(0);
  const [a, seA] = useState(1);
  const [b, setB] = useState(2);
  const memoizedResult = useMemo(() => {
    // 💡 This is the crucial line for testing!
    console.log("--- RECALLING useMemo FUNCTION ---");

    // Simulate an expensive calculation based on dependencies
    return a * 2;
  }, [a]);
  return (
    // The main container centers the construction notice on the page
    <>
      {/* {" "}
      <button onClick={() => seA((s) => s + 1)}>
        (A State: {a})(MemoResult State: {memoizedResult})
      </button>
      <button onClick={() => setUnrelatedState((s) => s + 1)}>
        (Unrelated State: {unrelatedState})
      </button> */}
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        {/* The Under Construction Component structure */}
        <div className="flex flex-col items-center justify-center p-12 bg-white border-4 border-dashed border-red-400 rounded-2xl shadow-xl max-w-lg w-full text-center">
          {/* Icon/Emoji */}
          <div
            className="text-8xl mb-6 motion-safe:animate-bounce"
            role="img"
            aria-label="Warning Sign"
          >
            ⚠️
          </div>

          {/* Main Title */}
          <h1 className="text-4xl font-extrabold text-red-700 mb-3">
            Dashboard Under Construction
          </h1>

          {/* Subtitle/Explanation */}
          <p className="text-xl text-gray-600 mb-6">
            This feature is currently being developed. We appreciate your
            patience!
          </p>

          {/* Status/ETA */}
          <div className="text-sm font-semibold text-gray-800 bg-red-100 p-3 rounded-lg">
            Current Status: **In Progress** | Estimated Completion: Next Quarter
          </div>
        </div>
      </main>
    </>
  );
}
