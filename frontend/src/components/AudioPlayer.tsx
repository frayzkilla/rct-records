import { Play, Pause } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "../store/AudioPlayerStore";

export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const track = usePlayerStore((state) => state.track);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (isSeeking) return;
      const currentTime = audio.currentTime;
      const totalDuration = audio.duration;

      if (!isNaN(totalDuration)) {
        setProgress((currentTime / totalDuration) * 100);
        setDuration(totalDuration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [setIsPlaying, isSeeking]);

  useEffect(() => {
  const audio = audioRef.current;
  if (!audio || !track) return;

  audio.src = track;
  setProgress(0);
  setDuration(0);

  const handleCanPlay = () => {
    audio.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((err) => {
        console.warn("Autoplay failed:", err);
      });
  };

  audio.addEventListener("canplay", handleCanPlay);

  return () => {
    audio.removeEventListener("canplay", handleCanPlay);
  };
}, [track]);


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying) {
      audio.pause();
    }
  }, [isPlaying]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = (value: number) => {
    handleSeek(value);
    setIsSeeking(false);
  };

  const handleSeekChange = (value: number) => {
    if (!isSeeking) return;
    setProgress(value);
  };

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;

    const newProgress = value;
    const newTime = (newProgress / 100) * duration;
    audio.currentTime = newTime;
  };

  return (
    <div className="w-full bg-zinc-900 text-white p-6 border-t border-zinc-700 flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-4 w-full max-w-4xl">
        <div className="flex items-center gap-4 flex-1">
          <audio ref={audioRef} className="hidden" />
          <button
            onClick={togglePlay}
            className="p-3 rounded-full bg-[#C9A227] hover:bg-[#D4AF37] transition shadow-lg"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <div>
            <p className="font-bold text-lg font-mono uppercase tracking-widest">
              dead sakura
            </p>
            <p className="text-sm text-zinc-400 font-mono uppercase tracking-widest">
              frayz the raw
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <input
            type="range"
            className="w-full h-2 bg-[#C9A227] rounded-full cursor-pointer"
            min="0"
            max="100"
            step="1"
            value={progress}
            onChange={(e) => handleSeekChange(Number(e.target.value))}
            onMouseDown={handleSeekStart}
            onTouchStart={handleSeekStart}
            onMouseUp={() => handleSeekEnd(progress)}
            onTouchEnd={() => handleSeekEnd(progress)}
          />
        </div>
      </div>
    </div>
  );
}
