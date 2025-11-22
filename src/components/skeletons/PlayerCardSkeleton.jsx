import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-slate-200">
      <div className="flex items-start gap-6">
        {/* Foto */}
        <Skeleton className="w-24 h-24 rounded-xl flex-shrink-0" />
        
        {/* Contenido */}
        <div className="flex-1 space-y-3">
          {/* Nombre */}
          <Skeleton className="h-7 w-48" />
          
          {/* Badges */}
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
          
          {/* Horarios */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          
          {/* Contacto */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
        
        {/* Botones */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}