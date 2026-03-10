import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";

export default function DiagnosticSummary({ aiSummary }) {
  if (!aiSummary) return null;

  return (
    <Card className="border-2 border-slate-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          🧠 Resumen Ejecutivo
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="prose prose-sm prose-slate max-w-none [&>p]:mb-3 [&>p]:leading-relaxed [&>ul]:mt-1 [&>ol]:mt-1 [&>li]:mb-1">
          <ReactMarkdown>{aiSummary}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}