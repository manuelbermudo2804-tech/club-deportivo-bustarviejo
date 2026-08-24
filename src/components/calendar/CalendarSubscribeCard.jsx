import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarPlus, Copy, Check, Smartphone } from "lucide-react";
import { toast } from "sonner";

export default function CalendarSubscribeCard({ categories = [] }) {
  const [cat, setCat] = useState(categories[0] || "");
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const httpUrl = `${origin}/functions/calendarioFeed${cat ? `?cat=${encodeURIComponent(cat)}` : ""}`;
  const webcalUrl = httpUrl.replace(/^https?:/, "webcal:");
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(httpUrl);
    setCopied(true);
    toast.success("Enlace copiado");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Card className="border-2 border-blue-200 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-3">
          <CalendarPlus className="w-6 h-6 text-blue-700 mt-0.5" />
          <div>
            <p className="font-bold text-blue-900">Añade el calendario a tu móvil</p>
            <p className="text-sm text-blue-800">
              Partidos, convocatorias y entrenamientos en tu calendario. Se actualiza solo: si cambia una hora, tu móvil lo verá.
            </p>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge
              onClick={() => setCat("")}
              className={`cursor-pointer ${cat === "" ? "bg-blue-600 text-white" : "bg-white text-blue-800 border border-blue-300"}`}
            >
              Todo el club
            </Badge>
            {categories.map((c) => (
              <Badge
                key={c}
                onClick={() => setCat(c)}
                className={`cursor-pointer ${cat === c ? "bg-blue-600 text-white" : "bg-white text-blue-800 border border-blue-300"}`}
              >
                {c}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <a href={googleUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <CalendarPlus className="w-4 h-4 mr-2" />
              Añadir en Google Calendar
            </Button>
          </a>
          <a href={webcalUrl}>
            <Button variant="outline" className="border-blue-300">
              <Smartphone className="w-4 h-4 mr-2" />
              Añadir en iPhone
            </Button>
          </a>
          <Button variant="outline" onClick={copy} className="border-blue-300">
            {copied ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2" />}
            Copiar enlace
          </Button>
        </div>

        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Android:</strong> pulsa "Añadir en Google Calendar" y confirma.{" "}
          <strong>iPhone:</strong> pulsa "Añadir en iPhone" y acepta suscribirte. Si te pide una dirección, pega el enlace copiado.
        </p>
      </CardContent>
    </Card>
  );
}