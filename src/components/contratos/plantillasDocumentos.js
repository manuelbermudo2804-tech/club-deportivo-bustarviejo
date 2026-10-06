// Plantillas de documentos para firmar. {nombre} y {jugador} se sustituyen al crear.
export const PLANTILLAS = [
  { id: "voluntariado", grupo: "staff", titulo: "Acuerdo de incorporación como voluntario", texto: "" },
  {
    id: "codigo_conducta", grupo: "staff", titulo: "Código de conducta con menores",
    texto: `Yo, {nombre}, como miembro del cuerpo técnico del CD Bustarviejo, me comprometo a:

1. Tratar a todos los jugadores con respeto, sin gritos, insultos ni humillaciones.
2. No quedarme a solas con un menor en espacios cerrados (vestuarios, coches) salvo causa justificada y conocida por el club.
3. No mantener conversaciones privadas con menores por redes sociales o mensajería personal; usar los canales del club.
4. No hacer ni difundir fotos o vídeos de menores fuera de los canales autorizados por el club.
5. Comunicar al Delegado de Protección del club cualquier situación de riesgo para un menor (LOPIVI).
6. Mantener vigente mi certificado negativo del Registro Central de Delincuentes Sexuales y avisar si cambia mi situación.

El incumplimiento de este código podrá suponer la baja inmediata en el club.`,
  },
  {
    id: "confidencialidad", grupo: "staff", titulo: "Compromiso de confidencialidad de datos",
    texto: `Yo, {nombre}, me comprometo a que los datos personales de jugadores y familias a los que tenga acceso por mi función en el CD Bustarviejo (teléfonos, direcciones, datos médicos, fotos, pagos...) se usen solo para la actividad del club.

No los copiaré, compartiré con terceros ni usaré para fines personales, y los dejaré de usar cuando termine mi relación con el club, conforme al RGPD.`,
  },
  {
    id: "entrega_material", grupo: "staff", titulo: "Recibí de material del club",
    texto: `Yo, {nombre}, declaro recibir del CD Bustarviejo el siguiente material:

- (escribe aquí el material: chándal, balones, petos, llaves...)

Me comprometo a cuidarlo, usarlo solo para la actividad del club y devolverlo cuando el club lo solicite o al terminar mi relación con el club.`,
  },
  {
    id: "viaje", grupo: "familia", titulo: "Autorización de viaje / torneo",
    texto: `Como padre, madre o tutor legal de {jugador}, autorizo su participación en:

- Evento: (nombre del torneo o viaje)
- Fechas: (del ... al ...)
- Lugar: (localidad)
- Pernocta fuera de casa: (sí / no)

Autorizo a los responsables del club a acompañarle y a tomar las decisiones necesarias en caso de urgencia médica si no pudieran localizarme.`,
  },
  {
    id: "volver_solo", grupo: "familia", titulo: "Autorización para salir solo / recogida por otra persona",
    texto: `Como padre, madre o tutor legal de {jugador}, autorizo que al terminar entrenamientos y partidos:

- (marca una) Vuelva solo a casa / Le recoja: (nombre y DNI de la persona)

Esta autorización es válida hasta que la retire por escrito al club.`,
  },
  { id: "familia_libre", grupo: "familia", titulo: "Autorización puntual", texto: "Como padre, madre o tutor legal de {jugador}, autorizo:\n\n" },
];