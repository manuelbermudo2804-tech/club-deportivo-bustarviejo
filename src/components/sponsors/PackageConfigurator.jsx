import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Edit2, Save, X } from "lucide-react";

const DEFAULT_PACKAGES = {
  "Oro": {
    precio: 2000,
    ubicaciones: ["banner", "anuncios", "galeria", "newsletters"],
    beneficios: ["Logo en banner principal", "Mención en anuncios", "Aparición en galería", "Logo en newsletters mensuales"]
  },
  "Plata": {
    precio: 1000,
    ubicaciones: ["banner", "anuncios"],
    beneficios: ["Logo en banner principal", "Mención en anuncios importantes"]
  },
  "Bronce": {
    precio: 500,
    ubicaciones: ["banner"],
    beneficios: ["Logo en banner principal rotativo"]
  }
};

export default function PackageConfigurator() {
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({});

  const handleEdit = (paquete) => {
    setEditing(paquete);
    setEditValues(packages[paquete]);
  };

  const handleSave = (paquete) => {
    setPackages({
      ...packages,
      [paquete]: editValues
    });
    setEditing(null);
  };

  const packageColors = {
    "Oro": "from-yellow-500 to-yellow-600",
    "Plata": "from-slate-400 to-slate-500",
    "Bronce": "from-orange-700 to-orange-800"
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Configuración de Paquetes</h2>
          <p className="text-sm text-slate-600">Define los paquetes de patrocinio disponibles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(packages).map(([paquete, config]) => (
          <Card key={paquete} className="border-2">
            <CardHeader className={`bg-gradient-to-r ${packageColors[paquete]} text-white`}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{paquete}</CardTitle>
                {editing === paquete ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleSave(paquete)} className="h-7 w-7 p-0 hover:bg-white/20">
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="h-7 w-7 p-0 hover:bg-white/20">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(paquete)} className="h-7 w-7 p-0 hover:bg-white/20">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {editing === paquete ? (
                <>
                  <div>
                    <Label className="text-xs">Precio anual (€)</Label>
                    <Input
                      type="number"
                      value={editValues.precio}
                      onChange={(e) => setEditValues({ ...editValues, precio: Number(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Ubicaciones</Label>
                    <div className="space-y-1 mt-1">
                      {["banner", "anuncios", "galeria", "newsletters"].map((ubi) => (
                        <label key={ubi} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editValues.ubicaciones?.includes(ubi)}
                            onChange={(e) => {
                              const newUbicaciones = e.target.checked
                                ? [...(editValues.ubicaciones || []), ubi]
                                : editValues.ubicaciones.filter(u => u !== ubi);
                              setEditValues({ ...editValues, ubicaciones: newUbicaciones });
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{ubi}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center py-2">
                    <p className="text-3xl font-bold text-slate-900">{config.precio}€</p>
                    <p className="text-sm text-slate-600">al año</p>
                  </div>
                  <div className="space-y-2">
                    {config.beneficios.map((beneficio, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-slate-700">{beneficio}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1 pt-2">
                    {config.ubicaciones.map((ubi) => (
                      <Badge key={ubi} variant="outline" className="text-xs">
                        {ubi}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}