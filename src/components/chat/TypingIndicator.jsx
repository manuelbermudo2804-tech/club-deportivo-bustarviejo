import React from "react";

export default function TypingIndicator({ userName = "Alguien" }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-2xl shadow-sm max-w-[200px]">
      <span className="text-sm text-slate-600 font-medium truncate">{userName}</span>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
      </div>
    </div>
  );
}