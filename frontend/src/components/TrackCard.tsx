import { Play } from "lucide-react";
import { usePlayerStore } from "../store/AudioPlayerStore";

type TrackCardProps = {
  title: string;
  producer: string;
  cover: string;
  audio: string;
};

export default function TrackCard({
  title,
  producer,
  cover,
  audio,
}: TrackCardProps) {
  const setTrack = usePlayerStore((state) => state.setTrack);

  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);

  const playAudio = (audio: string) => {
    setIsPlaying(false); 
    setTrack(audio); 
    setIsPlaying(true); 
  };

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded p-4 w-full sm:w-64 text-white shadow-xl hover:shadow-2xl transition-all duration-200">
      <img
        src={cover}
        alt={title}
        className="w-full h-52 object-cover rounded border border-[#c9a3273f] mb-4"
      />
      <div className="flex items-center justify-between gap-4 mt-2">
        <div className="flex-1">
          <h3 className="text-lg text-[#D4AF37] font-bold font-mono uppercase tracking-widest">
            {title}
          </h3>
          <p className="text-sm text-zinc-400 font-mono">{`by ${producer}`}</p>
        </div>
        <button
          onClick={() => playAudio(audio)}
          className="p-3 rounded-full bg-[#C9A227] hover:bg-[#D4AF37] transition shadow-lg"
        >
          <Play size={24} />
        </button>
      </div>
    </div>
  );
}
