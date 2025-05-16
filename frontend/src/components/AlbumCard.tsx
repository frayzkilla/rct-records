import { Play } from "lucide-react";

type AlbumCardProps = {
  title: string;
  artist: string;
  cover: string;
  year: number;
  tracks: number;
};
export default function AlbumCard({
  title,
  artist,
  cover,
  year,
  tracks,
}: AlbumCardProps) {
  return (
    <div className="flex items-center gap-6 w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Обложка */}
      <img
        src={cover}
        alt={title}
        className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-lg border border-[#c9a32740]"
      />

      {/* Инфо */}
      <div className="flex-1">
        <h3 className="text-xl sm:text-2xl text-[#FFD700] font-bold font-mono uppercase tracking-widest">
          {title}
        </h3>
        <p className="text-sm sm:text-base text-zinc-400 font-mono">{artist}</p>
        <p className="text-xs text-zinc-500 font-mono mt-1">
          {year} • {tracks} треков
        </p>
      </div>

      {/* Кнопка Play */}
      <button
        className="p-3 rounded-full bg-[#C9A227] hover:bg-[#D4AF37] transition shadow-md"
        title="Слушать альбом"
      >
        <Play size={20} />
      </button>
    </div>
  );
}