import React, { useState } from "react";
import { Play, RotateCcw, Volume2, VolumeX, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const captions = [
  { at: 0, text: "La noche cae sobre Bustarviejo…" },
  { at: 4, text: "La niebla cubre el campo." },
  { at: 8, text: "Pero aquí nadie se esconde." },
  { at: 11, text: "EN BUSTARVIEJO NO TENEMOS MIEDO." },
];

export default function Halloween() {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [caption, setCaption] = useState("");
  const navigate = useNavigate();

  const start = () => {
    setPlaying(true);
    setCaption(captions[0].text);
    captions.forEach((item) => {
      window.setTimeout(() => setCaption(item.text), item.at * 1000);
    });
    window.setTimeout(() => setPlaying(false), 15000);
  };

  return (
    <main className="halloween-page">
      <style>{`
        .halloween-page{min-height:100dvh;background:#050608;color:#fff;display:flex;justify-content:center;overflow:hidden;font-family:system-ui,-apple-system,sans-serif}
        .halloween-stage{position:relative;width:100%;max-width:560px;min-height:100dvh;overflow:hidden;background:radial-gradient(ellipse at 50% 65%,#77300d 0%,#24110f 33%,#07090d 72%);isolation:isolate}
        .halloween-moon{position:absolute;width:clamp(90px,27vw,145px);aspect-ratio:1;border-radius:50%;right:9%;top:7%;background:radial-gradient(circle at 35% 35%,#ffd08b,#ff7b20 55%,#9d2709);box-shadow:0 0 45px #f65c1c99;opacity:.85}
        .halloween-mountains{position:absolute;top:26%;left:-10%;width:120%;height:25%;background:#080d12;clip-path:polygon(0 72%,12% 49%,19% 60%,33% 17%,43% 47%,56% 6%,67% 45%,78% 21%,89% 54%,100% 33%,100% 100%,0 100%);filter:drop-shadow(0 0 10px #000)}
        .halloween-ridge{position:absolute;top:34%;left:-10%;width:120%;height:18%;background:#151b20;clip-path:polygon(0 70%,15% 40%,28% 58%,44% 19%,55% 52%,70% 26%,84% 55%,100% 37%,100% 100%,0 100%);opacity:.8}
        .halloween-ground{position:absolute;bottom:0;width:100%;height:42%;background:linear-gradient(180deg,#27140f,#080a0b 82%);clip-path:polygon(0 4%,100% 0,100% 100%,0 100%)}
        .halloween-fog{position:absolute;left:-35%;width:170%;height:16%;border-radius:50%;background:linear-gradient(90deg,transparent,#c8d0d133,#e6e7e72b,transparent);filter:blur(13px);animation:fogdrift 8s ease-in-out infinite alternate}
        .halloween-fog.f1{top:49%;animation-duration:9s}.halloween-fog.f2{top:62%;animation-duration:12s;animation-delay:-4s;opacity:.7}.halloween-fog.f3{top:73%;animation-duration:10s;animation-delay:-2s;opacity:.5}
        @keyframes fogdrift{from{transform:translateX(-13%) scaleY(.8)}to{transform:translateX(18%) scaleY(1.25)}}
        .halloween-light{position:absolute;top:47%;width:5px;height:24%;background:linear-gradient(#5b5147,#191411);box-shadow:0 0 2px #fff}
        .halloween-light:before{content:"";position:absolute;top:-7px;left:-15px;width:35px;height:13px;background:#ffb44d;box-shadow:0 0 25px 12px #ff781d99;animation:flicker 3s infinite}
        .halloween-light.l1{left:8%}.halloween-light.l2{right:8%;top:49%;height:20%}
        @keyframes flicker{0%,18%,22%,55%,100%{opacity:1}20%,58%{opacity:.45}}
        .halloween-goal{position:absolute;bottom:22%;left:14%;width:72%;height:24%;border:5px solid #a7a49c;border-bottom:0;border-radius:3px 3px 0 0;filter:drop-shadow(0 0 10px #ff8a3888);opacity:.82}
        .halloween-net{position:absolute;inset:0;background-image:linear-gradient(#e6d9c822 1px,transparent 1px),linear-gradient(90deg,#e6d9c822 1px,transparent 1px);background-size:14px 14px}
        .halloween-player{position:absolute;bottom:12%;left:50%;width:130px;height:310px;transform:translateX(-50%);animation:playerenter 2s ease-out both;filter:drop-shadow(0 0 18px #ff6b1a55)}
        .halloween-player .head{position:absolute;top:0;left:48px;width:37px;height:44px;border-radius:45% 45% 40% 40%;background:#08090b;box-shadow:0 -8px 0 3px #090a0b}
        .halloween-player .body{position:absolute;top:40px;left:22px;width:88px;height:120px;background:linear-gradient(105deg,#111 0 23%,#f56b12 24% 70%,#111 71%);clip-path:polygon(22% 0,78% 0,100% 18%,85% 100%,15% 100%,0 18%);border-radius:10px}
        .halloween-player .number{position:absolute;top:78px;left:50px;font-weight:1000;font-size:35px;color:#090909;text-shadow:0 1px #ff9a48}
        .halloween-player .shorts{position:absolute;top:153px;left:30px;width:75px;height:67px;background:linear-gradient(90deg,#08090b 0 47%,#f56b12 48% 54%,#08090b 55%);clip-path:polygon(0 0,100% 0,87% 100%,54% 100%,49% 37%,42% 100%,9% 100%)}
        .halloween-player .leg{position:absolute;top:210px;width:24px;height:68px;background:#101113;border-radius:0 0 6px 6px}
        .halloween-player .leg.left{left:39px}.halloween-player .leg.right{left:72px}
        .halloween-player .sock{position:absolute;top:247px;width:24px;height:41px;background:repeating-linear-gradient(0deg,#08090b 0 9px,#151719 9px 14px);border-radius:0 0 4px 4px}
        .halloween-player .sock.left{left:39px}.halloween-player .sock.right{left:72px}
        .halloween-ball{position:absolute;bottom:10%;left:25%;width:45px;height:45px;border-radius:50%;background:radial-gradient(circle at 35% 25%,#d8d2c4,#353333 55%,#090909);border:2px solid #777;animation:ballpulse 2.5s infinite}
        @keyframes ballpulse{50%{box-shadow:0 0 20px #ff711d88}}
        @keyframes playerenter{from{opacity:0;transform:translate(-50%,18px)}to{opacity:1;transform:translate(-50%,0)}}
        .halloween-title{position:absolute;z-index:3;top:7%;left:5%;width:90%;text-align:center;text-shadow:0 3px 15px #000}
        .halloween-title .club{color:#ff781e;font-size:12px;letter-spacing:.3em;font-weight:800}
        .halloween-title h1{margin:20px 0 0;font-size:clamp(32px,8vw,48px);line-height:.95;font-weight:1000;letter-spacing:-.04em}
        .halloween-title strong{display:block;color:#ff6b12;font-size:clamp(35px,9vw,55px);line-height:1.05}
        .halloween-subtitle{position:absolute;z-index:4;bottom:8%;left:6%;width:88%;min-height:58px;text-align:center;font-size:clamp(15px,4vw,20px);font-weight:800;text-shadow:0 2px 8px #000;animation:captionin .5s ease both}
        @keyframes captionin{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .halloween-controls{position:absolute;z-index:5;bottom:2%;left:0;width:100%;display:flex;justify-content:center;gap:12px}
        .halloween-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid #ff8a42;background:#120d0bd9;color:#fff;border-radius:999px;padding:12px 18px;font-weight:800;cursor:pointer;box-shadow:0 0 18px #ff6b1d33}
        .halloween-btn.primary{background:#f56b12;color:#100806;border-color:#ffb070}
        .halloween-btn:focus-visible{outline:3px solid #fff;outline-offset:3px}
        .halloween-back{position:absolute;z-index:6;top:12px;left:12px;border:1px solid #ffffff44;background:#0008;color:#fff;border-radius:50%;padding:10px;cursor:pointer}
        .halloween-stage.is-playing .halloween-player{animation:playerenter 2s ease-out both, playerbreathe 2.8s ease-in-out 2s infinite alternate}
        @keyframes playerbreathe{to{transform:translate(-50%,-5px)}}
        .halloween-stage.is-playing .halloween-moon{animation:moonpulse 4s ease-in-out infinite alternate}
        @keyframes moonpulse{to{box-shadow:0 0 70px #f65c1ccc;filter:brightness(1.2)}}
        .halloween-stage.is-playing .halloween-ground{animation:groundglow 4s infinite alternate}
        @keyframes groundglow{to{filter:brightness(1.2)}}
        @media(prefers-reduced-motion:reduce){.halloween-page *{animation:none!important;scroll-behavior:auto!important}}
      `}</style>
      <section className={`halloween-stage ${playing ? "is-playing" : ""}`} aria-label="Experiencia Halloween del C.D. Bustarviejo">
        <button className="halloween-back" onClick={() => navigate(-1)} aria-label="Volver"><ArrowLeft size={18}/></button>
        <div className="halloween-moon"/><div className="halloween-mountains"/><div className="halloween-ridge"/>
        <div className="halloween-title"><div className="club">C.D. BUSTARVIEJO</div><h1>EN BUSTARVIEJO</h1><strong>NO TENEMOS MIEDO</strong></div>
        <div className="halloween-light l1"/><div className="halloween-light l2"/>
        <div className="halloween-ground"/>
        <div className="halloween-goal"><div className="halloween-net"/></div>
        <div className="halloween-fog f1"/><div className="halloween-fog f2"/><div className="halloween-fog f3"/>
        <div className="halloween-player" aria-label="Jugador con equipación naranja y negra, dorsal 9">
          <div className="head"/><div className="body"/><div className="number">9</div><div className="shorts"/><div className="leg left"/><div className="leg right"/><div className="sock left"/><div className="sock right"/>
        </div>
        <div className="halloween-ball"/>
        <div className="halloween-subtitle" key={caption}>{caption || "Pulsa play para entrar en la noche…"}</div>
        <div className="halloween-controls">
          <button className="halloween-btn primary" onClick={start}><Play size={17} fill="currentColor"/>{playing ? "Reiniciar escena" : "Comenzar"}</button>
          <button className="halloween-btn" onClick={() => setMuted(!muted)} aria-label={muted ? "Activar sonido" : "Silenciar"}>{muted ? <VolumeX size={17}/> : <Volume2 size={17}/>} {muted ? "Sonido apagado" : "Sonido activado"}</button>
        </div>
      </section>
    </main>
  );
}
