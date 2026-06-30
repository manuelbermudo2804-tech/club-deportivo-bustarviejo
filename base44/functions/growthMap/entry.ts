import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Coordenadas conocidas de municipios de la Sierra Norte de Madrid y alrededores.
// Sirve para pintar el mapa sin depender de geocoding externo.
const MUNI_COORDS = {
  "bustarviejo": { lat: 40.8597, lng: -3.7050, label: "Bustarviejo" },
  "cabanillas de la sierra": { lat: 40.8333, lng: -3.6333, label: "Cabanillas de la Sierra" },
  "navalafuente": { lat: 40.8167, lng: -3.6500, label: "Navalafuente" },
  "valdemanco": { lat: 40.8667, lng: -3.6667, label: "Valdemanco" },
  "miraflores de la sierra": { lat: 40.8136, lng: -3.7600, label: "Miraflores de la Sierra" },
  "guadalix de la sierra": { lat: 40.7833, lng: -3.6833, label: "Guadalix de la Sierra" },
  "el berrueco": { lat: 40.8833, lng: -3.5500, label: "El Berrueco" },
  "lozoyuela": { lat: 40.9167, lng: -3.6167, label: "Lozoyuela" },
  "la cabrera": { lat: 40.8667, lng: -3.6167, label: "La Cabrera" },
  "venturada": { lat: 40.7917, lng: -3.6333, label: "Venturada" },
  "el molar": { lat: 40.7333, lng: -3.5833, label: "El Molar" },
  "soto del real": { lat: 40.7547, lng: -3.7872, label: "Soto del Real" },
  "manzanares el real": { lat: 40.7269, lng: -3.8631, label: "Manzanares el Real" },
  "colmenar viejo": { lat: 40.6589, lng: -3.7658, label: "Colmenar Viejo" },
  "torrelaguna": { lat: 40.8281, lng: -3.5392, label: "Torrelaguna" },
  "redueña": { lat: 40.8500, lng: -3.5833, label: "Redueña" },
  "madrid": { lat: 40.4168, lng: -3.7038, label: "Madrid" },
};

// Normaliza el nombre de municipio: minúsculas, sin acentos, sin espacios extra.
function normalize(s) {
  return (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

const HOME_MUNI = "bustarviejo";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const players = await base44.asServiceRole.entities.Player.filter({ activo: true });

    const groups = {}; // normKey -> { label, count, sinClub, categorias:{} }
    let sinMunicipio = 0;

    for (const p of players) {
      const raw = (p.municipio || "").trim();
      if (!raw) { sinMunicipio++; continue; }
      const key = normalize(raw);
      if (!groups[key]) {
        const known = MUNI_COORDS[key];
        groups[key] = {
          key,
          label: known ? known.label : raw,
          count: 0,
          lat: known ? known.lat : null,
          lng: known ? known.lng : null,
          categorias: {},
        };
      }
      groups[key].count++;
      const cat = p.categoria_principal || p.deporte || "Sin categoría";
      groups[key].categorias[cat] = (groups[key].categorias[cat] || 0) + 1;
    }

    const totalConMuni = players.length - sinMunicipio;

    const localidades = Object.values(groups)
      .map((g) => {
        const esBase = g.key === HOME_MUNI;
        const pct = totalConMuni > 0 ? Math.round((g.count / totalConMuni) * 100) : 0;
        // Potencial: pueblos de FUERA de la sede que ya aportan jugadores.
        // Más jugadores viniendo de fuera = más demanda no cubierta localmente.
        let potencial = "bajo";
        if (!esBase) {
          if (g.count >= 4) potencial = "alto";
          else if (g.count >= 2) potencial = "medio";
        }
        return {
          ...g,
          pct,
          esBase,
          esExterno: !esBase,
          potencial,
          categorias: Object.entries(g.categorias)
            .sort((a, b) => b[1] - a[1])
            .map(([nombre, n]) => ({ nombre, n })),
        };
      })
      .sort((a, b) => b.count - a.count);

    const externos = localidades.filter((l) => l.esExterno);
    const totalExternos = externos.reduce((s, l) => s + l.count, 0);

    return Response.json({
      total: players.length,
      totalConMuni,
      sinMunicipio,
      jugadoresLocales: groups[HOME_MUNI]?.count || 0,
      jugadoresExternos: totalExternos,
      numLocalidades: localidades.length,
      numLocalidadesExternas: externos.length,
      localidades,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});