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
  const isEven = year % 2 === 0;

  return (
    <div
      className={`album-wrapper group w-full flex ${
        isEven ? "flex-row" : "flex-row-reverse"
      } items-center gap-6 bg-zinc-900/60
  hover:bg-zinc-800/40 p-6 transition-all duration-500 ease-in-out
  border hover:border-[#D4AF37] relative
  transform hover:scale-[1.001] origin-center  border-zinc-700 rounded-lg`}
    >
      <div
        className={`album-year absolute ${
          isEven ? "-left-28" : "-right-28"
        } top-1/2 -translate-y-1/2 
        text-6xl font-bold text-[#D4AF37]/30 z-0 pointer-events-none font-mono`}
      >
        {String(year).slice(2)}
      </div>

      <div
        className={`relative z-10 w-48 flex-shrink-0 
        border-2 border-[#C9A227]/30 rounded-xl`}
      >
        <img
          src={cover}
          alt={title}
          className="rounded-xl object-cover aspect-square "
        />
        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-black/40 to-transparent" />
      </div>

      <div className={`flex-1 ${isEven ? "text-left" : "text-right"}`}>
        <h3 className="text-2xl font-bold font-mono uppercase tracking-widest text-[#FFD700] mb-2">
          {title}
        </h3>
        <p className="text-zinc-300 text-lg mb-4 font-medium font-mono tracking-widest">
          {artist}
        </p>

        <div
          className={`flex ${
            isEven ? "flex-row" : "flex-row-reverse"
          } items-center gap-4 
          text-zinc-500 text-sm border-t border-[#C9A227]/20 pt-4`}
        >
          <span className="bg-[#D4AF37]/20 px-3 py-1 rounded-full">{year}</span>
          <span>{tracks} треков</span>
        </div>
      </div>

      <button
        className={`p-4 rounded-full bg-[#C9A227] hover:bg-[#D4AF37] transition-colors hover:shadow-xl
        absolute ${isEven ? "-right-6" : "-left-6"} top-1/2 -translate-y-1/2 
        opacity-0 group-hover:opacity-100 z-20 `}
      >
        <Play size={24} className="fill-current" />
      </button>
    </div>
  );
}
