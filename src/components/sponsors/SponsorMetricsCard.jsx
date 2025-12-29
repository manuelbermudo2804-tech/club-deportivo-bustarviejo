import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Eye, MousePointer, DollarSign, Calendar } from "lucide-react";

export default function SponsorMetricsCard({ sponsor, impressions }) {
  const clicks = impressions.filter(i => i.tipo === "click").length;
  const views = impressions.filter(i => i.tipo === "impresion").length;
  const ctr = views > 0 ? ((clicks / views) * 100).toFixed(2) : 0;
  const costPerClick = clicks > 0 ? (sponsor.precio_anual / clicks).toFixed(2) : 0;
  
  const daysRemaining = sponsor.fecha_fin 
    ? Math.ceil((new Date(sponsor.fecha_fin) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;
  
  const packageColors = {
    "Oro": "bg-gradient-to-r from-yellow-500 to-yellow-600",
    "Plata": "bg-gradient-to-r from-slate-400 to-slate-500",
    "Bronce": "bg-gradient-to-r from-orange-700 to-orange-800",
    "Personalizado": "bg-gradient-to-r from-purple-500 to-purple-600"
  };

  return (
    <Card className="hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {sponsor.logo_url && (
              <img src={sponsor.logo_url} alt={sponsor.nombre} className="w-12 h-12 object-contain rounded" />
            )}
            <div>
              <CardTitle className="text-lg">{sponsor.nombre}</CardTitle>
              <Badge className={`${packageColors[sponsor.paquete]} text-white mt-1`}>
                {sponsor.paquete}
              </Badge>
            </div>
          </div>
          <Badge variant={sponsor.estado_pago === "Pagado" ? "default" : "destructive"}>
            {sponsor.estado_pago}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium">Impresiones</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{views.toLocaleString()}</p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <MousePointer className="w-4 h-4" />
              <span className="text-xs font-medium">Clicks</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{clicks.toLocaleString()}</p>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">CTR</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">{ctr}%</p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Coste/Click</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{costPerClick}€</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">
              {daysRemaining > 0 ? `${daysRemaining} días restantes` : "Vencido"}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-900">{sponsor.precio_anual}€/año</p>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {sponsor.ubicaciones?.map((ubi) => (
            <Badge key={ubi} variant="outline" className="text-xs">
              {ubi}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}