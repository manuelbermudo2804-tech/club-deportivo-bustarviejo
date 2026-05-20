import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Phone, Mail, FileText, AlertTriangle, User } from "lucide-react";
import LopiviReportModal from "./LopiviReportModal";

export default function LopiviWidget() {
  const [config, setConfig] = useState(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const items = await base44.entities.LopiviConfig.list();
        const active = items.find(c => c.activo !== false);
        if (active) setConfig(active);
      } catch (e) {
        console.error("Error cargando config LOPIVI:", e);
      }
    };
    load();
  }, []);

  if (!config) return null;

  return (
    <>
      <Card className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-white" />
          <h2 className="text-white font-bold text-lg">Protección del Menor (LOPIVI)</h2>
        </div>

        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {config.dpi_foto_url ? (
                <img src={config.dpi_foto_url} alt={config.dpi_nombre} className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-emerald-700" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">
                {config.dpi_cargo || "Delegado/a de Protección"}
              </p>
              <p className="font-bold text-slate-900 text-lg">{config.dpi_nombre}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-sm">
                {config.dpi_telefono && (
                  <a
                    href={`tel:${config.dpi_telefono.replace(/\s/g, "")}`}
                    className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-medium"
                  >
                    <Phone className="w-4 h-4" />
                    {config.dpi_telefono}
                  </a>
                )}
                {config.dpi_email && (
                  <a
                    href={`mailto:${config.dpi_email}`}
                    className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-medium break-all"
                  >
                    <Mail className="w-4 h-4" />
                    {config.dpi_email}
                  </a>
                )}
              </div>
            </div>
          </div>

          {config.mensaje_familias && (
            <p className="text-sm text-slate-700 bg-white/60 rounded-lg p-3 border border-emerald-200">
              {config.mensaje_familias}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {config.protocolo_url && (
              <a href={config.protocolo_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Protocolo LOPIVI
                </Button>
              </a>
            )}
            <Button
              onClick={() => setShowReport(true)}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Reportar una incidencia
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center pt-1">
            Toda comunicación con el DPI es estrictamente confidencial.
          </p>
        </CardContent>
      </Card>

      <LopiviReportModal
        open={showReport}
        onOpenChange={setShowReport}
        dpiEmail={config.dpi_email}
        dpiNombre={config.dpi_nombre}
      />
    </>
  );
}