import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Handshake, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const DISMISS_KEY = 'sponsor_recruit_dismissed';
const SHOW_INTERVAL_DAYS = 30; // Mostrar una vez al mes

export default function SponsorRecruitBanner({ user }) {
  // Banner desactivado
  return null;
};

// Dead code below kept for future reactivation
function SponsorRecruitBannerContent({ user }) {
  const [visible, setVisible] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="mx-4 mt-3 animate-fade-in">
        <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-md">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Handshake className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 text-sm">
                  ¿Conoces alguna empresa que quiera patrocinarnos? 🏆
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Ayuda al club a crecer. Si conoces un negocio interesado, mándanos sus datos y nos pondremos en contacto.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => { setShowForm(true); handleDismiss(); }}
                    className="bg-amber-600 hover:bg-amber-700 text-xs h-8"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Recomendar empresa
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-xs h-8 text-slate-500">
                    Ahora no
                  </Button>
                </div>
              </div>
              <button onClick={handleDismiss} className="p-1 hover:bg-amber-200/50 rounded-full flex-shrink-0">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <SponsorRecommendDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        user={user}
      />
    </>
  );
}

function SponsorRecommendDialog({ open, onClose, user }) {
  const [empresa, setEmpresa] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!empresa.trim()) {
      toast.error('Escribe el nombre de la empresa');
      return;
    }
    setSending(true);
    try {
      // Enviar email al admin con los datos
      await base44.integrations.Core.SendEmail({
        to: 'cdbustarviejo@gmail.com',
        subject: `🤝 Recomendación de patrocinador: ${empresa}`,
        body: `
          <h2>Nueva recomendación de patrocinador</h2>
          <p><strong>Recomendado por:</strong> ${user?.full_name || 'Usuario'} (${user?.email})</p>
          <hr/>
          <p><strong>Empresa:</strong> ${empresa}</p>
          ${contacto ? `<p><strong>Persona de contacto:</strong> ${contacto}</p>` : ''}
          ${telefono ? `<p><strong>Teléfono:</strong> ${telefono}</p>` : ''}
          ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
          ${notas ? `<p><strong>Notas:</strong> ${notas}</p>` : ''}
        `
      });
      toast.success('¡Gracias! Hemos recibido tu recomendación. El club se pondrá en contacto con la empresa.');
      onClose();
      setEmpresa(''); setContacto(''); setTelefono(''); setEmail(''); setNotas('');
    } catch (e) {
      toast.error('Error al enviar. Inténtalo de nuevo.');
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-amber-600" />
            Recomendar patrocinador
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Nombre de la empresa *</label>
            <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ej: Restaurante El Parador" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Persona de contacto</label>
            <Input value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Ej: Juan García" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Teléfono</label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="600 123 456" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@empresa.com" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Notas / Relación</label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: Es el padre de Marcos, tiene una tienda en el pueblo..." rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={sending} className="w-full bg-amber-600 hover:bg-amber-700">
            {sending ? 'Enviando...' : '📤 Enviar recomendación al club'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}