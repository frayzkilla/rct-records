export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <section className="py-24 px-6 text-center bg-gradient-to-b from-black via-zinc-900 to-black">
        <h1 className="font-bangers text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-pulse">
          RAW CROWNZ RECORDS
        </h1>
        <p className="mt-6 text-lg text-zinc-300 max-w-xl mx-auto">
          Beats. Bars. Brotherhood. Добро пожаловать в звук Raw Crownz.
        </p>
        <div className="mt-10 flex justify-center gap-4 flex-wrap">
          <button className="bg-pink-600 hover:bg-pink-700 px-6 py-3 rounded-full text-white font-semibold transition shadow-lg">
            🎧 Слушать биты
          </button>
          <button className="border border-pink-500 hover:bg-pink-500 hover:text-white px-6 py-3 rounded-full text-pink-400 font-semibold transition">
            🧠 О команде
          </button>
        </div>
      </section>
    </div>
  );
}
