export default function AboutPage() {
  return (
    <div className="bg-black text-white font-sans px-6 py-24 min-h-screen">
      <h2 className="page-header text-6xl md:text-7xl text-center text-transparent font-bold font-mono uppercase tracking-widest bg-clip-text bg-gradient-to-r from-[#C9A227] via-[#D4AF37] to-[#E0C068] mb-16">
        О нас
      </h2>

      <div className="max-w-4xl mx-auto text-justify space-y-10 text-lg leading-relaxed text-zinc-300">
        <div className="absolute top-[42%] right-6  text-[20rem] font-extrabold text-zinc-800 opacity-50 pointer-events-none select-none leading-none">
          RAW   
        </div>
        <p className="font-mono tracking-wide">
          <span className="text-[#D4AF37] font-bold">RAW CROWNZ</span> —
          творческое объединение, где рождаются идеи и создается стиль.
        </p>

        <p className="font-mono tracking-wide">
          <span className="text-[#C9A227] font-bold">
            RAW CROWNZ <span className="underline">RECORDS</span>
          </span>{" "}
          — одно из наших направлений, где мы растём, экспериментируем,
          открываем новые стили и делаем музыку, в которой слышен город, мечты и
          амбиции.
        </p>

        <p className="font-mono tracking-wide">
          Мы верим в искренность, звук с характером и артистов, которые не
          боятся быть собой. У нас нет фальши — только неподдельный интерес к
          тому, что будет завтра.
        </p>

        <p className="font-mono tracking-wide">
          Мы — те, кто делает по-своему. Мы —{" "}
          <span className="text-[#C9A227] animate-pulse font-extrabold">
            RAW
          </span>
          .
        </p>
      </div>
    </div>
  );
}
