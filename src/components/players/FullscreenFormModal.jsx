import React from "react";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft } from "lucide-react";

export default function FullscreenFormModal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[100] bg-white lg:bg-black/60 overflow-hidden">
      <div className="h-full lg:flex lg:items-center lg:justify-center lg:p-6">
        <div className="h-full lg:h-auto lg:max-h-[95vh] lg:max-w-4xl lg:w-full lg:bg-white lg:rounded-2xl lg:shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-3 lg:px-6 lg:py-4 flex items-center gap-3 safe-area-top">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg lg:text-xl truncate">{title}</h2>
              {subtitle && (
                <p className="text-orange-100 text-xs lg:text-sm truncate">{subtitle}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 flex-shrink-0 hidden lg:flex"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}