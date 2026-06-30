import React from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const POTENCIAL_COLOR = {
  alto: "#ef4444",
  medio: "#f59e0b",
  bajo: "#64748b",
};

export default function GrowthMapView({ localidades }) {
  const conCoords = localidades.filter((l) => l.lat && l.lng);
  const center = conCoords.length
    ? [conCoords[0].lat, conCoords[0].lng]
    : [40.85, -3.7];
  const maxCount = Math.max(...conCoords.map((l) => l.count), 1);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 420 }}>
      <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {conCoords.map((l) => {
          const radius = 10 + (l.count / maxCount) * 28;
          const color = l.esBase ? "#16a34a" : POTENCIAL_COLOR[l.potencial];
          return (
            <CircleMarker
              key={l.key}
              center={[l.lat, l.lng]}
              radius={radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.55, weight: 2 }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div className="text-xs">
                  <p className="font-bold">{l.label}</p>
                  <p>{l.count} jugador{l.count !== 1 ? "es" : ""} · {l.pct}%</p>
                  {l.esExterno && <p className="capitalize">Potencial: {l.potencial}</p>}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}