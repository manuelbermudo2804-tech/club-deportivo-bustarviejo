import { base44 } from "@/api/base44Client";

// Días que un artículo vendido sigue visible con el cartel VENDIDO
export const DIAS_VISIBLE_VENDIDO = 7;

export const esVendido = (item) => item?.estado === 'vendido' || item?.estado === 'entregado';

export const vendidoReciente = (item) => {
  if (!esVendido(item)) return false;
  const ts = item.vendido_fecha || item.updated_date;
  const t = ts ? new Date(ts).getTime() : NaN;
  if (!Number.isFinite(t)) return false;
  return (Date.now() - t) < DIAS_VISIBLE_VENDIDO * 24 * 60 * 60 * 1000;
};

const safeEmail = async (payload) => {
  try { await base44.integrations.Core.SendEmail(payload); } catch (e) { console.error('Email mercadillo', e); }
};

const safeNotif = async (payload) => {
  try { await base44.entities.AppNotification.create(payload); } catch (e) { console.error('Notif mercadillo', e); }
};

export async function reservarArticulo(item, user, datos = {}) {
  const comprador_nombre = datos.nombre || user.full_name || user.email;
  const telefono = datos.telefono || user.telefono || '';
  const ahora = new Date().toISOString();

  // Guardar el teléfono en su perfil si no lo tenía, para no volver a pedirlo
  if (datos.telefono && !user.telefono) {
    try { await base44.auth.updateMe({ telefono: datos.telefono }); } catch (e) { console.error('Guardar teléfono', e); }
  }

  await base44.entities.MarketReservation.create({
    listing_id: item.id,
    comprador_nombre,
    comprador_email: user.email,
    comprador_telefono: telefono,
    mensaje: 'Reserva desde la app',
    estado: 'pendiente',
    fecha: ahora,
  });

  await base44.entities.MarketListing.update(item.id, {
    estado: 'reservado',
    reservado_por_email: user.email,
    reservado_por_nombre: comprador_nombre,
    reservado_por_telefono: telefono,
    reservado_fecha: ahora,
  });

  const vendedorEmail = item.vendedor_email || item.created_by;
  if (vendedorEmail) {
    await safeNotif({
      usuario_email: vendedorEmail,
      titulo: `Reserva: ${item.titulo}`,
      mensaje: `${comprador_nombre} ha reservado tu anuncio. Teléfono: ${telefono || 'no disponible'}`,
      tipo: 'importante',
      icono: '🛍️',
    });
    await safeEmail({
      to: vendedorEmail,
      subject: `Reserva de "${item.titulo}"`,
      body: `Hola,\n\n${comprador_nombre} ha RESERVADO tu artículo "${item.titulo}".\n\nDatos de contacto:\n- Nombre: ${comprador_nombre}\n- Email: ${user.email}\n- Teléfono: ${telefono || '(no disponible)'}\n\nIMPORTANTE: la reserva NO es una venta. Cuando hayáis quedado y le entregues el artículo, entra en el Mercadillo de la app y pulsa el botón "VENDIDO" para cerrar el anuncio.\n\nCD Bustarviejo`,
    });
  }

  await safeEmail({
    to: user.email,
    subject: `Has reservado: ${item.titulo}`,
    body: `Has reservado "${item.titulo}" (${Number(item.precio || 0).toFixed(2)} €).\n\nHemos avisado al vendedor:\n- Nombre: ${item.vendedor_nombre || item.vendedor_email}\n- Teléfono: ${item.vendedor_telefono || '(no disponible)'}\n\nPonte en contacto con él/ella para quedar.\n\nCD Bustarviejo`,
  });
}

