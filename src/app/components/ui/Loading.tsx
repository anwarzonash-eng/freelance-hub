// components/Loading.tsx

import React from "react";

type LoadingProps = {
  isLoading: boolean;
};

const Loading = ({ isLoading }: LoadingProps) => {
  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center pointer-events-auto"
      aria-live="assertive"
      aria-busy="true"
    >
      <div className="w-12 h-12 border-4 border-t-4 border-white border-t-blue-500 rounded-full animate-spin">
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export default Loading;
