import { CLUB } from "@/components/subvencion/clubDatos";
import { eur } from "@/components/subvencion/expedienteConfig";

const t = (temporada) => temporada.replace("-", "/");
const intro = `D. ${CLUB.presidente}, en calidad de Presidente del ${CLUB.nombre.replace("CLUB DEPORTIVO", "Club Deportivo")}, con CIF ${CLUB.cif} y domicilio social en ${CLUB.domicilio},`;

export const docArt13 = (temporada) => ({
  titulo: "DECLARACIÓN RESPONSABLE",
  subtitulo: "Artículo 13 de la Ley 38/2003, de 17 de noviembre, General de Subvenciones",
  filename: `Declaracion_responsable_art13_${temporada}.pdf`,
  bloques: [
    { tipo: "p", texto: intro },
    { tipo: "p", texto: "DECLARA RESPONSABLEMENTE:", bold: true },
    { tipo: "p", texto: "1. Que la entidad no se encuentra incursa en ninguna de las circunstancias que impiden obtener la condición de beneficiario de subvenciones públicas previstas en los apartados 2 y 3 del artículo 13 de la Ley 38/2003, de 17 de noviembre, General de Subvenciones." },
    { tipo: "p", texto: "2. Que la entidad se encuentra al corriente en el cumplimiento de sus obligaciones tributarias y frente a la Seguridad Social, así como de cualquier otra deuda con el Ayuntamiento de Bustarviejo." },
    { tipo: "p", texto: `3. Que la subvención concedida para la temporada ${t(temporada)} se ha destinado íntegramente a la finalidad para la que fue otorgada.` },
    { tipo: "p", texto: "Y para que conste a los efectos oportunos, firma la presente declaración." },
    { tipo: "firma" },
  ],
});

export const docDomicilio = (temporada) => ({
  titulo: "CERTIFICADO DE DOMICILIO SOCIAL",
  filename: `Certificado_domicilio_social_${temporada}.pdf`,
  bloques: [
    { tipo: "p", texto: intro },
    { tipo: "p", texto: "CERTIFICA:", bold: true },
    { tipo: "p", texto: `Que el domicilio social de la entidad se encuentra en ${CLUB.domicilio}, dentro del término municipal de Bustarviejo, y que la entidad desarrolla su actividad deportiva en este municipio durante la temporada ${t(temporada)}.` },
    { tipo: "p", texto: "Y para que conste a los efectos oportunos, se expide el presente certificado." },
    { tipo: "firma" },
  ],
});

// lista: [{ entidad, concepto, importe }]
export const docOtrasSubvenciones = (temporada, lista) => {
  const total = lista.reduce((s, x) => s + (Number(x.importe) || 0), 0);
  const cuerpo = lista.length
    ? [
        { tipo: "p", texto: `${intro} hace constar que, en relación con la temporada ${t(temporada)}, la entidad ha recibido las siguientes subvenciones o ayudas de otras entidades:` },
        { tipo: "tabla", cols: [{ t: "Entidad concedente", w: 66 }, { t: "Concepto", w: 78 }, { t: "Importe", w: 30, align: "right" }], filas: lista.map((x) => [x.entidad, x.concepto, eur(x.importe)]), total: ["TOTAL", "", eur(total)] },
      ]
    : [{ tipo: "p", texto: `${intro} DECLARA que la entidad no ha recibido otras subvenciones o ayudas para la misma finalidad durante la temporada ${t(temporada)}.` }];
  return {
    titulo: lista.length ? "RELACIÓN DE OTRAS SUBVENCIONES RECIBIDAS" : "DECLARACIÓN DE NO HABER RECIBIDO OTRAS SUBVENCIONES",
    subtitulo: `Temporada ${t(temporada)}`,
    filename: `Relacion_otras_subvenciones_${temporada}.pdf`,
    bloques: [...cuerpo, { tipo: "p", texto: "Y para que conste a los efectos oportunos, se firma la presente relación." }, { tipo: "firma" }],
  };
};

export const PLANTILLAS = { art13: docArt13, domicilio: docDomicilio };