import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";

// Introducción cinematográfica Halloween: escena animada en CSS y ambiente sonoro
// generado localmente. El audio solo comienza tras un toque del usuario (política móvil).
export default function HalloweenIntro({ preview = false }) {
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "cd_bustarviejo_halloween_intro_v1";
    const seen = localStorage.getItem(key);
    if (preview || !seen) {
      setVisible(true);
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      try { audioRef.current?.close(); } catch {}
    };
  }, [preview]);

  const stopSound = () => {
    try { audioRef.current?.close(); } catch {}
    audioRef.current = null;
    setSoundOn(false);
  };

  const enter = (withSound = false) => {
    if (withSound) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioRef.current = ctx;
          const master = ctx.createGain();
          master.gain.value = 0.22;
          master.connect(ctx.destination);

          // Drone grave y viento: síntesis ligera, sin descargar audio externo.
          const drone = ctx.createOscillator();
          const droneGain = ctx.createGain();
          drone.type = "sawtooth";
          drone.frequency.setValueAtTime(48, ctx.currentTime);
          drone.frequency.linearRampToValueAtTime(39, ctx.currentTime + 7);
          droneGain.gain.setValueAtTime(0.0001, ctx.currentTime);
          droneGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 1.4);
          droneGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 7);
          drone.connect(droneGain); droneGain.connect(master); drone.start();

          const wind = ctx.createOscillator();
          const windGain = ctx.createGain();
          wind.type = "triangle";
          wind.frequency.setValueAtTime(180, ctx.currentTime);
          wind.frequency.linearRampToValueAtTime(72, ctx.currentTime + 6);
          windGain.gain.setValueAtTime(0.0001, ctx.currentTime);
          windGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 2);
          windGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 7);
          wind.connect(windGain); windGain.connect(master); wind.start();
          wind.stop(ctx.currentTime + 7.1);

          // Golpe grave cerca del final.
          const hit = ctx.createOscillator();
          const hitGain = ctx.createGain();
          hit.type = "sine";
          hit.frequency.setValueAtTime(95, ctx.currentTime + 5.8);
          hit.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 6.65);
          hitGain.gain.setValueAtTime(0.0001, ctx.currentTime);
          hitGain.gain.setValueAtTime(0.0001, ctx.currentTime + 5.75);
          hitGain.gain.linearRampToValueAtTime(0.75, ctx.currentTime + 5.88);
          hitGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 6.9);
          hit.connect(hitGain); hitGain.connect(master); hit.start(); hit.stop(ctx.currentTime + 7);
          setSoundOn(true);
        }
      } catch {}
    }
    setStarted(true);
    timerRef.current = window.setTimeout(() => finish(), 9000);
  };

  const finish = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    stopSound();
    localStorage.setItem("cd_bustarviejo_halloween_intro_v1", new Date().toISOString().slice(0, 10));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={`halloween-intro-overlay ${started ? "is-playing" : ""}`} role="dialog" aria-modal="true" aria-label="Especial Halloween del C.D. Bustarviejo">
      <style>{`
        .halloween-intro-overlay{position:fixed;inset:0;z-index:99999;overflow:hidden;background:#030306;color:#fff;font-family:inherit;display:flex;align-items:center;justify-content:center}
        .halloween-intro-sky{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 22%,#34202f 0%,#111018 34%,#030306 75%)}
        .halloween-intro-moon{position:absolute;width:clamp(70px,15vw,150px);height:clamp(70px,15vw,150px);border-radius:50%;top:9%;right:18%;background:radial-gradient(circle at 35% 30%,#f4e7d0,#8d8790 72%,#3a343e);box-shadow:0 0 55px #e5d5c533;opacity:.65}
        .halloween-intro-fog{position:absolute;left:-20%;width:140%;height:35%;bottom:12%;background:linear-gradient(90deg,transparent,#a7a4ad25,#dddde01c,transparent);filter:blur(22px);animation:halloweenFog 8s ease-in-out infinite alternate}
        .halloween-intro-fog.two{bottom:25%;opacity:.55;animation-duration:11s;animation-direction:alternate-reverse}
        .halloween-pitch{position:absolute;left:-10%;right:-10%;height:38%;bottom:-9%;background:linear-gradient(#151419,#050507);transform:perspective(360px) rotateX(23deg);border-top:2px solid #f9731638}
        .halloween-line{position:absolute;left:15%;right:15%;bottom:10%;height:1px;background:#f9731622;box-shadow:0 -40px #f9731615,0 -80px #f9731610,0 -120px #f973160c}
        .halloween-goal{position:absolute;width:clamp(100px,28vw,260px);height:clamp(60px,16vw,130px);bottom:23%;left:50%;transform:translateX(-50%);border:3px solid #d8d5d244;border-bottom:0;box-shadow:0 0 18px #fff1}
        .halloween-goal:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 16px,#ffffff13 17px 18px),repeating-linear-gradient(0deg,transparent 0 14px,#ffffff12 15px 16px)}
        .halloween-player{position:absolute;bottom:21%;left:50%;width:clamp(30px,6vw,55px);height:clamp(105px,24vw,190px);transform:translateX(-50%);opacity:0}
        .halloween-player:before{content:"";position:absolute;width:42%;aspect-ratio:1;border-radius:50%;background:#08080b;top:0;left:29%;box-shadow:0 0 12px #000}
        .halloween-player:after{content:"";position:absolute;left:8%;right:8%;top:32%;height:58%;background:linear-gradient(90deg,#171116,#f97316 45%,#171116);clip-path:polygon(20% 0,80% 0,100% 100%,0 100%);box-shadow:0 0 24px #f9731620}
        .halloween-ball{position:absolute;bottom:14%;left:20%;width:clamp(16px,3vw,26px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 30% 25%,#eee,#777 70%,#222);box-shadow:0 0 15px #fff4;opacity:0}
        .halloween-title{position:relative;z-index:2;text-align:center;padding:24px;max-width:780px;text-shadow:0 4px 25px #000}
        .halloween-kicker{letter-spacing:.32em;text-transform:uppercase;color:#fb923c;font-size:clamp(10px,2.2vw,13px);font-weight:800}
        .halloween-title h1{font-size:clamp(36px,9vw,78px);line-height:.96;font-weight:950;letter-spacing:-.055em;margin:18px 0;color:#f8f5f1}
        .halloween-title p{font-size:clamp(13px,3.2vw,18px);color:#d4d0d2;max-width:470px;margin:0 auto 25px}
        .halloween-action{border:1px solid #fb923c88;background:linear-gradient(135deg,#f97316,#9a3412);color:white;font-weight:900;padding:13px 20px;border-radius:999px;box-shadow:0 0 35px #f9731633;cursor:pointer;margin:5px;min-height:46px}
        .halloween-secondary{background:#ffffff0b;border:1px solid #ffffff35;color:#f3f4f6}
        .halloween-close{position:absolute;top:max(16px,env(safe-area-inset-top));right:16px;z-index:5;border:1px solid #ffffff30;background:#0008;color:white;border-radius:999px;width:42px;height:42px;display:grid;place-items:center}
        .is-playing .halloween-title{animation:halloweenTitle 9s both}
        .is-playing .halloween-player{animation:halloweenAppear 9s both}
        .is-playing .halloween-ball{animation:halloweenBall 9s both}
        .is-playing .halloween-moon{animation:halloweenFlicker 2s infinite}
        @keyframes halloweenFog{from{transform:translateX(-7%) scaleY(.8);opacity:.3}to{transform:translateX(7%) scaleY(1.2);opacity:.8}}
        @keyframes halloweenTitle{0%,20%{opacity:1;transform:translateY(0)}30%,75%{opacity:0;transform:translateY(-18px)}88%,100%{opacity:1;transform:translateY(0)}}
        @keyframes halloweenAppear{0%,55%{opacity:0;transform:translateX(-50%) scale(.75)}65%{opacity:.9;transform:translateX(-50%) scale(1.05)}68%{opacity:.15}72%,100%{opacity:1;transform:translateX(-50%) scale(1)}}
        @keyframes halloweenBall{0%,28%{opacity:0;transform:translate(0,0)}38%{opacity:1}60%{transform:translate(45vw,-20px)}70%,100%{opacity:1;transform:translate(60vw,-4px)}}
        @keyframes halloweenFlicker{0%,94%,100%{opacity:.65}95%,97%{opacity:.1}}
        @media(prefers-reduced-motion:reduce){.halloween-intro-fog,.halloween-intro-overlay *{animation-duration:.01ms!important;animation-iteration-count:1!important}}
      `}</style>
      <div className="halloween-intro-sky" />
      <div className="halloween-intro-moon" />
      <div className="halloween-intro-fog" />
      <div className="halloween-intro-fog two" />
      <div className="halloween-pitch"><div className="halloween-line" /></div>
      <div className="halloween-goal" />
      <div className="halloween-player" />
      <div className="halloween-ball" />
      <button className="halloween-close" onClick={finish} aria-label="Saltar introducción"><X size={20}/></button>
      <div className="halloween-title">
        <div className="halloween-kicker">C.D. Bustarviejo · Especial Halloween</div>
        <h1>{started ? "EL PARTIDO
NUNCA TERMINA" : "EL ÚLTIMO PARTIDO"}</h1>
        <p>{started ? "En Bustarviejo, alguien sigue jugando…" : "El campo está vacío. Pero el balón acaba de moverse."}</p>
        {!started ? (
          <>
            <button className="halloween-action" onClick={() => enter(true)}><Volume2 size={17} style={{display:"inline",verticalAlign:"middle",marginRight:7}}/>Entrar con sonido</button>
            <button className="halloween-action halloween-secondary" onClick={() => enter(false)}>Ver sin sonido</button>
          </>
        ) : (
          <button className="halloween-action halloween-secondary" onClick={finish}>Entrar en la app</button>
        )}
        {started && <div style={{fontSize:11,color:"#a8a29e",marginTop:10}}>{soundOn ? "Sonido cinematográfico activado" : "Reproducción sin sonido"}</div>}
      </div>
    </div>
  );
}
