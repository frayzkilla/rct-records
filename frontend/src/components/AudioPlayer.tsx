import { Play, Volume2 } from "lucide-react";

export default function AudioPlayer() {
  return (
    <div className="w-full bg-zinc-900 text-white p-6 border-t border-zinc-700 flex flex-col items-center justify-center gap-4">
      {/* Контент плеера */}
      <div className="flex items-center gap-4 w-full max-w-4xl">
        {/* Кнопка воспроизведения и информация о треке */}
        <div className="flex items-center gap-4 flex-1">
          <button className="p-3 rounded-full bg-[#C9A227] hover:bg-[#D4AF37] transition shadow-lg">
            <Play size={24} />
          </button>
          <div>
            <p className="font-bold text-lg font-mono uppercase tracking-widest">dead sakura</p>
            <p className="text-sm text-zinc-400 font-mono uppercase tracking-widest">frayz the raw</p>
          </div>
        </div>

        {/* Полоса прогресса */}
        <div className="flex-1 flex flex-col justify-center">
          <input
            type="range"
            className="w-full h-2 bg-[#C9A227] rounded-full cursor-pointer"
            min="0"
            max="100"
            step="1"
          />
        </div>
      </div>

      
    </div>
  );
}
