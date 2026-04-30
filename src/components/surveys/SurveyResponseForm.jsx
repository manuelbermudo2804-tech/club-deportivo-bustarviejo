import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Star, Loader2, CheckCircle2, Heart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function SurveyResponseForm({ survey, onClose }) {
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const user = await base44.auth.me();

      // Anti-doble-respuesta: incluso en anónimas, comprobar BD por hash de email
      // Guardamos un identificador único oculto que NO expone identidad
      const uniqueMarker = survey.anonima
        ? `anon_${btoa(user.email).slice(0, 12)}`
        : user.email;

      const existing = await base44.entities.SurveyResponse.filter({
        survey_id: survey.id,
        respondente_email: uniqueMarker
      });

      if (existing && existing.length > 0) {
        toast.error("Ya has respondido a esta encuesta");
        setSubmitting(false);
        setSubmitted(true);
        return;
      }

      const formattedResponses = survey.preguntas.map((q, index) => ({
        pregunta: q.pregunta,
        respuesta: responses[index] || ""
      }));

      await base44.entities.SurveyResponse.create({
        survey_id: survey.id,
        survey_titulo: survey.titulo,
        respondente_email: uniqueMarker,
        respondente_nombre: survey.anonima ? "" : user.full_name,
        respuestas: formattedResponses,
        fecha_respuesta: new Date().toISOString()
      });

      await base44.entities.Survey.update(survey.id, {
        respuestas_count: (survey.respuestas_count || 0) + 1,
        respuestas_nuevas: (survey.respuestas_nuevas || 0) + 1,
        ultima_respuesta_fecha: new Date().toISOString()
      });

      try {
        localStorage.setItem(`survey_${survey.id}_responded_${user.email}`, 'true');
        window.dispatchEvent(new CustomEvent('survey-responded', { detail: { surveyId: survey.id } }));
      } catch {}

      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      queryClient.invalidateQueries({ queryKey: ['surveyResponses', survey.id] });
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting survey:", error);
      toast.error("Error al enviar la respuesta");
    }
    setSubmitting(false);
  };

  // Pantalla de agradecimiento
  if (submitted) {
    return (
      <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-white">
        <CardContent className="pt-12 pb-12 text-center space-y-6">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-green-800">¡Muchas Gracias!</h2>
            <p className="text-lg text-green-700">
              Tu opinión es muy valiosa para nosotros
            </p>
            <div className="flex items-center justify-center gap-2 text-green-600">
              <Heart className="w-5 h-5 fill-current" />
              <span className="text-sm font-medium">CD Bustarviejo</span>
              <Heart className="w-5 h-5 fill-current" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-green-200 max-w-sm mx-auto">
            <p className="text-sm text-slate-600">
              Hemos recibido tu respuesta a la encuesta <strong className="text-green-700">"{survey.titulo}"</strong>
            </p>
          </div>

          <Button 
            onClick={onClose}
            className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg"
          >
            Cerrar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-orange-200">
      <CardHeader>
        <CardTitle>{survey.titulo}</CardTitle>
        {survey.descripcion && <p className="text-sm text-slate-600 mt-2">{survey.descripcion}</p>}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {survey.preguntas.map((q, index) => (
            <div key={index} className="space-y-3 p-4 bg-slate-50 rounded-lg">
              <Label className="text-base font-semibold">
                {index + 1}. {q.pregunta}
                {q.obligatoria && <span className="text-red-500 ml-1">*</span>}
              </Label>

              {q.tipo_respuesta === "texto" && (
                <Textarea
                  value={responses[index] || ""}
                  onChange={(e) => setResponses({...responses, [index]: e.target.value})}
                  required={q.obligatoria}
                  placeholder="Tu respuesta..."
                  rows={3}
                />
              )}

              {q.tipo_respuesta === "rating" && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setResponses({...responses, [index]: rating.toString()})}
                      className={`p-2 rounded ${responses[index] >= rating.toString() ? 'text-yellow-500' : 'text-slate-300'}`}
                    >
                      <Star className="w-8 h-8 fill-current" />
                    </button>
                  ))}
                </div>
              )}

              {q.tipo_respuesta === "multiple" && q.opciones && (
                <RadioGroup
                  value={responses[index] || ""}
                  onValueChange={(value) => setResponses({...responses, [index]: value})}
                  required={q.obligatoria}
                >
                  {q.opciones.map((opcion, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <RadioGroupItem value={opcion} id={`q${index}-${i}`} />
                      <Label htmlFor={`q${index}-${i}`}>{opcion}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enviar Respuesta
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}