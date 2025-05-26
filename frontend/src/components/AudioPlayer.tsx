import { Play, Pause } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "../store/AudioPlayerStore";

export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const track = usePlayerStore((state) => state.track);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const title = usePlayerStore((state) => state.title);
  const artist = usePlayerStore((state) => state.artist);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  // const [artist, setArtist] = useState("");
  // const [title, setTitle] = useState("");

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
    if (!track) return;

    // const fileName = track.split("/").pop()?.replace(".mp3", "") ?? "";
    // const [rawArtist, rawTitle] = fileName.split("_");

    // setArtist(rawArtist || "Unknown Artist");
    // setTitle(rawTitle || "Unknown Title");

    const audio = audioRef.current;
    if (!audio || !track) return;

    audio.src = track;
    setProgress(0);
    setDuration(0);

    const handleCanPlay = () => {
      if (isPlaying) {
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn("Autoplay failed:", err);
          });
      }
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
    if (!isPlaying) {
      audio.pause();
    }
  };

  return (
    <div className="w-full bg-zinc-900 text-white p-4 md:p-6 border-t border-zinc-700 flex flex-col items-center justify-center gap-3 md:gap-4">
      <div className="flex flex-col md:flex-row items-center gap-4 w-full max-w-4xl">
        <div className="flex items-center gap-4 w-full md:flex-1">
          <audio ref={audioRef} className="hidden" />
          <button
            onClick={togglePlay}
            className="p-2 md:p-3 rounded-full bg-[#C9A227] hover:bg-[#D4AF37] transition shadow-lg flex-shrink-0"
          >
            {isPlaying ? <Pause size={20} className="md:size-6" /> : <Play size={20} className="md:size-6" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base md:text-lg font-mono uppercase tracking-widest truncate">
              {title || "Simon Said"}
            </p>
            <p className="text-xs md:text-sm text-zinc-400 font-mono uppercase tracking-widest truncate">
              {artist || "Frayz The Raw"}
            </p>
          </div>
        </div>

        <div className="w-full md:flex-1">
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