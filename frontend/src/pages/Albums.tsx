import { useEffect, useState } from "react";
import AlbumCard from "../components/AlbumCard";
import TrackCard from "../components/TrackCard";

type Album = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  year: number;
  tracksQuantity: number;
};

type Beat = {
  id: string;
  title: string;
  audioUrl: string;
  coverUrl: string;
  producer: string;
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
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Beat[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openAlbumModal = async (album: Album) => {
    try {
      const res = await fetch(
        `http://localhost:3000/api/albums/${album.id}/tracks`
        // `/api/albums/${album.id}/tracks`
      );
      const data = await res.json();
      setTracks(data);
      setSelectedAlbum(album);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Ошибка при загрузке треков альбома", err);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAlbum(null);
    setTracks([]);
  };

  useEffect(() => {
    fetch("http://localhost:3000/api/albums")
      //fetch("/api/albums")
      .then((res) => res.json())
      .then(setAlbums)
      .catch((err) => console.error("Ошибка при загрузке альбомов", err));
  }, []);

  return (
    <div className="bg-black text-white font-sans px-4 sm:px-6 py-24 min-h-screen mb-10">
      <h2 className="page-header text-4xl sm:text-6xl text-center text-transparent font-bold font-mono uppercase tracking-widest bg-clip-text bg-gradient-to-r from-[#C9A227] via-[#D4AF37] to-[#E0C068] mb-16">
        АЛЬБОМЫ RAW CROWNZ
      </h2>
      <div className="flex flex-col items-center gap-8 max-w-4xl mx-auto relative mb-8">
        <div className="absolute left-0 top-0 h-full w-0.5 bg-[#C9A227]/20 -ml-8" />
        <div className="absolute right-0 top-0 h-full w-0.5 bg-[#C9A227]/20 -mr-8" />
        {albums.map((album) => (
          <div
            key={album.id}
            className="w-full cursor-pointer"
            onClick={() => openAlbumModal(album)}
          >
            <AlbumCard
              key={album.id}
              title={album.title}
              artist={album.artist}
              cover={`http://localhost:3000/${album.coverUrl}`}
              // cover={`${album.coverUrl}`}
              year={album.year}
              tracks={album.tracksQuantity}
            />
          </div>
        ))}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 -mt-20">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-7 w-full max-w-3xl max-h-[70vh] overflow-y-auto relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 text-2xl"
            >
              ×
            </button>
            <h3 className="text-2xl sm:text-3xl font-bold text-[#D4AF37] text-center mb-6 uppercase tracking-widest">
              {selectedAlbum?.title}
            </h3>
            <div className="flex flex-col gap-4">
              {tracks.length > 0 ? (
                tracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    title={track.title}
                    producer={track.producer}
                    cover={`http://localhost:3000/${track.coverUrl}`}
                    audio={`http://localhost:3000/${track.audioUrl}`}
                    // cover={`${track.coverUrl}`}
                    // audio={`${track.audioUrl}`}
                  />
                ))
              ) : (
                <p className="text-center text-zinc-400">Треки не найдены</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
