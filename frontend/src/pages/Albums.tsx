import { useEffect, useState } from "react";
import AlbumCard from "../components/AlbumCard";

type Album = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  year: number;
  tracks: number;
};

// const albums = [
//   {
//     title: "Golden Hour",
//     artist: "Frayz The Raw",
//     cover: "/public/albums/frayztheraw_goldenhour.jpg",
//     year: 2024,
//     tracks: 12,
//   },
//   {
//     title: "Basement Sessions",
//     artist: "Leftover",
//     cover: "/public/albums/leftover_basement.jpg",
//     year: 2023,
//     tracks: 9,
//   },
//   {
//     title: "Rawology",
//     artist: "Danny Local",
//     cover: "/public/albums/dannylocal_rawology.jpg",
//     year: 2022,
//     tracks: 14,
//   },
// ];

export default function AlbumsPage() {

  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/albums")
      .then((res) => res.json())
      .then(setAlbums)
      .catch((err) => console.error("Ошибка при загрузке альбомов", err));
  }, []);

  return (
    <div className="bg-black text-white font-sans px-4 sm:px-6 py-24 min-h-screen">
      <h2 className="text-4xl sm:text-6xl text-center text-transparent font-bold font-mono uppercase tracking-widest bg-clip-text bg-gradient-to-r from-[#C9A227] via-[#D4AF37] to-[#E0C068] mb-16">
        АЛЬБОМЫ RAW CROWNZ
      </h2>
      <div className="flex flex-col items-center gap-6">
        {albums.map((album) => (
          <AlbumCard
            key={album.id}
            title={album.title}
            artist={album.artist}
            cover={`http://localhost:3000/${album.cover}`}
            year={album.year}
            tracks={album.tracks}
          />
        ))}
      </div>
    </div>
  );
}
