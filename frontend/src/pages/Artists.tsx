import ArtistCard from "../components/ArtistCard";

const artists = [
  {
    name: "Leftover",
    description: "битмейкер, эмси, звукорежиссёр",
    image: "/public/artists_images/leftover.jpg",
  },
  {
    name: "Frayz The Raw",
    description: "продюсер, плэйбой, аристократ",
    image: "/public/artists_images/frayztheraw.jpg",
  },
  {
    name: "Danny Local",
    description: "битмейкер, эмси, лысый из браззерс",
    image: "/public/artists_images/dannylocal.jpg",
  },
];

export default function ArtistsPage() {
  return (
    <div className=" bg-black text-white font-sans px-6 py-24 min-h-screen">
      <h2 className="text-6xl md:text-7xl text-center text-transparent font-bold font-mono uppercase tracking-widest bg-clip-text bg-gradient-to-r from-[#C9A227] via-[#D4AF37] to-[#E0C068] mb-16">
        НАШИ АРТИСТЫ
      </h2>
      <div className="flex flex-wrap justify-center gap-10">
        {artists.map((artist) => (
          <ArtistCard
            key={artist.name}
            name={artist.name}
            description={artist.description}
            image={artist.image}
          />
        ))}
      </div>
    </div>
  );
}
