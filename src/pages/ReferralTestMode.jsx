import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ReferralTestMode() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('test_token');
  const flow = params.get('flow') === 'manual' ? 'manual' : 'automatic';
  const [user, setUser] = useState(null);
  const [seasonConfig, setSeasonConfig] = useState(null);
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [referrer, setReferrer] = useState('');
  const [form, setForm] = useState({name:'',email:'',dni:'',phone:'',manual:''});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const refresh = async () => {
    const [u,r] = await Promise.all([base44.entities.User.list(),base44.entities.ReferralTestRun.list()]);
    setUsers(u);
    setRows(r);
  };

  useEffect(() => {
    (async () => {
      try {
        const [me, seasons] = await Promise.all([base44.auth.me(), base44.entities.SeasonConfig.filter({ activa: true })]);
        const cfg = seasons?.[0] || null;
        setUser(me);
        setSeasonConfig(cfg);
        const allowed = me?.role === 'admin' || (cfg?.programa_referidos_modo_prueba === true && cfg?.programa_referidos_usuario_prueba_email?.toLowerCase() === me?.email?.toLowerCase());
        if (allowed) await refresh();
      } catch (e) {}
    })();
  }, []);

  const isAdmin = user?.role === 'admin';
  const isTester = Boolean(seasonConfig?.programa_referidos_modo_prueba && seasonConfig?.programa_referidos_usuario_prueba_email?.toLowerCase() === user?.email?.toLowerCase());
  const canAccess = isAdmin || isTester;

  const createSession = async () => {
    if (!referrer) return toast.error('Selecciona el socio que hará de recomendador');
    setLoading(true);
    try {
      const u = users.find(x => x.email?.toLowerCase() === referrer.toLowerCase());
      if (!u) throw new Error('No se encuentra el usuario seleccionado');
      const tokenValue = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      await base44.entities.ReferralTestRun.create({
        tipo_registro:'sesion', session_token:tokenValue, referidor_email:u.email,
        referidor_nombre:u.full_name||u.email, estado_prueba:'abierta', fecha_prueba:new Date().toISOString()
      });
      await refresh();
      toast.success('Sesión de pruebas creada');
    } catch(e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const link = (s,mode) => {
    const u = new URL('/ReferralTestMode',window.location.origin);
    u.searchParams.set('test_token',s.session_token);
    u.searchParams.set('flow',mode);
    if(mode==='automatic') u.searchParams.set('referrer',s.referidor_email);
    return u.toString();
  };

  const submit = async(e) => {
    e.preventDefault();
    const who = flow==='automatic' ? params.get('referrer') : form.manual.trim().toLowerCase();
    if(!form.name||!form.email||!form.dni||!form.phone||!who) return toast.error('Completa todos los campos');
    setLoading(true);
    try {
      const sessions = await base44.entities.ReferralTestRun.filter({session_token:token});
      if (!sessions.some(x => x.tipo_registro === 'sesion')) throw new Error('El enlace de prueba no es válido o ha caducado');
      await base44.entities.ReferralTestRun.create({
        tipo_registro:'referido', session_token:token, flujo:flow,
        referido_nombre:form.name, referido_email:form.email.toLowerCase(),
        referido_dni:form.dni, referido_telefono:form.phone, referidor_email:who,
        estado_prueba:'pendiente_validacion', pago_simulado:true, fecha_prueba:new Date().toISOString()
      });
      setSent(true);
    } catch(e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const validate = async(r) => {
    setLoading(true);
    try {
      const all = await base44.entities.ReferralTestRun.filter({session_token:r.session_token});
      const session = all.find(x=>x.tipo_registro==='sesion');
      const validatedReferrer = r.flujo==='automatic' ? session?.referidor_email : r.referidor_email;
      if(!validatedReferrer || !users.some(u=>u.email?.toLowerCase()===validatedReferrer.toLowerCase())) throw new Error('El socio recomendador no existe. Revisa el email antes de validar.');
      if(validatedReferrer.toLowerCase()===r.referido_email.toLowerCase()) throw new Error('Un socio no puede recomendarse a sí mismo.');
      if(all.some(x=>x.tipo_registro==='referido'&&x.id!==r.id&&x.referido_email?.toLowerCase()===r.referido_email.toLowerCase()&&x.estado_prueba==='validado')) throw new Error('Referido duplicado');
      const used = new Set(all.map(x=>x.numero_papeleta).filter(Boolean));
      let ticket = '';
      for(let i=0;i<10000;i++){const n=String(Math.floor(Math.random()*10000)).padStart(4,'0');if(!used.has(n)){ticket=n;break;}}
      if(!ticket) throw new Error('No se pudo generar papeleta');
      await base44.entities.ReferralTestRun.update(r.id,{referidor_email:validatedReferrer.toLowerCase(),estado_prueba:'validado',numero_papeleta:ticket,fecha_validacion:new Date().toISOString()});
      await refresh();
      toast.success('Pago ficticio validado. Papeleta '+ticket);
    } catch(e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const remove = async(s) => {
    if(!confirm('¿Eliminar toda esta sesión de prueba?')) return;
    setLoading(true);
    try {
      const related=await base44.entities.ReferralTestRun.filter({session_token:s.session_token});
      for(const r of related) if(r.id!==s.id) await base44.entities.ReferralTestRun.delete(r.id);
      await base44.entities.ReferralTestRun.delete(s.id);
      await refresh();
      toast.success('Pruebas eliminadas');
    } catch(e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  if(token) return <main className='mx-auto max-w-xl p-4 py-8'><Card><CardHeader><CardTitle>Inscripción de socio · Modo de pruebas</CardTitle><p className='text-sm text-slate-600'>No crea socios reales ni realiza cobros.</p></CardHeader><CardContent>{sent?<p className='font-semibold text-green-700'>Solicitud de prueba registrada. El administrador puede validar el pago ficticio.</p>:<form onSubmit={submit} className='space-y-3'><Label>Nombre y apellidos</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><Label>Email</Label><Input type='email' value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><Label>DNI</Label><Input value={form.dni} onChange={e=>setForm({...form,dni:e.target.value})}/><Label>Teléfono</Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>{flow==='manual'?<><Label>Email del socio que recomienda</Label><Input type='email' value={form.manual} onChange={e=>setForm({...form,manual:e.target.value})}/></>:<p className='rounded bg-blue-50 p-3 text-sm'>Referido por enlace: {params.get('referrer')}</p>}<Button disabled={loading} className='w-full'>Enviar inscripción de prueba</Button></form>}</CardContent></Card></main>;

  if(!canAccess) return <div className='mx-auto max-w-xl p-8 text-center'><Card><CardContent className='pt-6'><p className='font-semibold'>Acceso restringido</p><p className='mt-2 text-sm text-slate-600'>El modo de pruebas está reservado al usuario autorizado por la administración.</p></CardContent></Card></div>;

  const sessions = rows.filter(r=>r.tipo_registro==='sesion');
  return <main className='mx-auto max-w-5xl space-y-4 p-4'>
    <Card><CardHeader><CardTitle>Modo de pruebas · Trae un Socio Amigo</CardTitle><p className='text-sm text-slate-600'>Prueba aislada: no crea socios reales, no genera cobros y no modifica el historial oficial.</p></CardHeader><CardContent className='flex flex-col gap-2 sm:flex-row'><select className='h-10 flex-1 rounded border px-3' value={referrer} onChange={e=>setReferrer(e.target.value)}><option value=''>Selecciona el socio que recomendará</option>{users.filter(u=>u.email).map(u=><option key={u.id} value={u.email}>{u.full_name||u.email} · {u.email}</option>)}</select><Button onClick={createSession} disabled={loading}>Iniciar prueba</Button></CardContent></Card>
    {sessions.map(s=>{const refs=rows.filter(r=>r.tipo_registro==='referido'&&r.session_token===s.session_token);const valid=refs.filter(r=>r.estado_prueba==='validado');return <Card key={s.id}><CardHeader><CardTitle>{s.referidor_nombre}</CardTitle><p className='text-sm text-slate-500'>{valid.length} papeletas validadas</p></CardHeader><CardContent className='space-y-3'><div className='grid gap-2 md:grid-cols-2'><CopyLink label='Prueba mediante enlace' url={link(s,'automatic')}/><CopyLink label='Prueba mediante alta manual' url={link(s,'manual')}/></div>{refs.map(r=><div key={r.id} className='flex items-center justify-between gap-2 rounded border p-3'><div><b>{r.referido_nombre}</b><p className='text-xs text-slate-500'>{r.referido_email} · {r.flujo} · {r.referidor_email}</p><p className='text-sm'>{r.estado_prueba==='validado'?'Pago ficticio validado · Papeleta '+r.numero_papeleta:'Pendiente de validación'}</p></div>{r.estado_prueba!=='validado'&&<Button size='sm' onClick={()=>validate(r)} disabled={loading}>Validar pago ficticio</Button>}</div>)}<div className='rounded bg-slate-50 p-3'><b>Ranking de prueba</b><p>{valid.length} referidos · {valid.length} papeletas</p>{valid.map(r=><p key={r.id} className='text-sm'>{r.numero_papeleta} — {r.referido_nombre}</p>)}{valid.length>0&&<Button variant='outline' className='mt-2' onClick={()=>alert('Sorteo de prueba: '+valid[Math.floor(Math.random()*valid.length)].numero_papeleta)}>Simular sorteo</Button>}</div><Button variant='destructive' size='sm' onClick={()=>remove(s)} disabled={loading}>Eliminar datos de prueba</Button></CardContent></Card>})}
  </main>;
}
function CopyLink({label,url}){return <div className='flex items-center justify-between gap-2 rounded border p-3'><div className='min-w-0'><b className='text-sm'>{label}</b><p className='truncate text-xs text-slate-500'>{url}</p></div><Button size='sm' variant='outline' onClick={()=>{navigator.clipboard.writeText(url);toast.success('Enlace copiado')}}>Copiar</Button></div>}
