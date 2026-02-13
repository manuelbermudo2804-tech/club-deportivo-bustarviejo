import React, { useState, useRef, useEffect, useMemo } from "react";
import { Play, Pause, Mic } from "lucide-react";

// Genera una forma de onda falsa pero consistente por URL
function generateWaveform(seed = "", bars = 28) {
  const wave = [];
  let h = 0.5;
  for (let i = 0; i < bars; i++) {
    h += (((seed.charCodeAt(i % seed.length) * (i + 1)) % 17) - 8) / 20;
    h = Math.max(0.15, Math.min(1, h));
    wave.push(h);
  }
  return wave;
}

export default function ChatAudioBubble({ url, duration, isMine = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);

  const waveform = useMemo(() => generateWaveform(url || "", 32), [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && isFinite(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setTotalDuration(audio.duration);
      }
    };
    const onEnd = () => { setPlaying(false); setProgress(100); };
    const onLoaded = () => { if (audio.duration && isFinite(audio.duration)) setTotalDuration(audio.duration); };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("loadedmetadata", onLoaded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("loadedmetadata", onLoaded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      if (progress >= 100) { audio.currentTime = 0; setProgress(0); }
      audio.play();
    }
    setPlaying(!playing);
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
  };

  const formatTime = (s) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Colores estilo WhatsApp real
  const playBtnBg = isMine ? "bg-[#075E54]" : "bg-[#00A884]";
  const barActive = isMine ? "#075E54" : "#00A884";
  const barInactive = isMine ? "rgba(7,94,84,0.3)" : "rgba(0,168,132,0.3)";
  const timeColor = isMine ? "text-[#075E54]/70" : "text-slate-500";

  return (
    <div className="flex items-center gap-2.5 min-w-[220px] max-w-[280px] py-1">
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause — círculo sólido de color */}
      <button
        onClick={togglePlay}
        className={`w-10 h-10 ${playBtnBg} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm active:scale-95 transition-transform`}
      >
        {playing ? (
          <Pause className="w-4 h-4 text-white" fill="white" />
        ) : (
          <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
        )}
      </button>

      {/* Waveform + time */}
      <div className="flex-1 flex flex-col gap-1.5">
        {/* Barras de onda */}
        <div className="flex items-end gap-[2px] h-[24px] cursor-pointer" onClick={seek}>
          {waveform.map((h, i) => {
            const barPct = ((i + 1) / waveform.length) * 100;
            const isPlayed = barPct <= progress;
            return (
              <div
                key={i}
                className="flex-1 rounded-full min-w-[2px] transition-colors duration-75"
                style={{
                  height: `${Math.max(4, h * 22)}px`,
                  backgroundColor: isPlayed ? barActive : barInactive,
                }}
              />
            );
          })}
        </div>

        {/* Duración */}
        <div className={`flex items-center gap-1.5 text-[10px] ${timeColor}`}>
          <span>{playing || currentTime > 0 ? formatTime(currentTime) : formatTime(totalDuration)}</span>
          <Mic className="w-2.5 h-2.5 opacity-50" />
        </div>
      </div>
    </div>
  );
}