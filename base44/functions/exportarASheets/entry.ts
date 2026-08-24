import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Exporta datos del club a una hoja de cálculo nueva de Google Sheets.
// tipo: 'jugadores' | 'pagos' | 'equipacion'
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { tipo } = await req.json();
    if (!['jugadores', 'pagos', 'equipacion'].includes(tipo)) {
      return Response.json({ error: 'Tipo no válido' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    let titulo = '';
    let values = [];

    if (tipo === 'jugadores') {
      const players = await base44.asServiceRole.entities.Player.filter({ activo: true });
      titulo = 'Jugadores CD Bustarviejo';
      values = [
        ['Nombre', 'Categoría', 'Dorsal', 'Fecha nacimiento', 'Tipo inscripción', 'Tutor 1 email', 'Tutor 1 teléfono', 'Tutor 2 email', 'Tutor 2 teléfono', 'Municipio'],
        ...players
          .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')))
          .map((p) => [
            p.nombre || '',
            p.categoria_principal || p.deporte || '',
            p.numero_camiseta || '',
            p.fecha_nacimiento || '',
            p.tipo_inscripcion || '',
            p.email_padre || '',
            p.telefono || '',
            p.email_tutor_2 || '',
            p.telefono_tutor_2 || '',
            p.municipio || '',
          ]),
      ];
    }

    if (tipo === 'pagos') {
      const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
      const temporada = configs[0]?.temporada;
      const pagos = temporada
        ? await base44.asServiceRole.entities.Payment.filter({ temporada })
        : await base44.asServiceRole.entities.Payment.filter({});
      titulo = `Pagos ${temporada || ''} CD Bustarviejo`.trim();
      values = [
        ['Jugador', 'Temporada', 'Tipo de pago', 'Mes', 'Importe (€)', 'Estado', 'Fecha de pago', 'Nº recibo', 'Email tutor'],
        ...pagos
          .filter((p) => !p.is_deleted)
          .map((p) => [
            p.jugador_nombre || '',
            p.temporada || '',
            p.tipo_pago || '',
            p.mes || '',
            p.cantidad || 0,
            p.estado || '',
            p.fecha_pago || '',
            p.numero_recibo || '',
            p.email_padre || '',
          ]),
      ];
    }

    if (tipo === 'equipacion') {
      const [players, pedidos] = await Promise.all([
        base44.asServiceRole.entities.Player.filter({ activo: true }),
        base44.asServiceRole.entities.PedidoEquipacion.list('-fecha_pedido', 500),
      ]);
      const porJugador = {};
      pedidos.forEach((pe) => {
        const ids = (pe.jugadores || []).map((j) => j.jugador_id).filter(Boolean);
        if (!ids.length && pe.jugador_id) ids.push(pe.jugador_id);
        ids.forEach((id) => { if (!porJugador[id]) porJugador[id] = pe; });
      });
      titulo = 'Pedidos de equipación CD Bustarviejo';
      values = [
        ['Jugador', 'Categoría', 'Dorsal', 'Tipo inscripción', '¿Ha pedido?', 'Nº pedido', 'Fecha pedido', 'Teléfono', 'Email tutor'],
        ...players
          .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')))
          .map((p) => {
            const pe = porJugador[p.id];
            return [
              p.nombre || '',
              p.categoria_principal || p.deporte || '',
              p.numero_camiseta || '',
              p.tipo_inscripcion || '',
              pe ? 'SÍ' : 'NO',
              pe?.numero_pedido || '',
              pe?.fecha_pedido ? String(pe.fecha_pedido).slice(0, 10) : '',
              p.telefono || p.telefono_tutor_2 || '',
              p.email_padre || '',
            ];
          }),
      ];
    }

    const fecha = new Date().toISOString().slice(0, 10);
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { title: `${titulo} — ${fecha}` } }),
    });
    if (!createRes.ok) {
      const txt = await createRes.text();
      return Response.json({ error: `No se pudo crear la hoja: ${txt}` }, { status: 500 });
    }
    const sheet = await createRes.json();

    const range = encodeURIComponent('A1');
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheet.spreadsheetId}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      }
    );
    if (!writeRes.ok) {
      const txt = await writeRes.text();
      return Response.json({ error: `No se pudieron escribir los datos: ${txt}` }, { status: 500 });
    }

    return Response.json({
      success: true,
      filas: values.length - 1,
      titulo: `${titulo} — ${fecha}`,
      url: sheet.spreadsheetUrl,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});