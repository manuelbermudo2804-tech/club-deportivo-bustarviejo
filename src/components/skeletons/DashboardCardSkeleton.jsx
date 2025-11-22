import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardCardSkeleton() {
  return (
    <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-xl border-2 border-slate-700">
      <div className="relative z-10 p-8 flex flex-col items-center justify-center min-h-[200px]">
        <Skeleton className="w-20 h-20 rounded-2xl mb-4 bg-slate-700" />
        <Skeleton className="h-6 w-32 mb-2 bg-slate-700" />
        <Skeleton className="h-4 w-20 bg-slate-700" />
      </div>
    </div>
  );
}