import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Save, Trash2, RotateCcw, Download, Pencil, 
  Move, FolderOpen, Eraser, Users, Circle
} from "lucide-react";
import { toast } from "sonner";

import DraggablePlayer from "../components/tactics/DraggablePlayer";
import DraggableBall from "../components/tactics/DraggableBall";
import DrawingCanvas from "../components/tactics/DrawingCanvas";
import { FORMACIONES, FORMACIONES_FUTBOL7, FORMACIONES_BALONCESTO, COLORES_LINEA, TIPOS_LINEA } from "../components/tactics/TacticsPresets";

export default function TacticsBoard() {
  const fieldRef = useRef(null);
  const queryClient = useQueryClient();
  
  // Estado del usuario
  const [user, setUser] = useState(null);
  const [coachCategories, setCoachCategories] = useState([]);
  const [deporteActivo, setDeporteActivo] = useState("futbol"); // futbol, futbol7 o baloncesto
  
  // Estado de la pizarra
  const [jugadores, setJugadores] = useState([]);
  const [formacionActual, setFormacionActual] = useState("");
  const [lineas, setLineas] = useState([]);
  const [lineaActual, setLineaActual] = useState(null);
  const [mostrarBalon, setMostrarBalon] = useState(true);
  const [posicionBalon, setPosicionBalon] = useState({ x: 50, y: 35 });
  
  // Herramientas de dibujo
  const [herramientaActiva, setHerramientaActiva] = useState("mover");
  const [colorLinea, setColorLinea] = useState("#FFFFFF");
  const [grosorLinea, setGrosorLinea] = useState(0.5);
  const [tipoLinea, setTipoLinea] = useState("flecha");
  
  // Estado de drag
  const [jugadorArrastrado, setJugadorArrastrado] = useState(null);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [isDibujando, setIsDibujando] = useState(false);
  
  // Diálogos
  const [showGuardarDialog, setShowGuardarDialog] = useState(false);
  const [showCargarDialog, setShowCargarDialog] = useState(false);
  const [showAsignarJugadoresDialog, setShowAsignarJugadoresDialog] = useState(false);
  const [nombreTactica, setNombreTactica] = useState("");
  const [notasTactica, setNotasTactica] = useState("");
  const [tipoTactica, setTipoTactica] = useState("Táctica");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");

  // Cargar jugadores reales del equipo
  const { data: jugadoresEquipo } = useQuery({
    queryKey: ['playersForTactics', categoriaSeleccionada],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => p.deporte === categoriaSeleccionada && p.activo);
    },
    enabled: !!categoriaSeleccionada,
    initialData: [],
  });

  // Obtener iniciales de un nombre
  const getIniciales = (nombre) => {
    if (!nombre) return "??";
    const partes = nombre.trim().split(/\s+/);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }
    return partes[0].substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      let categories = [];
      if (currentUser.es_coordinador || currentUser.role === "admin") {
        categories = [
          "Fútbol Pre-Benjamín (Mixto)",
          "Fútbol Benjamín (Mixto)",
          "Fútbol Alevín (Mixto)",
          "Fútbol Infantil (Mixto)",
          "Fútbol Cadete",
          "Fútbol Juvenil",
          "Fútbol Aficionado",
          "Fútbol Femenino",
          "Baloncesto (Mixto)"
        ];
      } else {
        categories = currentUser.categorias_entrena || [];
      }
      
      setCoachCategories(categories);
      
      // Determinar deporte inicial - Fútbol 7 para categorías inferiores
      const tieneBaloncesto = categories.some(c => c.includes("Baloncesto"));
      const tieneFutbol7 = categories.some(c => 
        c.includes("Pre-Benjamín") || c.includes("Benjamín") || c.includes("Alevín")
      );
      const tieneFutbol11 = categories.some(c => 
        c.includes("Infantil") || c.includes("Cadete") || c.includes("Juvenil") || 
        c.includes("Aficionado") || c.includes("Femenino")
      );

      if (tieneFutbol11) {
        setDeporteActivo("futbol");
        const futbolCat = categories.find(c => 
          c.includes("Infantil") || c.includes("Cadete") || c.includes("Juvenil") || 
          c.includes("Aficionado") || c.includes("Femenino")
        );
        setCategoriaSeleccionada(futbolCat || "");
        setFormacionActual("4-4-2");
        setJugadores(FORMACIONES["4-4-2"].posiciones.map((j, i) => ({ ...j, id: i })));
      } else if (tieneFutbol7) {
        setDeporteActivo("futbol7");
        const futbol7Cat = categories.find(c => 
          c.includes("Pre-Benjamín") || c.includes("Benjamín") || c.includes("Alevín")
        );
        setCategoriaSeleccionada(futbol7Cat || "");
        setFormacionActual("1-3-2");
        setJugadores(FORMACIONES_FUTBOL7["1-3-2"].posiciones.map((j, i) => ({ ...j, id: i })));
      } else if (tieneBaloncesto) {
        setDeporteActivo("baloncesto");
        setCategoriaSeleccionada("Baloncesto (Mixto)");
        setFormacionActual("1-2-2");
        setJugadores(FORMACIONES_BALONCESTO["1-2-2"].posiciones.map((j, i) => ({ ...j, id: i })));
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

  // Cambiar deporte
  const cambiarDeporte = (deporte) => {
    setDeporteActivo(deporte);
    setLineas([]);
    
    if (deporte === "futbol") {
      const futbolCat = coachCategories.find(c => 
        c.includes("Infantil") || c.includes("Cadete") || c.includes("Juvenil") || 
        c.includes("Aficionado") || c.includes("Femenino")
      ) || coachCategories.find(c => c.includes("Fútbol"));
      setCategoriaSeleccionada(futbolCat || "");
      setFormacionActual("4-4-2");
      setJugadores(FORMACIONES["4-4-2"].posiciones.map((j, i) => ({ ...j, id: i })));
      setPosicionBalon({ x: 50, y: 35 });
    } else if (deporte === "futbol7") {
      const futbol7Cat = coachCategories.find(c => 
        c.includes("Pre-Benjamín") || c.includes("Benjamín") || c.includes("Alevín")
      ) || coachCategories.find(c => c.includes("Fútbol"));
      setCategoriaSeleccionada(futbol7Cat || "");
      setFormacionActual("1-3-2");
      setJugadores(FORMACIONES_FUTBOL7["1-3-2"].posiciones.map((j, i) => ({ ...j, id: i })));
      setPosicionBalon({ x: 50, y: 35 });
    } else {
      setCategoriaSeleccionada("Baloncesto (Mixto)");
      setFormacionActual("1-2-2");
      setJugadores(FORMACIONES_BALONCESTO["1-2-2"].posiciones.map((j, i) => ({ ...j, id: i })));
      setPosicionBalon({ x: 50, y: 30 });
    }
  };

  // Cambiar formación
  const cambiarFormacion = (nombreFormacion) => {
    setFormacionActual(nombreFormacion);
    const formaciones = deporteActivo === "futbol" ? FORMACIONES : deporteActivo === "futbol7" ? FORMACIONES_FUTBOL7 : FORMACIONES_BALONCESTO;
    setJugadores(formaciones[nombreFormacion].posiciones.map((j, i) => ({ ...j, id: i })));
    setLineas([]);
  };

  // Asignar jugadores reales a las posiciones
  const asignarJugadorReal = (posicionIndex, jugadorId) => {
    const jugadorReal = jugadoresEquipo.find(j => j.id === jugadorId);
    if (jugadorReal) {
      setJugadores(prev => prev.map((j, i) => 
        i === posicionIndex 
          ? { ...j, nombre: jugadorReal.nombre, iniciales: getIniciales(jugadorReal.nombre), jugadorId: jugadorId }
          : j
      ));
    } else {
      // Limpiar asignación
      setJugadores(prev => prev.map((j, i) => 
        i === posicionIndex 
          ? { ...j, nombre: undefined, iniciales: undefined, jugadorId: undefined }
          : j
      ));
    }
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
  const maxY = deporteActivo === "futbol" ? 70 : 60;

  const handleFieldPointerDown = (e) => {
    if (herramientaActiva !== "dibujar") return;
    
    const rect = fieldRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * maxY;
    
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
    const y = ((e.clientY - rect.top) / rect.height) * maxY;
    
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

  const limpiarPizarra = () => setLineas([]);

  const resetearFormacion = () => {
    const formaciones = deporteActivo === "futbol" ? FORMACIONES : deporteActivo === "futbol7" ? FORMACIONES_FUTBOL7 : FORMACIONES_BALONCESTO;
    setJugadores(formaciones[formacionActual].posiciones.map((j, i) => ({ ...j, id: i })));
    setLineas([]);
    setPosicionBalon(deporteActivo === "futbol" ? { x: 50, y: 35 } : { x: 50, y: 30 });
  };

  const borrarUltimaLinea = () => setLineas(prev => prev.slice(0, -1));

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
      posicion_balon: posicionBalon,
      mostrar_balon: mostrarBalon,
      notas: notasTactica,
      entrenador_email: user.email,
    });
  };

  const cargarTactica = (tactica) => {
    setJugadores(tactica.posiciones_jugadores);
    setLineas(tactica.lineas_dibujo || []);
    setFormacionActual(tactica.formacion_base || "4-4-2");
    setCategoriaSeleccionada(tactica.categoria);
    
    // Cargar posición del balón si existe
    if (tactica.posicion_balon) {
      setPosicionBalon(tactica.posicion_balon);
    }
    if (tactica.mostrar_balon !== undefined) {
      setMostrarBalon(tactica.mostrar_balon);
    }
    
    // Detectar deporte
    if (tactica.categoria?.includes("Baloncesto")) {
      setDeporteActivo("baloncesto");
    } else {
      setDeporteActivo("futbol");
    }
    
    setShowCargarDialog(false);
    toast.success(`Táctica "${tactica.nombre}" cargada`);
  };

  const descargarImagen = () => {
    const svg = fieldRef.current;
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    canvas.width = 1000;
    canvas.height = deporteActivo === "futbol" ? 700 : 600;
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = `tactica-${formacionActual}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const formacionesActuales = deporteActivo === "futbol" ? FORMACIONES : deporteActivo === "futbol7" ? FORMACIONES_FUTBOL7 : FORMACIONES_BALONCESTO;
  const tieneFutbol11 = coachCategories.some(c => 
    c.includes("Infantil") || c.includes("Cadete") || c.includes("Juvenil") || 
    c.includes("Aficionado") || c.includes("Femenino")
  );
  const tieneFutbol7 = coachCategories.some(c => 
    c.includes("Pre-Benjamín") || c.includes("Benjamín") || c.includes("Alevín")
  );
  const tieneBaloncesto = coachCategories.some(c => c.includes("Baloncesto"));
  const colorJugador = deporteActivo === "baloncesto" ? "#dc2626" : "#1e40af";

  if (!user || coachCategories.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No tienes equipos asignados</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
            🎯 Pizarra Táctica {deporteActivo === "baloncesto" ? "🏀" : deporteActivo === "futbol7" ? "⚽ F7" : "⚽"}
          </h1>
          <p className="text-slate-600 text-sm mt-1">Diseña tus tácticas y ejercicios</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowAsignarJugadoresDialog(true)}>
            <Users className="w-4 h-4 mr-2" />
            Asignar Jugadores
          </Button>
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

      {/* Selector de deporte */}
      {(tieneFutbol11 || tieneFutbol7 || tieneBaloncesto) && (tieneFutbol11 + tieneFutbol7 + tieneBaloncesto > 1 || true) && (
        <div className="flex flex-wrap gap-2">
          {tieneFutbol11 && (
            <Button
              variant={deporteActivo === "futbol" ? "default" : "outline"}
              onClick={() => cambiarDeporte("futbol")}
              className={deporteActivo === "futbol" ? "bg-green-600" : ""}
            >
              ⚽ Fútbol 11
            </Button>
          )}
          {tieneFutbol7 && (
            <Button
              variant={deporteActivo === "futbol7" ? "default" : "outline"}
              onClick={() => cambiarDeporte("futbol7")}
              className={deporteActivo === "futbol7" ? "bg-green-600" : ""}
            >
              ⚽ Fútbol 7
            </Button>
          )}
          {tieneBaloncesto && (
            <Button
              variant={deporteActivo === "baloncesto" ? "default" : "outline"}
              onClick={() => cambiarDeporte("baloncesto")}
              className={deporteActivo === "baloncesto" ? "bg-orange-600" : ""}
            >
              🏀 Baloncesto
            </Button>
          )}
        </div>
      )}

      {/* Barra de herramientas */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-3 lg:p-4">
          <div className="flex flex-wrap items-center gap-2 lg:gap-4">
            {/* Selector de categoría */}
            <Select value={categoriaSeleccionada} onValueChange={setCategoriaSeleccionada}>
              <SelectTrigger className="w-40 lg:w-52">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                {coachCategories
                  .filter(c => {
                    if (deporteActivo === "futbol") {
                      return c.includes("Infantil") || c.includes("Cadete") || c.includes("Juvenil") || 
                             c.includes("Aficionado") || c.includes("Femenino");
                    } else if (deporteActivo === "futbol7") {
                      return c.includes("Pre-Benjamín") || c.includes("Benjamín") || c.includes("Alevín");
                    } else {
                      return c.includes("Baloncesto");
                    }
                  })
                  .map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Selector de formación */}
            <Select value={formacionActual} onValueChange={cambiarFormacion}>
              <SelectTrigger className="w-32 lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(formacionesActuales).map(([key, form]) => (
                  <SelectItem key={key} value={key}>
                    {form.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

            <Button 
              size="sm" 
              variant={mostrarBalon ? "default" : "outline"}
              onClick={() => setMostrarBalon(!mostrarBalon)}
              className={mostrarBalon ? "bg-amber-500 hover:bg-amber-600" : ""}
              title={mostrarBalon ? "Ocultar balón" : "Mostrar balón"}
            >
              <Circle className="w-4 h-4" />
            </Button>
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

      {/* Campo / Cancha */}
      <Card className="border-none shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <div 
            ref={fieldRef}
            className={`w-full cursor-crosshair touch-none ${deporteActivo === "futbol" ? "aspect-[100/70]" : "aspect-[100/60]"}`}
            onPointerDown={handleFieldPointerDown}
            onPointerMove={handleFieldPointerMove}
            onPointerUp={handleFieldPointerUp}
            onPointerLeave={handleFieldPointerUp}
          >
            <svg 
              viewBox={deporteActivo === "futbol" ? "0 0 100 70" : "0 0 100 60"} 
              className="w-full h-full" 
              style={{ backgroundColor: deporteActivo === "futbol" ? "#2d8a3e" : "#c4783b" }}
            >
              {deporteActivo === "futbol" ? (
                <>
                  {/* Campo de fútbol */}
                  <rect x="0" y="0" width="100" height="70" fill="#2d8a3e" />
                  <g fill="rgba(255,255,255,0.03)">
                    <rect x="2" y="2" width="12" height="66" />
                    <rect x="26" y="2" width="12" height="66" />
                    <rect x="50" y="2" width="12" height="66" />
                    <rect x="74" y="2" width="12" height="66" />
                  </g>
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
                    <rect x="0" y="30" width="2" height="10" stroke="rgba(255,255,255,0.6)" />
                    <rect x="98" y="30" width="2" height="10" stroke="rgba(255,255,255,0.6)" />
                  </g>
                </>
              ) : (
                <>
                  {/* Cancha de baloncesto */}
                  <rect x="0" y="0" width="100" height="60" fill="#c4783b" />
                  <g fill="rgba(0,0,0,0.05)">
                    <rect x="2" y="2" width="8" height="56" />
                    <rect x="18" y="2" width="8" height="56" />
                    <rect x="34" y="2" width="8" height="56" />
                    <rect x="50" y="2" width="8" height="56" />
                    <rect x="66" y="2" width="8" height="56" />
                    <rect x="82" y="2" width="8" height="56" />
                  </g>
                  <g stroke="rgba(255,255,255,0.9)" strokeWidth="0.4" fill="none">
                    <rect x="2" y="2" width="96" height="56" />
                    <line x1="50" y1="2" x2="50" y2="58" />
                    <circle cx="50" cy="30" r="6" />
                    <rect x="2" y="17" width="16" height="26" />
                    <circle cx="18" cy="30" r="6" />
                    <path d="M 2 10 L 6 10 A 24 24 0 0 1 6 50 L 2 50" />
                    <line x1="4" y1="25" x2="4" y2="35" strokeWidth="0.6" />
                    <circle cx="6" cy="30" r="1.5" />
                    <rect x="82" y="17" width="16" height="26" />
                    <circle cx="82" cy="30" r="6" />
                    <path d="M 98 10 L 94 10 A 24 24 0 0 0 94 50 L 98 50" />
                    <line x1="96" y1="25" x2="96" y2="35" strokeWidth="0.6" />
                    <circle cx="94" cy="30" r="1.5" />
                  </g>
                </>
              )}

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
                  maxY={maxY}
                  colorJugador={colorJugador}
                  isSelected={jugadorSeleccionado === jugador.numero}
                  onSelect={setJugadorSeleccionado}
                />
              ))}

              {/* Balón */}
              {mostrarBalon && (
                <DraggableBall
                  position={posicionBalon}
                  onDrag={(x, y) => setPosicionBalon({ x, y })}
                  fieldRef={fieldRef}
                  maxY={maxY}
                  deporteActivo={deporteActivo}
                />
              )}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Info de formación y ayuda */}
      <Card className="border-none shadow-lg bg-slate-50">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900">{formacionesActuales[formacionActual]?.nombre}</h3>
              <p className="text-sm text-slate-600">{formacionesActuales[formacionActual]?.descripcion}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={deporteActivo === "futbol" ? "bg-green-600" : "bg-orange-600"}>
                {formacionActual}
              </Badge>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              💡 <strong>Consejos:</strong> Arrastra los jugadores para moverlos. Pasa el ratón sobre ellos para ver el nombre completo. 
              En móvil, mantén pulsado y arrastra. Usa el modo "Dibujar" para añadir flechas y líneas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Asignar Jugadores */}
      <Dialog open={showAsignarJugadoresDialog} onOpenChange={setShowAsignarJugadoresDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>👥 Asignar Jugadores Reales</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {jugadores.map((jugador, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${deporteActivo === "futbol" ? "bg-blue-600" : "bg-red-600"}`}>
                  {jugador.iniciales || jugador.numero}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{jugador.posicion} (#{jugador.numero})</p>
                  <Select 
                    value={jugador.jugadorId || ""} 
                    onValueChange={(val) => asignarJugadorReal(index, val)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Seleccionar jugador..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sin asignar</SelectItem>
                      {jugadoresEquipo.map(j => (
                        <SelectItem key={j.id} value={j.id}>{j.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            {jugadoresEquipo.length === 0 && (
              <p className="text-center text-slate-500 py-4">
                No hay jugadores en la categoría seleccionada
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAsignarJugadoresDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button variant="outline" onClick={() => setShowGuardarDialog(false)}>Cancelar</Button>
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
                    <Button size="sm" onClick={() => cargarTactica(tactica)}>Cargar</Button>
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