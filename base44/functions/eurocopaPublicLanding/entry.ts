import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
Deno.serve(async (req) => {
 try {
  const base44=createClientFromRequest(req);
  const url=new URL(req.url);let previewCodigo=url.searchParams.get('preview')||'';if(!previewCodigo&&req.method==='POST'){try{const body=await req.json();previewCodigo=body?.preview_codigo||body?.preview||'';}catch{}}
  const [cfgs,equipos,parts]=await Promise.all([
   base44.asServiceRole.entities.EurocopaConfig.list(),
   base44.asServiceRole.entities.EurocopaEquipo.list('grupo',100),
   base44.asServiceRole.entities.EurocopaParticipante.filter({estado_pago:'pagado'})
  ]);
  const c=cfgs[0]||null;
  // Los registros archivados no forman parte de los seis grupos oficiales.
  const equiposActivos=equipos.filter(e=>['A','B','C','D','E','F'].includes(e.grupo));
  const previewValido=!!(c?.modo_preview&&c?.codigo_preview&&previewCodigo&&previewCodigo===c.codigo_preview);
  const visibles=parts.filter(p=>!p.es_prueba);
  return Response.json({preview_mode:previewValido,config:c?{activa:!!c.activa||previewValido,estado:previewValido?'inscripciones_abiertas':c.estado,nombre_torneo:c.nombre_torneo,precio_entrada:Number(c.precio_entrada||10),comision_club_porcentaje:Number(c.comision_club_porcentaje||10),permitir_mini_ligas:!!c.permitir_mini_ligas,permitir_multiples_porras:!!c.permitir_multiples_porras,mostrar_ranking_publico:c.mostrar_ranking_publico!==false,fecha_inicio_torneo:previewValido?null:c.fecha_inicio_torneo,fecha_limite_predicciones:previewValido?null:c.fecha_limite_predicciones}:null,equipos:equiposActivos,stats:{total_participantes:visibles.length,bote:visibles.length*Number(c?.precio_entrada||10)}});
 } catch(e){return Response.json({error:e.message},{status:500});}
});