import { useEffect, useState } from "react";
import ArtistCard from "../components/ArtistCard";

type Artist = {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
};

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/artists")
      .then((res) => res.json())
      .then(setArtists)
      .catch((err) => console.error("Ошибка при загрузке артистов", err));
  }, []);

  return (
    <div className=" bg-black text-white font-sans px-6 py-24 min-h-screen">
      <h2 className="text-6xl md:text-7xl text-center text-transparent font-bold font-mono uppercase tracking-widest bg-clip-text bg-gradient-to-r from-[#C9A227] via-[#D4AF37] to-[#E0C068] mb-16">
        НАШИ АРТИСТЫ
      </h2>
      <div className="flex flex-wrap justify-center gap-10">
        {artists.map((artist) => (
          <ArtistCard
            key={artist.id}
            name={artist.name}
            description={artist.bio}
            image={`http://localhost:3000/${artist.avatarUrl}`}
          />
        ))}
      </div>
    </div>
  );
}
