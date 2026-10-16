export const SURVEY_TEMPLATES = {
  "Satisfacción General": [
    { pregunta: "¿Cómo valorarías tu experiencia global en el CD Bustarviejo?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Te sientes parte de la comunidad del club?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El club cumple las expectativas que tenías al incorporarte?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Recomendarías el club a otras familias o deportistas?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué es lo que mejor funciona actualmente?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué tres mejoras priorizarías?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Hay algo importante que no te hayamos preguntado?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Fin de Temporada": [
    { pregunta: "¿Cómo valorarías la temporada en conjunto?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El deportista ha disfrutado de la temporada?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Has percibido evolución deportiva y personal?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La organización de entrenamientos y partidos ha sido adecuada?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Cómo valorarías la comunicación con las familias?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué momento o logro destacarías de la temporada?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué deberíamos mantener el próximo año?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué cambiarías o mejorarías para la próxima temporada?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Inicio de Temporada": [
    { pregunta: "¿La información de inicio de temporada llegó con suficiente antelación?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Quedaron claras las cuotas, equipación y documentación necesarias?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Los horarios propuestos encajan con la organización familiar?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La incorporación al equipo fue sencilla?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué dudas siguen sin resolverse?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué información te habría gustado recibir antes?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Deportiva y Entrenamientos": [
    { pregunta: "¿Los entrenamientos están bien estructurados y aprovechan el tiempo?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Las sesiones se adaptan a la edad y nivel del grupo?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Hay equilibrio entre técnica, táctica, condición física y diversión?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Los deportistas participan activamente durante las sesiones?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La carga de entrenamientos resulta adecuada?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué contenidos o ejercicios te gustaría reforzar?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué cambio concreto mejoraría los entrenamientos?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Entrenadores y Cuerpo Técnico": [
    { pregunta: "¿El entrenador prepara y dirige bien los entrenamientos?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Explica las decisiones y objetivos de forma comprensible?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Trata a todos los deportistas con respeto y equidad?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Fomenta esfuerzo, compañerismo y deportividad?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Da indicaciones útiles para mejorar individualmente?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La comunicación entrenador-familia es adecuada?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué debería seguir haciendo el cuerpo técnico?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué sugerencia constructiva trasladarías?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Competición y Partidos": [
    { pregunta: "¿La organización de convocatorias y horarios es clara?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La información sobre partidos y desplazamientos llega a tiempo?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La experiencia competitiva es adecuada para la categoría?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Se promueven el respeto al rival y al arbitraje?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La distribución de participación y minutos te parece adecuada para la etapa?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué mejorarías de la organización de los días de partido?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué apoyo necesitarían las familias en desplazamientos o logística?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Progreso y Formación Deportiva": [
    { pregunta: "¿Percibes mejoras técnicas desde el inicio de temporada?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Ha mejorado la comprensión táctica y la toma de decisiones?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Ha ganado confianza y autonomía?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Recibe indicaciones claras sobre cómo mejorar?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Se reconocen el esfuerzo y la evolución, además de los resultados?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué habilidad o aspecto personal destacarías?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué objetivo realista propondrías para el próximo trimestre?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Valores, Convivencia e Inclusión": [
    { pregunta: "¿El ambiente del equipo es respetuoso?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El deportista se siente integrado y aceptado?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Se gestionan adecuadamente los conflictos?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Se fomenta el respeto a árbitros, rivales y compañeros?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Las normas de convivencia son claras y se aplican de forma coherente?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué deberíamos hacer para mejorar el ambiente del club?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "Si quieres señalar una situación concreta, descríbela sin incluir datos personales innecesarios.", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Bienestar y Seguridad Deportiva": [
    { pregunta: "¿Consideras que los entrenamientos se desarrollan en un entorno seguro?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Se atienden las necesidades y límites de cada deportista?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Se promueven hábitos saludables, descanso e hidratación?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Sabes a quién dirigirte para comunicar una preocupación de bienestar o protección?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La gestión de lesiones o incidencias te parece adecuada?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué medida preventiva o de bienestar reforzarías?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Fútbol Femenino": [
    { pregunta: "¿Cómo valorarías la experiencia deportiva del equipo femenino?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Los entrenamientos responden a las necesidades del grupo?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Las jugadoras disponen de oportunidades adecuadas de aprendizaje y competición?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Te sientes escuchada/o por el cuerpo técnico y el club?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La comunicación y planificación del equipo son suficientes?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué ayudaría a consolidar y hacer crecer el fútbol femenino en Bustarviejo?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué actividad, recurso o mejora propondrías?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Baloncesto": [
    { pregunta: "¿La actividad de baloncesto cumple tus expectativas?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La duración y frecuencia de las sesiones son adecuadas?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El espacio y el material permiten entrenar con comodidad?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Las sesiones combinan aprendizaje, participación y diversión?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué te gustaría que ofreciera el club para desarrollar el baloncesto?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Te interesaría participar en encuentros, jornadas o competición futura?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Instalaciones y Espacios Deportivos": [
    { pregunta: "¿Cómo valoras el estado general de las instalaciones?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Las zonas de práctica deportiva son seguras y funcionales?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Los vestuarios, aseos y zonas comunes están en condiciones adecuadas?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Hay suficiente material y espacio para entrenar?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué prioridad darías a mejorar iluminación, protecciones, marcador, zonas de entrenamiento u otros espacios?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "Si tuvieras que elegir una sola inversión, ¿cuál sería y por qué?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Aplicación y Herramientas Digitales": [
    { pregunta: "¿Te resulta fácil encontrar lo que necesitas en la app?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La información de tu equipo y del club está actualizada y es clara?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Las notificaciones llegan en el momento adecuado?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Te resulta sencillo consultar convocatorias, calendario y avisos?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Has tenido problemas para acceder, firmar documentos o completar gestiones?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué apartado de la app utilizas más?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué función nueva te ahorraría más tiempo?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué cambiarías para que la app sea más fácil desde el móvil?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Comunicación e Información": [
    { pregunta: "¿Recibes la información importante con suficiente antelación?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Los mensajes son claros y contienen los datos necesarios?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La app es un canal adecuado para las comunicaciones del club?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Sabes a quién contactar para cada tipo de consulta?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La respuesta a dudas e incidencias llega en un plazo razonable?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué información echas en falta habitualmente?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué mejorarías de los canales y la frecuencia de comunicación?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Gestión y Administración del Club": [
    { pregunta: "¿Los procesos de inscripción y renovación son sencillos?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La documentación y los trámites se explican con claridad?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Sabes cómo comunicar incidencias administrativas?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Los plazos y requisitos se informan con suficiente antelación?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué gestión te resulta más complicada o repetitiva?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué trámite priorizarías simplificar o automatizar?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué información debería estar más visible para las familias?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Cuotas, Pagos y Transparencia": [
    { pregunta: "¿La información sobre cuotas y conceptos incluidos es clara?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Los plazos y formas de pago se comunican adecuadamente?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El proceso para consultar dudas o incidencias de pago es sencillo?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Consideras que la información general sobre el uso de los recursos del club es suficiente?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué información económica general te gustaría conocer mejor?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué mejora administrativa propondrías en este ámbito?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Equipación y Material Deportivo": [
    { pregunta: "¿La calidad de la equipación te parece adecuada?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El proceso para pedir y recibir la ropa es sencillo?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Las tallas, el tallaje y la información previa son correctos?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Se comunica con claridad el estado de los pedidos?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué material común necesita más renovación?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué prenda o artículo añadirías a la tienda del club?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Eventos, Torneos y Actividades": [
    { pregunta: "¿Cómo valorarías la organización general de la actividad?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La información previa fue suficiente y llegó a tiempo?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Los horarios y espacios fueron adecuados?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La actividad fue inclusiva y atractiva para las familias y deportistas?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué fue lo mejor de la actividad?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué cambiarías para la próxima edición?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué torneo, jornada o actividad te gustaría que organizáramos?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Familias y Participación": [
    { pregunta: "¿Te sientes escuchado/a por el club?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Tienes oportunidades suficientes para participar y aportar ideas?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La información sobre reuniones y decisiones llega con claridad?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué facilitaría tu participación en la vida del club?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿En qué actividades podrías colaborar ocasionalmente?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué tema te gustaría que se tratara en una próxima reunión de socios?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Voluntariado y Colaboración": [
    { pregunta: "¿Conoces las formas de colaborar con el club?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Las tareas de voluntariado están explicadas con claridad?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Consideras que la carga de tareas se reparte adecuadamente?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué tarea puntual podrías ayudar a cubrir?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué te impediría colaborar más: tiempo, información, horarios u otro motivo?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué reconocimiento o apoyo ayudaría a mantener el voluntariado?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Socios y Comunidad del Club": [
    { pregunta: "¿Conoces los objetivos y prioridades del CD Bustarviejo?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Te sientes informado/a sobre las actividades y decisiones del club?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué valor debería distinguir al club dentro de Bustarviejo?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué iniciativa reforzaría la relación con el municipio y la comunidad?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué servicios o ventajas valorarías para socios y familias?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué deberíamos priorizar durante el próximo año?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Patrocinadores y Colaboradores": [
    { pregunta: "¿Conoces las iniciativas de patrocinio y colaboración del club?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Crees que las empresas locales tienen vías claras para colaborar?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué beneficios para patrocinadores serían más útiles y realistas?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Conoces algún comercio o empresa que pudiera colaborar?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué actividad podría ayudar a generar recursos para el club?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Coordinación y Organización Deportiva": [
    { pregunta: "¿La coordinación entre entrenadores, equipos y club funciona correctamente?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Los criterios organizativos se comunican de forma coherente?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Los cambios de horarios o espacios se gestionan bien?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Se resuelven las incidencias con rapidez suficiente?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué proceso de coordinación deberíamos revisar primero?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué información o herramienta facilitaría el trabajo de entrenadores y coordinadores?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Ideas y Prioridades del Club": [
    { pregunta: "¿Qué aspecto del club debería ser la prioridad número uno?", tipo_respuesta: "texto", obligatoria: true },
    { pregunta: "¿Qué deberíamos mantener porque funciona bien?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué deberíamos dejar de hacer o simplificar?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué nueva actividad o sección te gustaría impulsar?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué mejora tendría mayor impacto para los deportistas?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué cambio pequeño podríamos aplicar en los próximos tres meses?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Encuesta Rápida / Pulso": [
    { pregunta: "En general, ¿cómo valoras la situación actual del club?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué está funcionando mejor esta semana o este mes?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué problema necesita atención más urgente?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Hay alguna decisión o información sobre la que necesites más claridad?", tipo_respuesta: "texto", obligatoria: false }
  ]
};

export const SURVEY_TEMPLATE_CATEGORIES = Object.keys(SURVEY_TEMPLATES);