export async function marcarVendido(item, actorEmail) {
  const entregado = item.tipo === 'donacion';
  await base44.entities.MarketListing.update(item.id, {
    estado: entregado ? 'entregado' : 'vendido',
    vendido_fecha: new Date().toISOString(),
    comprador_final_nombre: item.reservado_por_nombre || '',
    comprador_final_email: item.reservado_por_email || '',
  });

  if (item.reservado_por_email) {
    const reservas = await base44.entities.MarketReservation.filter({ listing_id: item.id, comprador_email: item.reservado_por_email });
    for (const r of reservas || []) {
      await base44.entities.MarketReservation.update(r.id, { estado: 'aceptada' });
    }
    await safeEmail({
      to: item.reservado_por_email,
      subject: entregado ? `Entrega confirmada: ${item.titulo}` : `Compra confirmada: ${item.titulo}`,
      body: `El vendedor ha confirmado la ${entregado ? 'entrega' : 'venta'} de "${item.titulo}".\n\n¡Gracias por usar el Mercadillo del club!\n\nCD Bustarviejo`,
    });
    await safeNotif({
      usuario_email: item.reservado_por_email,
      titulo: entregado ? `Entrega confirmada: ${item.titulo}` : `Compra confirmada: ${item.titulo}`,
      mensaje: 'El vendedor ha cerrado la operación.',
      tipo: 'informativo',
      icono: '✅',
    });
  }

  if (item.vendedor_email && actorEmail !== item.vendedor_email) {
    await safeNotif({
      usuario_email: item.vendedor_email,
      titulo: `Anuncio cerrado: ${item.titulo}`,
      mensaje: 'El club ha marcado tu anuncio como cerrado.',
      tipo: 'informativo',
      icono: '✅',
    });
  }
}

export async function cancelarArticulo(item, motivo, actorEmail) {
  await base44.entities.MarketListing.update(item.id, {
    estado: 'cancelado',
    cancelado_por: actorEmail || '',
    motivo_cancelacion: motivo || '',
  });

  const reservas = await base44.entities.MarketReservation.filter({ listing_id: item.id, estado: 'pendiente' });
  for (const r of reservas || []) {
    await base44.entities.MarketReservation.update(r.id, { estado: 'cancelada' });
  }

  const avisar = [item.vendedor_email, item.reservado_por_email].filter((e) => e && e !== actorEmail);
  for (const email of avisar) {
    await safeNotif({
      usuario_email: email,
      titulo: `Anuncio retirado: ${item.titulo}`,
      mensaje: motivo ? `El club ha retirado este anuncio. Motivo: ${motivo}` : 'El club ha retirado este anuncio del Mercadillo.',
      tipo: 'importante',
      icono: '🚫',
    });
    await safeEmail({
      to: email,
      subject: `Anuncio retirado del Mercadillo: ${item.titulo}`,
      body: `El club ha retirado el anuncio "${item.titulo}" del Mercadillo.${motivo ? `\n\nMotivo: ${motivo}` : ''}\n\nSi crees que es un error, responde a este correo o habla con el club.\n\nCD Bustarviejo`,
    });
  }
}

export async function anularMiReserva(item, user) {
  const reservas = await base44.entities.MarketReservation.filter({ listing_id: item.id, comprador_email: user.email, estado: 'pendiente' });
  for (const r of reservas || []) {
    await base44.entities.MarketReservation.update(r.id, { estado: 'cancelada' });
  }
  await base44.entities.MarketListing.update(item.id, {
    estado: 'activo',
    reservado_por_email: '',
    reservado_por_nombre: '',
    reservado_por_telefono: '',
    reservado_fecha: '',
  });

  const vendedorEmail = item.vendedor_email || item.created_by;
  if (vendedorEmail) {
    await safeNotif({
      usuario_email: vendedorEmail,
      titulo: `Reserva anulada: ${item.titulo}`,
      mensaje: `${item.reservado_por_nombre || user.email} ha anulado su reserva. El artículo vuelve a estar disponible.`,
      tipo: 'informativo',
      icono: '↩️',
    });
    await safeEmail({
      to: vendedorEmail,
      subject: `Reserva anulada: ${item.titulo}`,
      body: `${item.reservado_por_nombre || user.email} ha anulado su reserva de "${item.titulo}".\n\nTu anuncio vuelve a estar disponible para otras familias.\n\nCD Bustarviejo`,
    });
  }
}

export async function liberarReserva(item) {
  const reservas = await base44.entities.MarketReservation.filter({ listing_id: item.id, estado: 'pendiente' });
  for (const r of reservas || []) {
    await base44.entities.MarketReservation.update(r.id, { estado: 'cancelada' });
  }
  await base44.entities.MarketListing.update(item.id, {
    estado: 'activo',
    reservado_por_email: '',
    reservado_por_nombre: '',
    reservado_por_telefono: '',
    reservado_fecha: '',
  });
  if (item.reservado_por_email) {
    await safeEmail({
      to: item.reservado_por_email,
      subject: `Reserva liberada: ${item.titulo}`,
      body: `El vendedor ha liberado la reserva de "${item.titulo}", por lo que el artículo vuelve a estar disponible para otras familias.\n\nCD Bustarviejo`,
    });
  }
}