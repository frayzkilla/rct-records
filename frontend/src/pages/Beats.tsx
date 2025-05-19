import BitCard from "../components/TrackCard";
import { useEffect, useState } from "react";

type Beat = {
  id: string;
  title: string;
  audioUrl: string;
  coverUrl: string;
  producer: string;
};

export default function BeatsPage() {
  const [beats, setBeats] = useState<Beat[]>([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/beats")
      .then((res) => res.json())
      .then(setBeats)
      .catch((err) => console.error("Ошибка при загрузке битов", err));
  }, []);

  return (
    <div className="bg-black text-white font-sans px-6 py-24 min-h-screen">
      <h2 className="text-6xl md:text-7xl text-center text-transparent font-bold font-mono uppercase tracking-widest bg-clip-text bg-gradient-to-r from-[#C9A227] via-[#D4AF37] to-[#E0C068] mb-16">
        БИТЫ FROM THE RAW
      </h2>
      <div className="flex flex-wrap justify-center gap-10">
        {beats.map((beat) => (
          <BitCard
            key={beat.id}
            title={beat.title}
            producer={beat.producer}
            cover={beat.coverUrl}
            audio={beat.audioUrl}
          />
        ))}
      </div>
    </div>
  );
}
