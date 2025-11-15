import React from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MatchAppButton() {
  return (
    <a 
      href="https://www.rffm.es/fichaclub/4095" 
      target="_blank" 
      rel="noopener noreferrer"
      className="block"
    >
      <Button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-6 text-lg shadow-xl flex items-center justify-center gap-2">
        <span>🏟️ Match Center RFFM</span>
        <ExternalLink className="w-5 h-5" />
      </Button>
    </a>
  );
}