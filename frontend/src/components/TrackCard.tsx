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

  const setTitle = usePlayerStore((state) => state.setTitle);
  const setArtist = usePlayerStore((state) => state.setArtist);

  const playAudio = (audio: string) => {
    setIsPlaying(false);
    setTrack(audio);
    setIsPlaying(true);
    setTitle(title);
    setArtist(producer);
  };

  return (
    <div className="bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-700 rounded-lg p-4 w-full group relative overflow-hidden transition-all duration-300 hover:-translate-y-2 shadow-lg hover:shadow-xl backdrop-blur-sm">
      <div className="relative">
        <img
          src={cover}
          className="w-full h-52 object-cover rounded-lg border-2 border-[#c9a3273f] group-hover:border-[#D4AF37]/40 transition-colors"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0  transition-opacity" />
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="pr-4">
          <h3 className="text-lg font-bold font-mono tracking-widest text-[#D4AF37] drop-shadow-md">
            {title}
          </h3>
          <p className="text-zinc-400 text-sm mt-1 font-medium">{producer}</p>
        </div>

        <button
          onClick={() => playAudio(audio)}
          className="p-3 rounded-full bg-[#C9A227] hover:bg-[#D4AF37] transition-all 
               shadow-lg hover:shadow-xl active:scale-95 group-hover:ring-2 group-hover:ring-[#D4AF37]/50"
        >
          <Play size={24} className="fill-current" />
        </button>
      </div>

      <div className="absolute bottom-0 left-0 h-1 bg-[#D4AF37]/20 w-full">
        <div className="h-full bg-[#D4AF37] w-0 group-hover:w-full transition-all duration-500 ease-out" />
      </div>
    </div>
  );
}
