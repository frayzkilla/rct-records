import { Play, Volume2 } from "lucide-react";

export default function AudioPlayer() {
  return (
    <div className="w-full bg-zinc-900 text-white p-4 border-t border-zinc-700 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full bg-pink-600 hover:bg-pink-700 transition shadow-lg">
          <Play size={24} />
        </button>
        <div>
          <p className="font-bold text-lg font-bangers">Raw Street Anthem</p>
          <p className="text-sm text-zinc-400">MC Krownz</p>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2">
        <Volume2 size={20} />
        <input type="range" className="w-24" disabled />
      </div>
    </div>
  );
}
