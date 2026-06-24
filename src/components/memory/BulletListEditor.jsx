import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export default function BulletListEditor({ icon: Icon, title, items, onChange, placeholder }) {
  const update = (i, val) => onChange(items.map((it, idx) => (idx === i ? val : it)));
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, ""]);

  return (
    <Card className="rounded-2xl border-slate-200">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-orange-500" />}
            <h3 className="font-bold text-slate-800">{title}</h3>
          </div>
          <Button variant="outline" size="sm" onClick={add} className="rounded-lg">
            <Plus className="w-4 h-4 mr-1" /> Añadir
          </Button>
        </div>
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-orange-500">•</span>
            <Input value={it || ""} onChange={(e) => update(i, e.target.value)} placeholder={placeholder} className="text-sm" />
            <Button variant="ghost" size="icon" onClick={() => remove(i)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}