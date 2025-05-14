type ArtistCardProps = {
  name: string;
  description: string;
  image: string;
};

export default function ArtistCard({ name, description, image }: ArtistCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded p-4 w-full sm:w-64 text-white shadow-xl hover:shadow-2xl transition-all duration-200">
      <img
        src={image}
        alt={name}
        className="w-full h-52 object-cover rounded border border-[#c9a3273f] mb-4"
      />
      <h3
        className="text-xl text-[#D4AF37] font-bold font-mono uppercase tracking-widest text-center"
      >
        {name}
      </h3>
      <p className="text-sm text-zinc-400 font-mono text-center">{description}</p>
    </div>
  );
}
