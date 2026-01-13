import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Sincronizar eventos y convocatorias a Google Calendar del club
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener token de Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Obtener eventos sin sincronizar
    const unsyncedEvents = await base44.entities.Event.filter({ synced_to_google: false });
    
    const syncedCount = [];
    const errors = [];

    for (const event of unsyncedEvents) {
      try {
        // Crear evento en Google Calendar
        const googleEvent = {
          summary: event.titulo,
          description: event.descripcion,
          start: {
            dateTime: new Date(`${event.fecha}T${event.hora || '10:00'}`).toISOString(),
            timeZone: 'Europe/Madrid'
          },
          end: {
            dateTime: new Date(`${event.fecha}T${event.hora_fin || '11:00'}`).toISOString(),
            timeZone: 'Europe/Madrid'
          },
          location: event.ubicacion,
          visibility: 'public'
        };

        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(googleEvent)
        });

        if (response.ok) {
          const created = await response.json();
          await base44.entities.Event.update(event.id, {
            synced_to_google: true,
            google_calendar_id: created.id,
            google_calendar_link: created.htmlLink
          });
          syncedCount.push(event.titulo);
          console.log(`📅 Synced: ${event.titulo}`);
        } else {
          errors.push(`Failed to sync ${event.titulo}`);
        }
      } catch (error) {
        errors.push(`Error syncing ${event.titulo}: ${error.message}`);
        console.error(error);
      }
    }

    // También sincronizar convocatorias como eventos
    const unsyncedCallups = await base44.entities.Convocatoria.filter({ synced_to_google: false });
    
    for (const callup of unsyncedCallups) {
      try {
        const googleEvent = {
          summary: `⚽ Convocatoria: ${callup.titulo}`,
          description: `${callup.rival}\nUbicación: ${callup.ubicacion}`,
          start: {
            dateTime: new Date(`${callup.fecha_partido}T${callup.hora_partido || '10:00'}`).toISOString(),
            timeZone: 'Europe/Madrid'
          },
          end: {
            dateTime: new Date(`${callup.fecha_partido}T${callup.hora_partido || '10:00'}`).toISOString(),
            timeZone: 'Europe/Madrid'
          },
          location: callup.ubicacion,
          visibility: 'public'
        };

        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(googleEvent)
        });

        if (response.ok) {
          const created = await response.json();
          // Nota: Convocatoria entity no tiene campos synced_to_google, así que solo log
          console.log(`📅 Synced callup: ${callup.titulo}`);
        }
      } catch (error) {
        errors.push(`Error syncing callup ${callup.titulo}: ${error.message}`);
      }
    }

    return Response.json({ 
      success: true,
      eventsSynced: syncedCount.length,
      errors: errors.length > 0 ? errors : null,
      details: { syncedEvents: syncedCount }
    });
  } catch (error) {
    console.error('Error syncing to Google Calendar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});