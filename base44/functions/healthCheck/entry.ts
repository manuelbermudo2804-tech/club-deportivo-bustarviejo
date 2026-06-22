import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Panel de Salud: ejecuta comprobaciones de configuración y consistencia de datos
// para que el admin detecte y arregle problemas él mismo, sin tocar código.
// Solo lectura — NO modifica nada.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.es_tesorero !== true) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sr = base44.asServiceRole;
    const checks = [];

    // Helper para registrar un check
    const add = (id, titulo, severidad, ok, detalle, items = []) => {
      checks.push({ id, titulo, severidad, ok, detalle, items: items.slice(0, 50), total: items.length });
    };

    // === Cargar datos base ===
    const [players, categoryConfigs, seasonConfigs] = await Promise.all([
      sr.entities.Player.filter({ activo: true }, '-updated_date', 1000),
      sr.entities.CategoryConfig.list(),
      sr.entities.SeasonConfig.list(),
    ]);

    const norm = (s) => (s == null ? '' : String(s).trim().toLowerCase());
    const categoriasOficiales = categoryConfigs.filter(c => c.activa).map(c => c.nombre);
    const categoriasOficialesNorm = new Set(categoriasOficiales.map(norm));

    // === CHECK 1: Jugadores sin categoría principal ===
    const sinCategoria = players.filter(p => !p.categoria_principal && !p.deporte && (!p.categorias || p.categorias.length === 0));
    add(
      'players_sin_categoria',
      'Jugadores sin categoría asignada',
      'error',
      sinCategoria.length === 0,
      sinCategoria.length === 0 ? 'Todos los jugadores activos tienen categoría.' : `${sinCategoria.length} jugadores activos no tienen ninguna categoría asignada.`,
      sinCategoria.map(p => p.nombre)
    );

    // === CHECK 2: Jugadores con categoría que no existe en CategoryConfig ===
    const catFantasma = players.filter(p => {
      const cat = p.categoria_principal || p.deporte;
      return cat && !categoriasOficialesNorm.has(norm(cat));
    });
    const catFantasmaNombres = [...new Set(catFantasma.map(p => p.categoria_principal || p.deporte))];
    add(
      'players_categoria_inexistente',
      'Jugadores con categoría que no existe en Configuración',
      'error',
      catFantasma.length === 0,
      catFantasma.length === 0 ? 'Todas las categorías de los jugadores existen en Configuración.' : `${catFantasma.length} jugadores usan categorías que no están dadas de alta: ${catFantasmaNombres.join(', ')}.`,
      catFantasma.map(p => `${p.nombre} → ${p.categoria_principal || p.deporte}`)
    );

    // === CHECK 3: Categorías activas sin cuotas asignadas ===
    const sinCuotas = categoryConfigs.filter(c => c.activa && !c.es_actividad_complementaria && (!c.cuota_total || c.cuota_total <= 0));
    add(
      'categorias_sin_cuotas',
      'Categorías activas sin cuotas configuradas',
      'warning',
      sinCuotas.length === 0,
      sinCuotas.length === 0 ? 'Todas las categorías activas tienen cuotas.' : `${sinCuotas.length} categorías activas no tienen cuota total configurada.`,
      sinCuotas.map(c => c.nombre)
    );

    // === CHECK 4: Hay una temporada activa (y solo una) ===
    const temporadasActivas = seasonConfigs.filter(s => s.activa);
    add(
      'temporada_activa',
      'Temporada activa configurada',
      'error',
      temporadasActivas.length === 1,
      temporadasActivas.length === 1
        ? `Temporada activa: ${temporadasActivas[0].temporada}.`
        : temporadasActivas.length === 0
          ? 'No hay ninguna temporada marcada como activa.'
          : `Hay ${temporadasActivas.length} temporadas activas a la vez (debería haber solo una): ${temporadasActivas.map(s => s.temporada).join(', ')}.`,
      temporadasActivas.map(s => s.temporada)
    );

    // === CHECK 5: Jugadores sin email de contacto (no se les puede avisar) ===
    const sinEmail = players.filter(p => !p.email_padre && !p.email_tutor_2 && !p.email_jugador);
    add(
      'players_sin_email',
      'Jugadores sin ningún email de contacto',
      'warning',
      sinEmail.length === 0,
      sinEmail.length === 0 ? 'Todos los jugadores tienen al menos un email.' : `${sinEmail.length} jugadores no tienen ningún email (no recibirán avisos ni acceso).`,
      sinEmail.map(p => p.nombre)
    );

    // === CHECK 6: Jugadores activos sin foto (la app la marca como obligatoria) ===
    const sinFoto = players.filter(p => !p.foto_url);
    add(
      'players_sin_foto',
      'Jugadores activos sin foto',
      'info',
      sinFoto.length === 0,
      sinFoto.length === 0 ? 'Todos los jugadores tienen foto.' : `${sinFoto.length} jugadores activos no tienen foto subida.`,
      sinFoto.map(p => p.nombre)
    );

    // === CHECK 7: Categorías duplicadas (mismo nombre normalizado) ===
    const conteo = {};
    categoryConfigs.forEach(c => { const k = norm(c.nombre); conteo[k] = (conteo[k] || 0) + 1; });
    const duplicadas = Object.entries(conteo).filter(([, n]) => n > 1).map(([k]) => k);
    add(
      'categorias_duplicadas',
      'Categorías duplicadas en Configuración',
      'warning',
      duplicadas.length === 0,
      duplicadas.length === 0 ? 'No hay categorías duplicadas.' : `${duplicadas.length} nombres de categoría aparecen más de una vez.`,
      duplicadas
    );

    // === CHECK 8: Categorías de la temporada activa sin config propia de esa temporada ===
    // Si una categoría en uso no tiene CategoryConfig de la temporada activa, las cuotas
    // caen al fallback de precios antiguos del código en lugar de los precios del club.
    if (temporadasActivas.length === 1) {
      const temp = temporadasActivas[0].temporada;
      const configsTemporada = new Set(
        categoryConfigs.filter(c => c.activa && c.temporada === temp).map(c => norm(c.nombre))
      );
      const categoriasEnUso = [...new Set(
        players.map(p => p.categoria_principal || p.deporte).filter(Boolean)
      )];
      const sinConfigTemporada = categoriasEnUso.filter(cat => !configsTemporada.has(norm(cat)));
      add(
        'categorias_sin_config_temporada',
        'Categorías sin precios para la temporada activa',
        'warning',
        sinConfigTemporada.length === 0,
        sinConfigTemporada.length === 0
          ? `Todas las categorías en uso tienen precios configurados para ${temp}.`
          : `${sinConfigTemporada.length} categorías en uso no tienen precios para la temporada ${temp}, por lo que usan precios antiguos por defecto: ${sinConfigTemporada.join(', ')}.`,
        sinConfigTemporada
      );
    }

    // Resumen
    const errores = checks.filter(c => !c.ok && c.severidad === 'error').length;
    const avisos = checks.filter(c => !c.ok && c.severidad === 'warning').length;
    const infos = checks.filter(c => !c.ok && c.severidad === 'info').length;
    const estado = errores > 0 ? 'error' : (avisos > 0 ? 'warning' : 'ok');

    return Response.json({
      estado,
      resumen: { errores, avisos, infos, total_checks: checks.length },
      checks,
      generado: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});