import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && !user.es_tesorero)) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { fileUrl, temporada } = await req.json();

    if (!fileUrl) {
      return Response.json({ error: 'Falta el archivo' }, { status: 400 });
    }

    // Paso 1: Extraer transacciones del CSV/Excel
    const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
        type: "object",
        properties: {
          movimientos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fecha: { type: "string", description: "Fecha de la transacción (formato DD/MM/YYYY)" },
                concepto: { type: "string", description: "Descripción/concepto de la transacción" },
                importe: { type: "number", description: "Importe en euros (positivo=ingreso, negativo=gasto)" },
                saldo: { type: "number", description: "Saldo después de la transacción" }
              }
            }
          }
        }
      }
    });

    if (extractResult.status !== "success" || !extractResult.output?.movimientos) {
      return Response.json({ 
        error: 'No se pudieron extraer movimientos del archivo',
        details: extractResult.details 
      }, { status: 400 });
    }

    const movimientos = extractResult.output.movimientos;

    // Paso 2: Cargar datos para hacer matching inteligente
    const [payments, players, clothingOrders, lotteryOrders] = await Promise.all([
      base44.entities.Payment.filter({ temporada }),
      base44.entities.Player.list(),
      base44.entities.ClothingOrder.filter({ temporada }),
      base44.entities.LotteryOrder.filter({ temporada })
    ]);

    // Paso 3: Analizar cada movimiento con IA para sugerir categorización
    const movimientosConSugerencias = await Promise.all(
      movimientos.map(async (mov) => {
        const esIngreso = mov.importe > 0;
        
        // Buscar coincidencias con datos existentes
        let sugerencias = [];
        
        if (esIngreso) {
          // Buscar en jugadores por nombre/apellido
          const palabras = (mov.concepto || '').toUpperCase().split(/\s+/);
          const jugadorMatch = players.find(p => 
            palabras.some(palabra => 
              p.nombre?.toUpperCase().includes(palabra) && palabra.length > 3
            )
          );

          if (jugadorMatch) {
            // Buscar pagos pendientes de este jugador
            const pagosPendientes = payments.filter(p => 
              p.jugador_id === jugadorMatch.id && 
              p.estado === "Pendiente" &&
              Math.abs(p.cantidad - Math.abs(mov.importe)) < 5 // Tolerancia de 5€
            );

            if (pagosPendientes.length > 0) {
              sugerencias.push({
                tipo: 'cuota_jugador',
                confidence: 'alta',
                jugador: jugadorMatch.nombre,
                jugador_id: jugadorMatch.id,
                pago_id: pagosPendientes[0].id,
                concepto_sugerido: `Cuota ${pagosPendientes[0].mes} - ${jugadorMatch.nombre}`,
                categoria: 'Ingresos',
                subcategoria: 'Cuotas Jugadores'
              });
            }
          }

          // Buscar en pedidos de ropa
          const ropaPendiente = clothingOrders.find(o => 
            !o.pagado && 
            Math.abs((o.precio_final || o.precio_total) - Math.abs(mov.importe)) < 5
          );

          if (ropaPendiente) {
            sugerencias.push({
              tipo: 'ropa',
              confidence: 'media',
              pedido_id: ropaPendiente.id,
              jugador: ropaPendiente.jugador_nombre,
              concepto_sugerido: `Equipación - ${ropaPendiente.jugador_nombre}`,
              categoria: 'Ingresos',
              subcategoria: 'Venta Equipación'
            });
          }

          // Si no hay match específico, usar IA
          if (sugerencias.length === 0) {
            const aiResponse = await base44.integrations.Core.InvokeLLM({
              prompt: `Analiza este movimiento bancario y sugiere la categoría:
Concepto: ${mov.concepto}
Importe: ${mov.importe}€
Es un INGRESO de un club deportivo.

Posibles categorías:
- Cuotas Jugadores
- Venta Equipación
- Patrocinios
- Subvenciones
- Lotería
- Cuotas Socios
- Otros Ingresos

Responde SOLO con la categoría más probable.`,
              response_json_schema: {
                type: "object",
                properties: {
                  categoria: { type: "string" },
                  subcategoria: { type: "string" },
                  confianza: { type: "string", enum: ["alta", "media", "baja"] }
                }
              }
            });

            sugerencias.push({
              tipo: 'ia_general',
              confidence: aiResponse.confianza || 'baja',
              concepto_sugerido: mov.concepto,
              categoria: 'Ingresos',
              subcategoria: aiResponse.subcategoria || 'Otros Ingresos'
            });
          }
        } else {
          // Es un GASTO - categorizar con IA
          const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt: `Analiza este GASTO de un club deportivo:
Concepto: ${mov.concepto}
Importe: ${Math.abs(mov.importe)}€

Categorías posibles:
- Gastos Fijos: Seguros, Federación, Suministros, Mantenimiento
- Gastos Variables: Material Deportivo, Arbitrajes, Desplazamientos, Equipación
- Personal: Nóminas entrenadores, staff
- Inversiones: Mejoras, equipamiento

Responde con la categoría más probable.`,
            response_json_schema: {
              type: "object",
              properties: {
                categoria: { type: "string", enum: ["Gastos Fijos", "Gastos Variables", "Personal", "Inversiones"] },
                subcategoria: { type: "string" },
                confianza: { type: "string", enum: ["alta", "media", "baja"] }
              }
            }
          });

          sugerencias.push({
            tipo: 'gasto',
            confidence: aiResponse.confianza || 'media',
            concepto_sugerido: mov.concepto,
            categoria: aiResponse.categoria || 'Gastos Variables',
            subcategoria: aiResponse.subcategoria || mov.concepto
          });
        }

        return {
          ...mov,
          sugerencias,
          mejor_sugerencia: sugerencias[0] || null
        };
      })
    );

    return Response.json({ 
      success: true,
      movimientos: movimientosConSugerencias,
      total_movimientos: movimientosConSugerencias.length,
      ingresos: movimientosConSugerencias.filter(m => m.importe > 0).length,
      gastos: movimientosConSugerencias.filter(m => m.importe < 0).length
    });

  } catch (error) {
    console.error('Error importando extracto:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});