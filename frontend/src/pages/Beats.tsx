import BitCard from "../components/TrackCard";

const beats = [
  {
    title: "Simon Said",
    producer: "Frayz The Raw",
    cover: "/public/covers/frayztheraw_simonsaid.jpg",
    audio: "/public/frayztheraw_simonsaid.mp3",
  },
  {
    title: "Woah",
    producer: "Leftover",
    cover: "/public/covers/leftover_woah.jpg",
    audio: "/public/leftover_woah.mp3",
  },
  {
    title: "Van Two",
    producer: "Danny Local",
    cover: "/public/covers/dannylocal_vantwo.jpg",
    audio: "/public/dannylocal_vantwo.mp3",
  },
];

export default function BeatsPage() {
  return (
    <div className="bg-black text-white font-sans px-6 py-24 min-h-screen">
      <h2 className="text-6xl md:text-7xl text-center text-transparent font-bold font-mono uppercase tracking-widest bg-clip-text bg-gradient-to-r from-[#C9A227] via-[#D4AF37] to-[#E0C068] mb-16">
        БИТЫ FROM THE RAW
      </h2>
      <div className="flex flex-wrap justify-center gap-10">
        {beats.map((beat) => (
          <BitCard
            key={beat.title}
            title={beat.title}
            producer={beat.producer}
            cover={beat.cover}
            audio={beat.audio}
          />
        ))}
      </div>
    </div>
  );
}
