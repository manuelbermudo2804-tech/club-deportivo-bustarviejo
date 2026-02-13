import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

export default function ChatAudioBubble({ url, duration, isMine = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);

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
    const onEnd = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
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
    if (playing) { audio.pause(); } else { audio.play(); }
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

  const barColor = isMine ? "bg-white/40" : "bg-slate-300";
  const fillColor = isMine ? "bg-white" : "bg-green-500";
  const btnBg = isMine ? "bg-white/20 hover:bg-white/30" : "bg-green-500 hover:bg-green-600";
  const btnIcon = isMine ? "text-white" : "text-white";
  const textColor = isMine ? "text-white/80" : "text-slate-500";

  return (
    <div className="flex items-center gap-2 min-w-[200px] max-w-[280px] py-1">
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${btnBg} transition-colors`}
      >
        {playing ? (
          <Pause className={`w-4 h-4 ${btnIcon}`} fill="currentColor" />
        ) : (
          <Play className={`w-4 h-4 ${btnIcon} ml-0.5`} fill="currentColor" />
        )}
      </button>

      {/* Waveform / Progress */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          className={`h-[6px] ${barColor} rounded-full cursor-pointer relative overflow-hidden`}
          onClick={seek}
        >
          <div
            className={`h-full ${fillColor} rounded-full transition-all duration-100`}
            style={{ width: `${progress}%` }}
          />
          {/* Thumb */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 ${fillColor} rounded-full shadow-md transition-all duration-100`}
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        <div className={`flex justify-between text-[10px] ${textColor}`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
}