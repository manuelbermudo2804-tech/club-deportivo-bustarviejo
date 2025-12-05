import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom orange marker
const orangeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function CallupMap({ ubicacion, enlaceUbicacion, localVisitante }) {
  const [coordinates, setCoordinates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const extractCoordinates = () => {
      setLoading(true);
      setError(false);

      // Try to extract coordinates from Google Maps URL
      if (enlaceUbicacion) {
        // Pattern: @lat,lng or ?q=lat,lng or /place/lat,lng
        const patterns = [
          /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
          /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
          /place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/,
          /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        ];

        for (const pattern of patterns) {
          const match = enlaceUbicacion.match(pattern);
          if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
              setCoordinates([lat, lng]);
              setLoading(false);
              return;
            }
          }
        }
      }

      // If no coordinates found, try geocoding the location name
      if (ubicacion) {
        // Use Nominatim for geocoding (free, no API key needed)
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ubicacion + ", España")}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.length > 0) {
              setCoordinates([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
            } else {
              setError(true);
            }
          })
          .catch(() => setError(true))
          .finally(() => setLoading(false));
      } else {
        setError(true);
        setLoading(false);
      }
    };

    extractCoordinates();
  }, [ubicacion, enlaceUbicacion]);

  const openInMaps = () => {
    if (enlaceUbicacion) {
      window.open(enlaceUbicacion, "_blank");
    } else if (coordinates) {
      window.open(`https://www.google.com/maps?q=${coordinates[0]},${coordinates[1]}`, "_blank");
    } else if (ubicacion) {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(ubicacion)}`, "_blank");
    }
  };

  const openNavigation = () => {
    if (coordinates) {
      // Try to open in native maps app
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        window.open(`maps://maps.apple.com/?daddr=${coordinates[0]},${coordinates[1]}`, "_blank");
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${coordinates[0]},${coordinates[1]}`, "_blank");
      }
    } else if (ubicacion) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ubicacion)}`, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-100 rounded-xl p-4 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-lg mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error || !coordinates) {
    // Show simple location card without map
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900">{ubicacion}</p>
            {localVisitante && (
              <span className="text-xs text-blue-600 font-medium">({localVisitante})</span>
            )}
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={openInMaps} className="text-xs gap-1">
                <ExternalLink className="w-3 h-3" />
                Ver mapa
              </Button>
              <Button size="sm" onClick={openNavigation} className="text-xs gap-1 bg-blue-600 hover:bg-blue-700">
                <Navigation className="w-3 h-3" />
                Cómo llegar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border-2 border-blue-200">
      <div className="h-40 relative">
        <MapContainer
          center={coordinates}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={coordinates} icon={orangeIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-bold">{ubicacion}</p>
                {localVisitante && <p className="text-xs text-slate-500">{localVisitante}</p>}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
      <div className="bg-white p-3 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-slate-900 truncate">{ubicacion}</p>
          {localVisitante && (
            <span className="text-xs text-blue-600 font-medium">{localVisitante}</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={openInMaps} className="text-xs">
            <ExternalLink className="w-3 h-3" />
          </Button>
          <Button size="sm" onClick={openNavigation} className="text-xs bg-blue-600 hover:bg-blue-700">
            <Navigation className="w-3 h-3 mr-1" />
            Ir
          </Button>
        </div>
      </div>
    </div>
  );
}