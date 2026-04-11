import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2 } from "lucide-react";

export default function CopyButton({ text, label = "Copiar", className = "", size = "sm", variant = "outline" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      size={size}
      variant={variant}
      className={`min-w-[90px] transition-all ${copied ? 'bg-green-50 border-green-400 text-green-700' : ''} ${className}`}
      onClick={handleCopy}
    >
      {copied ? (
        <><CheckCircle2 className="w-4 h-4 mr-1" /> Copiado</>
      ) : (
        <><Copy className="w-4 h-4 mr-1" /> {label}</>
      )}
    </Button>
  );
}