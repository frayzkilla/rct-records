type ArtistCardProps = {
  name: string;
  description: string;
  image: string;
};

export default function ArtistCard({ name, description, image }: ArtistCardProps) {
  return (
    <div className="group relative bg-zinc-900/80 hover:bg-zinc-900 border-2 border-[#C9A227]/30 rounded-xl p-4 transition-all duration-300 hover:-translate-y-2 shadow-lg hover:shadow-xl backdrop-blur-sm">
      <div className="relative overflow-hidden rounded-lg aspect-square">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 border-2 border-[#c9a3273f]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>

      <div className="pt-4 text-center">
        <h3 className="text-2xl font-bold font-mono uppercase tracking-widest text-[#D4AF37] mb-2">
          {name}
        </h3>
        <p className="text-zinc-400 text-sm font-medium line-clamp-2">{description}</p>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-4 flex items-center gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {[...Array(8)].map((_, i) => (
          <div 
            key={i}
            className="flex-1 bg-[#D4AF37]/30 rounded-sm animate-wave"
            style={{ 
              animationDelay: `${i * 0.1}s`,
              height: `${Math.random() * 60 + 20}%`
            }}
          />
        ))}
      </div>
    </div>
  );
}
