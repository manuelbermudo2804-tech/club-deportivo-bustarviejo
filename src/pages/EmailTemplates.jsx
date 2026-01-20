import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Gift, Users, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function EmailTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch birthday logs para ver estadísticas
  const { data: birthdayLogs } = useQuery({
    queryKey: ['birthdayLogs'],
    queryFn: () => base44.asServiceRole.entities.BirthdayLog.filter({ email_enviado: true }, '-fecha_envio_email', 100),
    initialData: []
  });

  // Fetch club members para ver si los socios reciben felicitaciones
  const { data: clubMembers } = useQuery({
    queryKey: ['clubMembers'],
    queryFn: () => base44.asServiceRole.entities.ClubMember.list('-created_date', 20),
    initialData: []
  });

  const membershipWelcomeEmail = {
    id: 'membership-welcome',
    name: 'Email de Bienvenida - Socios',
    type: 'membership',
    icon: Users,
    description: 'Se envía cuando un socio completa el pago de su membresía',
    subject: '🎉 ¡Bienvenido a CD Bustarviejo! Tu membresía está activada',
    trigger: 'Al cambiar estado_pago a "Pagado" en ClubMember',
    preview: `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ea580c 0%, #22c55e 100%); color: white; padding: 40px 20px; text-align: center;">
          <h1>🎉 ¡Bienvenido a la Familia CD Bustarviejo!</h1>
          <p>Tu membresía está activada</p>
        </div>
        <div style="padding: 40px 20px;">
          <p>Estimado/a socio,</p>
          <p>Queremos expresarte nuestro <strong>más sincero agradecimiento</strong> por haber confiado en CD Bustarviejo y convertirte en socio del club.</p>
          
          <h2 style="color: #ea580c;">✨ Tu Membresía Está Activa</h2>
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 15px 0;">
            <ul>
              <li>✅ <strong>Apoyo directo al club</strong> y a nuestros deportistas</li>
              <li>✅ <strong>Participación en actividades</strong> especiales</li>
              <li>✅ <strong>Comunicación directa</strong> con la junta directiva</li>
              <li>✅ <strong>Sentido de pertenencia</strong> a nuestra comunidad deportiva</li>
            </ul>
          </div>

          <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>¿Preguntas o sugerencias?</strong></p>
            <p>📧 cdbustarviejo@gmail.com</p>
          </div>
        </div>
      </div>
    `
  };

  const birthdayEmail = {
    id: 'birthday-wishes',
    name: 'Email de Felicitación de Cumpleaños',
    type: 'birthday',
    icon: Gift,
    description: 'Se envía automáticamente en el cumpleaños del usuario/jugador',
    subject: '🎂 ¡Feliz Cumpleaños! 🎉',
    trigger: 'Diariamente - función sendBirthdayWishes',
    preview: `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 40px 20px; text-align: center;">
          <h1 style="font-size: 48px; margin: 0;">🎂</h1>
          <h1>¡Feliz Cumpleaños!</h1>
          <p>Desde CD Bustarviejo te enviamos nuestros mejores deseos</p>
        </div>
        <div style="padding: 40px 20px; text-align: center;">
          <p style="font-size: 18px;">Que disfrutes mucho de tu día especial rodeado de los tuyos y de la familia CD Bustarviejo.</p>
          <p style="font-size: 14px; color: #666;">¡Un abrazo! 🎉</p>
        </div>
      </div>
    `
  };

  const stats = {
    birthdayEmailsThisMonth: birthdayLogs.filter(log => {
      const logDate = new Date(log.fecha_envio_email);
      const now = new Date();
      return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    }).length,
    membershipEmailsThisMonth: clubMembers.filter(m => {
      const date = new Date(m.fecha_email_bienvenida || '');
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
    socsReceivingBirthdayWishes: clubMembers.filter(m => m.recibe_felicitacion_cumpleanos !== false).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">📧 Gestión de Emails y Notificaciones</h1>
          <p className="text-slate-600">Visualiza los templates de emails que se envían automáticamente en la app</p>
        </div>

        {/* Estadísticas */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Emails de Bienvenida (Este Mes)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.membershipEmailsThisMonth}</div>
              <p className="text-xs text-slate-500 mt-1">Nuevos socios pagados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Felicitaciones de Cumpleaños (Este Mes)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.birthdayEmailsThisMonth}</div>
              <p className="text-xs text-slate-500 mt-1">Emails enviados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Socios Reciben Cumpleaños</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-pink-600">{stats.socsReceivingBirthdayWishes}</div>
              <p className="text-xs text-slate-500 mt-1">Socios activos</p>
            </CardContent>
          </Card>
        </div>

        {/* Templates */}
        <div className="grid md:grid-cols-2 gap-6">
          {[membershipWelcomeEmail, birthdayEmail].map((template) => {
            const IconComponent = template.icon;
            return (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <IconComponent className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge className="mt-1 bg-green-100 text-green-800">Automático</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Descripción:</p>
                    <p className="text-sm text-slate-600">{template.description}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Asunto:</p>
                    <p className="text-sm text-slate-600 italic">{template.subject}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Disparador:</p>
                    <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{template.trigger}</p>
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedTemplate(template);
                      setPreviewOpen(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Preview
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info sobre socios y cumpleaños */}
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Gift className="w-5 h-5" />
              ℹ️ Información sobre Felicitaciones de Cumpleaños
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-900 space-y-2">
            <p>✅ <strong>Todos los usuarios</strong> reciben felicitaciones de cumpleaños por correo electrónico</p>
            <p>✅ <strong>Los socios activos</strong> también reciben un modal/notificación en la app el día de su cumpleaños</p>
            <p>✅ Las felicitaciones se envían diariamente a través de la función <code className="bg-white px-2 py-1 rounded">sendBirthdayWishes</code></p>
            <p>✅ El registro se mantiene en la entidad <code className="bg-white px-2 py-1 rounded">BirthdayLog</code> para evitar duplicados</p>
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name} - Preview</DialogTitle>
          </DialogHeader>
          <div
            className="border rounded-lg overflow-hidden"
            dangerouslySetInnerHTML={{ __html: selectedTemplate?.preview || '' }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}