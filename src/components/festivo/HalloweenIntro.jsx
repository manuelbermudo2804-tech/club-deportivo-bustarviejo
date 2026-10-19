import React, { useEffect, useRef, useState } from "react";
import { Volume2, X } from "lucide-react";

/**
 * Halloween cinematic intro for C.D. Bustarviejo.
 * This is a real-time animated sequence (not a pre-rendered MP4).
 * Sound is opt-in so mobile browsers can play it after a user gesture.
 */
export default function HalloweenIntro({ preview = false }) {
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "cd_bustarviejo_halloween_intro_v2";
    const today = new Date().toLocaleDateString("en-CA");
    if (preview || localStorage.getItem(key) !== today) setVisible(true);
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

  const makeSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioRef.current = ctx;
      const master = ctx.createGain();
      master.gain.value = 0.28;
      master.connect(ctx.destination);

      // Low cinematic drone with a rising, dissonant layer.
      const drone = ctx.createOscillator();
      const droneGain = ctx.createGain();
      drone.type = "sawtooth";
      drone.frequency.setValueAtTime(43, ctx.currentTime);
      drone.frequency.linearRampToValueAtTime(32, ctx.currentTime + 10);
      droneGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      droneGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 2);
      droneGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 7);
      droneGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 11);
      drone.connect(droneGain); droneGain.connect(master); drone.start(); drone.stop(ctx.currentTime + 11.1);

      const tension = ctx.createOscillator();
      const tensionGain = ctx.createGain();
      tension.type = "triangle";
      tension.frequency.setValueAtTime(110, ctx.currentTime);
      tension.frequency.linearRampToValueAtTime(165, ctx.currentTime + 7);
      tension.frequency.linearRampToValueAtTime(70, ctx.currentTime + 10);
      tensionGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      tensionGain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 4);
      tensionGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 10);
      tension.connect(tensionGain); tensionGain.connect(master); tension.start(); tension.stop(ctx.currentTime + 10.1);

      // Three low impacts, timed to the visual cuts.
      [3.4, 7.1, 9.2].forEach((at, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(i === 2 ? 78 : 58, ctx.currentTime + at);
        osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + at + 0.65);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + at - 0.02);
        gain.gain.linearRampToValueAtTime(i === 2 ? 0.8 : 0.42, ctx.currentTime + at + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.85);
        osc.connect(gain); gain.connect(master); osc.start(); osc.stop(ctx.currentTime + at + 0.9);
      });
      setSoundOn(true);
    } catch {}
  };

  const finish = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    stopSound();
    try {
      localStorage.setItem("cd_bustarviejo_halloween_intro_v2", new Date().toLocaleDateString("en-CA"));
    } catch {}
    setVisible(false);
  };

  const enter = (withSound) => {
    if (withSound) makeSound();
    setStarted(true);
    timerRef.current = window.setTimeout(finish, 11500);
  };

  if (!visible) return null;

  return (
    <div className={`halloween-film-overlay ${started ? "film-running" : "film-ready"}`} role="dialog" aria-modal="true" aria-label="Especial Halloween del C.D. Bustarviejo">
      <style>{`
        .halloween-film-overlay{position:fixed;inset:0;z-index:99999;overflow:hidden;background:#020204;color:#fff;font-family:inherit;isolation:isolate}
        .halloween-film-overlay *{box-sizing:border-box}
        .film-world{position:absolute;inset:-5%;overflow:hidden;background:radial-gradient(ellipse at 50% 44%,#3b1d20 0,#171016 35%,#050507 73%);animation:filmCamera 11.5s ease-in-out both}
        .film-sky{position:absolute;inset:0;background:linear-gradient(180deg,#07070d 0%,#151017 43%,#08080b 100%)}
        .film-moon{position:absolute;width:clamp(85px,18vw,190px);aspect-ratio:1;border-radius:50%;top:8%;right:16%;background:radial-gradient(circle at 36% 30%,#e9ded0 0,#aaa0a0 42%,#55454d 75%,transparent 77%);opacity:.62;filter:drop-shadow(0 0 28px #d9b6b455)}
        .film-cloud{position:absolute;inset:0;background:linear-gradient(105deg,transparent 22%,#b3a0a014 43%,transparent 61%);transform:translateX(-60%);animation:filmCloud 8s linear infinite}
        .film-lightning{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
        .film-pitch{position:absolute;left:-35%;width:170%;height:54%;bottom:-14%;background:linear-gradient(180deg,#17161a,#050507 72%);transform:perspective(520px) rotateX(34deg);transform-origin:top center;border-top:2px solid #f9731650;box-shadow:0 -20px 80px #f973160b}
        .film-pitch:before{content:"";position:absolute;left:26%;right:26%;top:0;height:80%;border:1px solid #d6d0d014;border-top:0}
        .film-pitch:after{content:"";position:absolute;left:50%;top:0;bottom:0;width:1px;background:#ffffff18;box-shadow:-120px 0 #ffffff0b,120px 0 #ffffff0b}
        .film-goal{position:absolute;width:clamp(130px,34vw,360px);height:clamp(75px,19vw,190px);bottom:25%;left:50%;transform:translateX(-50%);border:4px solid #c5bfc13b;border-bottom:0;filter:drop-shadow(0 0 14px #fff1)}
        .film-goal:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 19px,#fff1 20px 21px),repeating-linear-gradient(0deg,transparent 0 17px,#fff1 18px 19px)}
        .film-net-shadow{position:absolute;left:50%;bottom:25%;width:clamp(130px,34vw,360px);height:clamp(75px,19vw,190px);transform:translateX(-50%);background:#0009;filter:blur(16px);opacity:.8}
        .film-figure{position:absolute;bottom:20%;left:50%;width:clamp(46px,9vw,92px);height:clamp(160px,34vw,300px);transform:translateX(-50%) scale(.72);transform-origin:bottom center;opacity:0;filter:drop-shadow(0 0 24px #f9731630)}
        .film-head{position:absolute;left:32%;top:0;width:36%;aspect-ratio:1;border-radius:50%;background:#030305;box-shadow:0 0 0 7px #100d10}
        .film-body{position:absolute;left:10%;top:25%;width:80%;height:44%;background:linear-gradient(90deg,#08080a,#a83b16 42%,#f97316 52%,#4a1a12 76%,#050507);clip-path:polygon(23% 0,77% 0,100% 100%,0 100%)}
        .film-arm{position:absolute;top:28%;width:18%;height:43%;background:#09080b;border-radius:20px}
        .film-arm.left{left:0;transform:rotate(13deg)}.film-arm.right{right:0;transform:rotate(-17deg)}
        .film-leg{position:absolute;top:64%;height:36%;width:24%;background:#070709}
        .film-leg.left{left:24%;transform:rotate(5deg)}.film-leg.right{right:24%;transform:rotate(-6deg)}
        .film-ball{position:absolute;left:18%;bottom:13%;width:clamp(19px,4vw,34px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 28% 25%,#fff,#c6c1c1 40%,#363238 74%,#050505);box-shadow:0 0 20px #fff5;opacity:0}
        .film-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 20%,#0008 70%,#000 120%)}
        .film-grain{position:absolute;inset:-50%;opacity:.12;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.95' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.4'/%3E%3C/svg%3E");animation:filmGrain .22s steps(2) infinite}
        .film-fog{position:absolute;left:-30%;width:160%;height:27%;bottom:12%;background:linear-gradient(90deg,transparent,#b8b3bc21,#dddde022,transparent);filter:blur(20px);animation:filmFog 7s ease-in-out infinite alternate}
        .film-fog.far{bottom:28%;opacity:.45;animation-duration:10s;animation-direction:alternate-reverse}
        .film-copy{position:absolute;z-index:3;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px 22px calc(28px + env(safe-area-inset-bottom));text-shadow:0 3px 28px #000;pointer-events:none}
        .film-copy>*{max-width:850px}
        .film-brand{font-size:clamp(10px,2.3vw,13px);font-weight:900;letter-spacing:.34em;text-transform:uppercase;color:#ff8b42}
        .film-title{font-size:clamp(43px,10vw,100px);font-weight:1000;letter-spacing:-.065em;line-height:.83;margin:25px 0 20px;color:#f7f3ef;text-transform:uppercase}
        .film-title span{color:#ff681d;text-shadow:0 0 32px #ff4d1833}
        .film-subtitle{font-size:clamp(14px,3.4vw,20px);line-height:1.45;color:#d8d0d0;margin:0 auto;max-width:540px}
        .film-act{pointer-events:auto;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:28px}
        .film-button{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:48px;padding:13px 21px;border-radius:3px;border:1px solid #ff7b36;background:linear-gradient(135deg,#ff792e,#9f2d12);color:#fff;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:950;cursor:pointer;box-shadow:0 6px 28px #e84c1a2e}
        .film-button.secondary{background:#09080bc9;border-color:#ffffff50;box-shadow:none}
        .film-skip{position:absolute;top:max(15px,env(safe-area-inset-top));right:15px;z-index:8;display:grid;place-items:center;width:42px;height:42px;border:1px solid #ffffff35;border-radius:50%;background:#050507aa;color:#fff;cursor:pointer}
        .film-running .film-ready-copy{animation:filmOpening 11.5s both}
        .film-running .film-world{animation:filmCamera 11.5s ease-in-out both}
        .film-running .film-figure{animation:filmReveal 11.5s both}
        .film-running .film-ball{animation:filmBall 11.5s both}
        .film-running .film-lightning{animation:filmFlash 11.5s both}
        .film-running .film-ending{animation:filmEnding 11.5s both}
        .film-ending{position:absolute;z-index:4;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;opacity:0;pointer-events:none}
        .film-ending h2{font-size:clamp(34px,8vw,82px);line-height:.88;letter-spacing:-.055em;margin:0;font-weight:1000;text-transform:uppercase}
        .film-ending h2 em{font-style:normal;color:#ff681d}
        .film-ending p{font-size:clamp(13px,3vw,18px);color:#e4dcdc;letter-spacing:.04em}
        .film-ending .film-button{pointer-events:auto}
        @keyframes filmCamera{0%{transform:scale(1.18)}45%{transform:scale(1.05)}100%{transform:scale(1.42)}}
        @keyframes filmCloud{to{transform:translateX(65%)}}
        @keyframes filmFog{from{transform:translateX(-8%) scaleY(.8);opacity:.25}to{transform:translateX(8%) scaleY(1.25);opacity:.72}}
        @keyframes filmGrain{0%{transform:translate(0,0)}25%{transform:translate(2%,-1%)}50%{transform:translate(-1%,2%)}75%{transform:translate(1%,1%)}100%{transform:translate(-2%,-1%)}}
        @keyframes filmOpening{0%,25%{opacity:1;transform:scale(1)}32%,75%{opacity:0;transform:scale(1.06)}85%,100%{opacity:0}}
        @keyframes filmReveal{0%,43%{opacity:0;transform:translateX(-50%) scale(.48)}53%{opacity:.9;transform:translateX(-50%) scale(1.04)}55%,57%{opacity:.12}61%,100%{opacity:1;transform:translateX(-50%) scale(1)}}
        @keyframes filmBall{0%,20%{opacity:0;transform:translate(0,0)}29%{opacity:1}46%{transform:translate(18vw,-6px)}64%{transform:translate(39vw,-18px)}71%,100%{opacity:1;transform:translate(48vw,-3px)}}
        @keyframes filmFlash{0%,28%,30%,51%,53%,68%,70%,100%{opacity:0}29%,52%,69%{opacity:.12}}
        @keyframes filmEnding{0%,70%{opacity:0;transform:scale(1.04)}77%{opacity:1;transform:scale(1)}94%,100%{opacity:1}}
        @media(max-height:620px){.film-title{font-size:clamp(36px,8vh,72px);margin:14px 0}.film-subtitle{font-size:13px}.film-act{margin-top:16px}.film-copy{justify-content:center}}
        @media(prefers-reduced-motion:reduce){.film-world,.film-cloud,.film-fog,.film-grain,.film-running *{animation-duration:.01ms!important;animation-iteration-count:1!important}}
      `}</style>
      <div className="film-world">
        <div className="film-sky" />
        <div className="film-moon" />
        <div className="film-cloud" />
        <div className="film-pitch" />
        <div className="film-net-shadow" />
        <div className="film-goal" />
        <div className="film-figure" aria-hidden="true">
          <div className="film-head" /><div className="film-body" />
          <div className="film-arm left" /><div className="film-arm right" />
          <div className="film-leg left" /><div className="film-leg right" />
        </div>
        <div className="film-ball" />
        <div className="film-fog" /><div className="film-fog far" />
        <div className="film-lightning" />
        <div className="film-grain" /><div className="film-vignette" />
      </div>
      <button className="film-skip" onClick={finish} aria-label="Saltar introducción"><X size={19} /></button>
      <div className="film-copy film-ready-copy">
        <div className="film-brand">C.D. Bustarviejo presenta · Halloween</div>
        <h1 className="film-title">EL ÚLTIMO<br /><span>PARTIDO</span></h1>
        <p className="film-subtitle">El campo está vacío.<br />Entonces… ¿quién acaba de mover el balón?</p>
        {!started && <div className="film-act">
          <button className="film-button" onClick={() => enter(true)}><Volume2 size={17} /> Comenzar experiencia</button>
          <button className="film-button secondary" onClick={() => enter(false)}>Sin sonido</button>
        </div>}
      </div>
      {started && <div className="film-ending">
        <div>
          <div className="film-brand">C.D. Bustarviejo · Halloween</div>
          <h2>EN ESTE CAMPO<br /><em>NADIE JUEGA SOLO.</em></h2>
          <p>El partido no ha terminado.</p>
          <button className="film-button" onClick={finish}>Entrar en la app</button>
          <div style={{fontSize:11,color:"#aaa",marginTop:12}}>{soundOn ? "Ambiente sonoro activado" : "Experiencia sin sonido"}</div>
        </div>
      </div>}
    </div>
  );
}
