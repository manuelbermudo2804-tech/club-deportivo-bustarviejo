import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function EditableSection({ icon: Icon, title, hint, value, onChange, rows = 6, placeholder }) {
  return (
    <Card className="rounded-2xl border-slate-200">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-orange-500" />}
          <h3 className="font-bold text-slate-800">{title}</h3>
        </div>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="resize-y text-sm leading-relaxed"
        />
      </CardContent>
    </Card>
  );
}