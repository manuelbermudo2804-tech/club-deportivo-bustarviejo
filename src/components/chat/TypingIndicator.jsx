import React from "react";

export default function TypingIndicator({ userName }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-lg max-w-fit">
      <span className="text-xs text-slate-600 font-medium">{userName} está escribiendo</span>
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}