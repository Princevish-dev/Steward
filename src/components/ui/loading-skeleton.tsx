"use client";

import * as React from "react";

type LoadingSkeletonProps = {
  width?: string | number;
  height?: string | number;
  className?: string;
};

export function LoadingSkeleton({ width = "100%", height = "1rem", className = "" }: LoadingSkeletonProps) {
  return (
    <div
      className={`rounded-md bg-surface animate-pulse ${className}`}
      style={{ width, height }}
    />
  );
}

type SkeletonListProps = { count?: number; itemHeight?: string };

export function SkeletonList({ count = 3, itemHeight = "3rem" }: SkeletonListProps) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <LoadingSkeleton width="4rem" height="4rem" />
          <div className="flex flex-col gap-1.5">
            <LoadingSkeleton width="60%" height="0.875rem" />
            <LoadingSkeleton width="40%" height="0.875rem" />
            <LoadingSkeleton width="100%" height={itemHeight} />
          </div>
        </div>
      ))}
    </div>
  );
}
