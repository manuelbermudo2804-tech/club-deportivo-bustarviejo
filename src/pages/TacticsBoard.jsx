import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Save, Trash2, RotateCcw, Download, Upload, Pencil, 
  Move, ChevronDown, FolderOpen, Plus, X, Eraser
} from "lucide-react";
import { toast } from "sonner";

import FootballField from "../components/tactics/FootballField";
import DraggablePlayer from "../components/tactics/DraggablePlayer";
import DrawingCanvas from "../components/tactics/DrawingCanvas";
import { FORMACIONES, COLORES_LINEA, TIPOS_LINEA } from "../components/tactics/TacticsPresets";

export default function TacticsBoard() {
  const fieldRef = useRef(null);
  const queryClient = useQueryClient();
  
  // Estado del usuario
  const [user, setUser] = useState(null);
  const [coachCategories, setCoachCategories] = useState([]);
  
  // Estado de la pizarra
  const [jugadores, setJugadores] = useState(FORMACIONES["4-4-2"].posiciones);
  const [formacionActual, setFormacionActual] = useState("4-4-2");
  const [lineas, setLineas] = useState([]);
  const [lineaActual, setLineaActual] = useState(null);
  
  // Herramientas de dibujo
  const [herramientaActiva, setHerramientaActiva] = useState("mover"); // mover, dibujar, borrar
  const [colorLinea, setColorLinea] = useState("#FFFFFF");
  const [grosorLinea, setGrosorLinea] = useState(0.5);
  const [tipoLinea, setTipoLinea] = useState("flecha");
  
  // Estado de drag
  const [jugadorArrastrado, setJugadorArrastrado] = useState(null);
  const [isDibujando, setIsDibujando] = useState(false);
  
  // Diálogos
  const [showGuardarDialog, setShowGuardarDialog] = useState(false);
  const [showCargarDialog, setShowCargarDialog] = useState(false);
  const [nombreTactica, setNombreTactica] = useState("");
  const [notasTactica, setNotasTactica] = useState("");
  const [tipoTactica, setTipoTactica] = useState("Táctica");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser.es_coordinador || currentUser.role === "admin") {
        const cats = [
          "Fútbol Pre-Benjamín (Mixto)",
          "Fútbol Benjamín (Mixto)",
          "Fútbol Alevín (Mixto)",
          "Fútbol Infantil (Mixto)",
          "Fútbol Cadete",
          "Fútbol Juvenil",
          "Fútbol Aficionado",
          "Fútbol Femenino"
        ];
        setCoachCategories(cats);
        setCategoriaSeleccionada(cats[0]);
      } else {
        const categories = currentUser.categorias_entrena?.filter(c => c.includes("Fútbol")) || [];
        setCoachCategories(categories);
        if (categories.length > 0) {
          setCategoriaSeleccionada(categories[0]);
        }
      }
    };
    fetchUser();
  }, []);

  // Cargar tácticas guardadas
  const { data: tacticasGuardadas, isLoading } = useQuery({
    queryKey: ['tacticas', user?.email],
    queryFn: () => base44.entities.TacticaPizarra.filter({ entrenador_email: user?.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  // Mutación para guardar táctica
  const guardarTacticaMutation = useMutation({
    mutationFn: (data) => base44.entities.TacticaPizarra.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tacticas'] });
      setShowGuardarDialog(false);
      setNombreTactica("");
      setNotasTactica("");
      toast.success("Táctica guardada correctamente");
    },
    onError: () => toast.error("Error al guardar la táctica"),
  });

  // Mutación para eliminar táctica
  const eliminarTacticaMutation = useMutation({
    mutationFn: (id) => base44.entities.TacticaPizarra.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tacticas'] });
      toast.success("Táctica eliminada");
    },
  });

  // Cambiar formación
  const cambiarFormacion = (nombreFormacion) => {
    setFormacionActual(nombreFormacion);
    setJugadores(FORMACIONES[nombreFormacion].posiciones);
    setLineas([]);
  };

  // Manejadores de drag para jugadores
  const handleDragStart = (numero) => {
    if (herramientaActiva === "mover") {
      setJugadorArrastrado(numero);
    }
  };

  const handleDrag = (numero, x, y) => {
    if (jugadorArrastrado === numero && herramientaActiva === "mover") {
      setJugadores(prev => prev.map(j => 
        j.numero === numero ? { ...j, x, y } : j
      ));
    }
  };

  const handleDragEnd = () => {
    setJugadorArrastrado(null);
  };

  // Manejadores de dibujo
  const handleFieldPointerDown = (e) => {
    if (herramientaActiva !== "dibujar") return;
    
    const rect = fieldRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 70;
    
    setIsDibujando(true);
    setLineaActual({
      puntos: [{ x, y }],
      color: colorLinea,
      grosor: grosorLinea,
      tipo: tipoLinea,
    });
  };

  const handleFieldPointerMove = (e) => {
    if (!isDibujando || herramientaActiva !== "dibujar" || !lineaActual) return;
    
    const rect = fieldRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 70;
    
    setLineaActual(prev => ({
      ...prev,
      puntos: [...prev.puntos, { x, y }],
    }));
  };

  const handleFieldPointerUp = () => {
    if (isDibujando && lineaActual && lineaActual.puntos.length > 1) {
      setLineas(prev => [...prev, lineaActual]);
    }
    setIsDibujando(false);
    setLineaActual(null);
  };

  // Limpiar pizarra
  const limpiarPizarra = () => {
    setLineas([]);
  };

  // Resetear a formación original
  const resetearFormacion = () => {
    setJugadores(FORMACIONES[formacionActual].posiciones);
    setLineas([]);
  };

  // Borrar última línea
  const borrarUltimaLinea = () => {
    setLineas(prev => prev.slice(0, -1));
  };

  // Guardar táctica
  const handleGuardar = () => {
    if (!nombreTactica.trim()) {
      toast.error("Introduce un nombre para la táctica");
      return;
    }
    
    guardarTacticaMutation.mutate({
      nombre: nombreTactica,
      categoria: categoriaSeleccionada,
      tipo: tipoTactica,
      formacion_base: formacionActual,
      posiciones_jugadores: jugadores,
      lineas_dibujo: lineas,
      notas: notasTactica,
      entrenador_email: user.email,
    });
  };

  // Cargar táctica
  const cargarTactica = (tactica) => {
    setJugadores(tactica.posiciones_jugadores);
    setLineas(tactica.lineas_dibujo || []);
    setFormacionActual(tactica.formacion_base || "4-4-2");
    setShowCargarDialog(false);
    toast.success(`Táctica "${tactica.nombre}" cargada`);
  };

  // Descargar como imagen
  const descargarImagen = () => {
    const svg = fieldRef.current;
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    canvas.width = 1000;
    canvas.height = 700;
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = `tactica-${formacionActual}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!user || coachCategories.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No tienes equipos de fútbol asignados</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">🎯 Pizarra Táctica</h1>
          <p className="text-slate-600 text-sm mt-1">Diseña tus tácticas y ejercicios</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowCargarDialog(true)}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Cargar
          </Button>
          <Button onClick={() => setShowGuardarDialog(true)} className="bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      {/* Barra de herramientas */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-3 lg:p-4">
          <div className="flex flex-wrap items-center gap-2 lg:gap-4">
            {/* Selector de formación */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 hidden lg:inline">Formación:</span>
              <Select value={formacionActual} onValueChange={cambiarFormacion}>
                <SelectTrigger className="w-32 lg:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FORMACIONES).map(([key, form]) => (
                    <SelectItem key={key} value={key}>
                      {form.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-6 w-px bg-slate-300 hidden lg:block" />

            {/* Herramientas */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={herramientaActiva === "mover" ? "default" : "outline"}
                onClick={() => setHerramientaActiva("mover")}
                className={herramientaActiva === "mover" ? "bg-blue-600" : ""}
              >
                <Move className="w-4 h-4" />
                <span className="ml-1 hidden lg:inline">Mover</span>
              </Button>
              <Button
                size="sm"
                variant={herramientaActiva === "dibujar" ? "default" : "outline"}
                onClick={() => setHerramientaActiva("dibujar")}
                className={herramientaActiva === "dibujar" ? "bg-orange-600" : ""}
              >
                <Pencil className="w-4 h-4" />
                <span className="ml-1 hidden lg:inline">Dibujar</span>
              </Button>
            </div>

            {herramientaActiva === "dibujar" && (
              <>
                <div className="h-6 w-px bg-slate-300" />
                
                {/* Color */}
                <div className="flex items-center gap-1">
                  {COLORES_LINEA.map(color => (
                    <button
                      key={color.valor}
                      onClick={() => setColorLinea(color.valor)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        colorLinea === color.valor ? "scale-125 border-slate-900" : "border-slate-300"
                      }`}
                      style={{ backgroundColor: color.valor }}
                      title={color.nombre}
                    />
                  ))}
                </div>

                {/* Tipo de línea */}
                <div className="flex items-center gap-1">
                  {TIPOS_LINEA.map(tipo => (
                    <Button
                      key={tipo.valor}
                      size="sm"
                      variant={tipoLinea === tipo.valor ? "default" : "outline"}
                      onClick={() => setTipoLinea(tipo.valor)}
                      className="px-2"
                    >
                      {tipo.icono}
                    </Button>
                  ))}
                </div>
              </>
            )}

            <div className="h-6 w-px bg-slate-300" />

            {/* Acciones */}
            <Button size="sm" variant="outline" onClick={borrarUltimaLinea} disabled={lineas.length === 0}>
              <Eraser className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={limpiarPizarra}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={resetearFormacion}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={descargarImagen}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campo de fútbol */}
      <Card className="border-none shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <div 
            ref={fieldRef}
            className="aspect-[100/70] w-full cursor-crosshair touch-none"
            onPointerDown={handleFieldPointerDown}
            onPointerMove={handleFieldPointerMove}
            onPointerUp={handleFieldPointerUp}
            onPointerLeave={handleFieldPointerUp}
          >
            <svg viewBox="0 0 100 70" className="w-full h-full" style={{ backgroundColor: "#2d8a3e" }}>
              {/* Campo */}
              <rect x="0" y="0" width="100" height="70" fill="#2d8a3e" />
              
              {/* Franjas del césped */}
              <g fill="rgba(255,255,255,0.03)">
                <rect x="2" y="2" width="12" height="66" />
                <rect x="26" y="2" width="12" height="66" />
                <rect x="50" y="2" width="12" height="66" />
                <rect x="74" y="2" width="12" height="66" />
              </g>
              
              {/* Líneas del campo */}
              <g stroke="rgba(255,255,255,0.8)" strokeWidth="0.3" fill="none">
                <rect x="2" y="2" width="96" height="66" />
                <line x1="50" y1="2" x2="50" y2="68" />
                <circle cx="50" cy="35" r="9" />
                <circle cx="50" cy="35" r="0.5" fill="rgba(255,255,255,0.8)" />
                <rect x="2" y="15" width="16" height="40" />
                <rect x="2" y="25" width="6" height="20" />
                <circle cx="12" cy="35" r="0.5" fill="rgba(255,255,255,0.8)" />
                <path d="M 18 25 A 9 9 0 0 1 18 45" />
                <rect x="82" y="15" width="16" height="40" />
                <rect x="92" y="25" width="6" height="20" />
                <circle cx="88" cy="35" r="0.5" fill="rgba(255,255,255,0.8)" />
                <path d="M 82 25 A 9 9 0 0 0 82 45" />
                <path d="M 2 4 A 2 2 0 0 0 4 2" />
                <path d="M 96 2 A 2 2 0 0 0 98 4" />
                <path d="M 98 66 A 2 2 0 0 0 96 68" />
                <path d="M 4 68 A 2 2 0 0 0 2 66" />
                <rect x="0" y="30" width="2" height="10" stroke="rgba(255,255,255,0.6)" />
                <rect x="98" y="30" width="2" height="10" stroke="rgba(255,255,255,0.6)" />
              </g>

              {/* Dibujos */}
              <DrawingCanvas 
                lineas={lineas}
                lineaActual={lineaActual}
                colorLinea={colorLinea}
                grosorLinea={grosorLinea}
                tipoLinea={tipoLinea}
              />

              {/* Jugadores */}
              {jugadores.map(jugador => (
                <DraggablePlayer
                  key={jugador.numero}
                  jugador={jugador}
                  onDragStart={handleDragStart}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                  fieldRef={fieldRef}
                />
              ))}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Info de formación */}
      <Card className="border-none shadow-lg bg-slate-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">{FORMACIONES[formacionActual].nombre}</h3>
              <p className="text-sm text-slate-600">{FORMACIONES[formacionActual].descripcion}</p>
            </div>
            <Badge className="bg-blue-600">{formacionActual}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Guardar */}
      <Dialog open={showGuardarDialog} onOpenChange={setShowGuardarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>💾 Guardar Táctica</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <Input
                value={nombreTactica}
                onChange={(e) => setNombreTactica(e.target.value)}
                placeholder="Ej: Ataque por banda derecha"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Categoría</label>
              <Select value={categoriaSeleccionada} onValueChange={setCategoriaSeleccionada}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {coachCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select value={tipoTactica} onValueChange={setTipoTactica}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Táctica">Táctica</SelectItem>
                  <SelectItem value="Ejercicio">Ejercicio</SelectItem>
                  <SelectItem value="Jugada ensayada">Jugada ensayada</SelectItem>
                  <SelectItem value="Estrategia defensiva">Estrategia defensiva</SelectItem>
                  <SelectItem value="Estrategia ofensiva">Estrategia ofensiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notas</label>
              <Textarea
                value={notasTactica}
                onChange={(e) => setNotasTactica(e.target.value)}
                placeholder="Instrucciones, observaciones..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGuardarDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={guardarTacticaMutation.isPending}>
              {guardarTacticaMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Cargar */}
      <Dialog open={showCargarDialog} onOpenChange={setShowCargarDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>📂 Mis Tácticas Guardadas</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <p className="text-center text-slate-500 py-8">Cargando...</p>
            ) : tacticasGuardadas.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No tienes tácticas guardadas</p>
            ) : (
              tacticasGuardadas.map(tactica => (
                <div 
                  key={tactica.id} 
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">{tactica.nombre}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{tactica.formacion_base}</Badge>
                      <Badge className="text-xs bg-blue-100 text-blue-800">{tactica.tipo}</Badge>
                      <span className="text-xs text-slate-500">{tactica.categoria}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => cargarTactica(tactica)}>
                      Cargar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-red-600"
                      onClick={() => eliminarTacticaMutation.mutate(tactica.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}