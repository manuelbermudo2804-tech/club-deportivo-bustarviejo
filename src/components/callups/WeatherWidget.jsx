import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, CloudSnow, Wind, Loader2, AlertCircle } from "lucide-react";

export default function WeatherWidget({ location, date }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!location || !date) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);

        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('es-ES', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        });

        const prompt = `Dame el pronóstico del tiempo para ${location}, España el día ${formattedDate}. 
        Responde SOLO con un JSON con esta estructura exacta (sin texto adicional):
        {
          "temperatura": "número en celsius",
          "condicion": "despejado|nublado|lluvia|nieve|viento",
          "descripcion": "descripción breve del clima en 10 palabras máximo"
        }`;

        const response = await base44.integrations.Core.InvokeLLM({
          prompt: prompt,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              temperatura: { type: "string" },
              condicion: { 
                type: "string",
                enum: ["despejado", "nublado", "lluvia", "nieve", "viento"]
              },
              descripcion: { type: "string" }
            }
          }
        });

        setWeather(response);
      } catch (err) {
        console.error("Error fetching weather:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [location, date]);

  if (loading) {
    return (
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-700">Consultando el tiempo...</span>
        </div>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="p-4 bg-slate-50 border-slate-200">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-slate-500" />
          <span className="text-sm text-slate-600">Pronóstico no disponible</span>
        </div>
      </Card>
    );
  }

  const getWeatherIcon = (condicion) => {
    const iconClass = "w-8 h-8";
    switch(condicion?.toLowerCase()) {
      case "despejado":
        return <Sun className={`${iconClass} text-yellow-500`} />;
      case "nublado":
        return <Cloud className={`${iconClass} text-slate-500`} />;
      case "lluvia":
        return <CloudRain className={`${iconClass} text-blue-600`} />;
      case "nieve":
        return <CloudSnow className={`${iconClass} text-blue-300`} />;
      case "viento":
        return <Wind className={`${iconClass} text-slate-600`} />;
      default:
        return <Cloud className={`${iconClass} text-slate-400`} />;
    }
  };

  const getBackgroundColor = (condicion) => {
    switch(condicion?.toLowerCase()) {
      case "despejado":
        return "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200";
      case "nublado":
        return "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200";
      case "lluvia":
        return "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200";
      case "nieve":
        return "bg-gradient-to-br from-blue-50 to-slate-100 border-blue-200";
      case "viento":
        return "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300";
      default:
        return "bg-slate-50 border-slate-200";
    }
  };

  return (
    <Card className={`p-4 ${getBackgroundColor(weather.condicion)} border-2`}>
      <div className="flex items-center gap-4">
        {getWeatherIcon(weather.condicion)}
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{weather.temperatura}°</span>
            <span className="text-sm text-slate-600 capitalize">{weather.condicion}</span>
          </div>
          <p className="text-sm text-slate-700 mt-1">{weather.descripcion}</p>
        </div>
      </div>
    </Card>
  );
}