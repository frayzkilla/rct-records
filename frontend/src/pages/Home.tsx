export default function Home() {
  return (
    <div className="mt-20 bg-black text-white font-sans">
      <section className="py-24 px-6 text-center bg-gradient-to-b from-black via-zinc-900 to-black">
        <h1
          style={{ fontFamily: "RawCrownz" }}
          className="text-8xl md:text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#C9A227] via-[#D4AF37] to-[#E0C068] animate-pulse "
        >
          RAW CROWNZ RECORDS
        </h1>
        <p className="mt-6 text-xl max-w-xl mx-auto text-[#E0C068] font-mono uppercase tracking-widest drop-shadow-lg">
          Добро пожаловать в звук Raw Crownz
        </p>

        <div className="mt-10 flex justify-center gap-4 flex-wrap">
          <button className="bg-[#C9A227] hover:bg-[#D4AF37] text-black font-bold px-5 py-3 rounded-md shadow-md border border-[#A98C2C] transition-all duration-200 hover:brightness-110 active:scale-95">
            Слушать биты
          </button>
          <button className="bg-transparent text-[#D4AF37] border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black px-5 py-3 rounded-md shadow-inner transition-all duration-200 hover:shadow-lg active:scale-95">
            О команде
          </button>
        </div>
      </section>
    </div>
  );
}
