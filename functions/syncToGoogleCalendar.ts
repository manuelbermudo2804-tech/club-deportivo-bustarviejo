import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id } = await req.json();

    // Obtener el token de acceso de Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    // Obtener el evento
    const event = await base44.entities.Event.filter({ id: event_id });
    if (!event || event.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const clubEvent = event[0];

    // Preparar evento para Google Calendar
    const googleEvent = {
      summary: clubEvent.titulo,
      description: clubEvent.descripcion || '',
      location: clubEvent.ubicacion || '',
      start: {
        dateTime: new Date(`${clubEvent.fecha}T${clubEvent.hora || '00:00'}`).toISOString(),
        timeZone: 'Europe/Madrid',
      },
      end: {
        dateTime: new Date(`${clubEvent.fecha}T${clubEvent.hora_fin || clubEvent.hora || '23:59'}`).toISOString(),
        timeZone: 'Europe/Madrid',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    };

    // Crear evento en Google Calendar
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleEvent),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Google Calendar API error:', error);
      return Response.json({ error: 'Failed to sync with Google Calendar' }, { status: 500 });
    }

    const createdEvent = await response.json();

    // Guardar el ID de Google Calendar en el evento
    await base44.asServiceRole.entities.Event.update(event_id, {
      google_calendar_id: createdEvent.id,
      synced_to_google: true,
    });

    return Response.json({ 
      success: true, 
      google_event_id: createdEvent.id,
      google_event_link: createdEvent.htmlLink 
    });

  } catch (error) {
    console.error('Error syncing to Google Calendar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});