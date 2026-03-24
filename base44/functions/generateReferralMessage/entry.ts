import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TEMPLATES = [
  "¡Hey! Tienes que conocer el CD Bustarviejo ⚽ El ambiente es genial, los entrenadores son top y se lo pasan en grande. ¡Anímate a probarlo! 🔥",
  "¿Buscas un club deportivo para tu peque? En el CD Bustarviejo lo tienen todo: diversión, compañerismo y entrenadores titulados. ¡Os va a encantar! 💪⚽",
  "¡Oye! Te cuento: en el CD Bustarviejo hacemos deporte, nos reímos y los niños aprenden un montón. Es como una gran familia. ¿Te apuntas? 🏆",
  "Si quieres que tu hijo/a haga deporte en un club familiar y cercano, el CD Bustarviejo es tu sitio. ¡Ven a conocernos! ⚽😊",
  "¡Pásate por el CD Bustarviejo! Buen rollo, entrenadores geniales y un montón de actividades para todas las edades. ¡No te lo pierdas! 🙌⚽",
  "¿Conoces el CD Bustarviejo? Es un club deportivo donde los niños disfrutan, hacen amigos y mejoran cada día. ¡Te animo a que vengas a verlo! 🌟⚽",
  "¡Eh! Mira, en el CD Bustarviejo se lo pasan genial haciendo deporte. Es un club de barrio con corazón grande. ¡Tráete a la familia! ❤️⚽",
  "¡Tengo un plan para ti! Apunta a tu peque en el CD Bustarviejo: deporte, diversión y un equipazo de entrenadores. ¡Se va a flipar! 🚀⚽"
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userName, targetType } = await req.json();
    if (!userName || !targetType) {
      return Response.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Pick a random template
    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];

    return Response.json({ message: template });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});