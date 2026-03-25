import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active players
    const players = await base44.entities.Player.filter({ activo: true });

    const today = new Date();
    const currentMonth = today.getMonth(); // 0-indexed
    const currentDate = today.getDate();

    // Calculate end of week (7 days from today)
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    const endMonth = endOfWeek.getMonth();
    const endDate = endOfWeek.getDate();

    const birthdays = [];

    for (const player of players) {
      if (!player.fecha_nacimiento) continue;

      const [year, month, day] = player.fecha_nacimiento.split('-').map(Number);
      const bMonth = month - 1; // 0-indexed
      const bDay = day;

      // Check if birthday falls within the next 7 days
      let match = false;
      for (let d = 0; d < 7; d++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() + d);
        if (checkDate.getMonth() === bMonth && checkDate.getDate() === bDay) {
          match = true;
          break;
        }
      }

      if (match) {
        const age = today.getFullYear() - year;
        const birthdayThisYear = new Date(today.getFullYear(), bMonth, bDay);
        const daysUntil = Math.round((birthdayThisYear - today) / (1000 * 60 * 60 * 24));

        birthdays.push({
          nombre: player.nombre,
          fecha_nacimiento: player.fecha_nacimiento,
          edad: age,
          categoria: player.categoria_principal || player.deporte || '',
          dias_hasta: daysUntil,
          es_hoy: daysUntil === 0
        });
      }
    }

    // Sort by days until birthday
    birthdays.sort((a, b) => a.dias_hasta - b.dias_hasta);

    return Response.json({
      semana: `${currentDate}/${currentMonth + 1} - ${endDate}/${endMonth + 1}`,
      total_jugadores: players.length,
      cumpleanos: birthdays,
      total_cumpleanos: birthdays.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});