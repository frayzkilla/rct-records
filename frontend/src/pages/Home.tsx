import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="mt-20 bg-black text-white font-sans">
      <section className="py-12 md:py-24 px-4 sm:px-6 text-center bg-gradient-to-b from-black via-zinc-900 to-black">
        <h1
          style={{
            fontFamily: "RawCrownz",
            lineHeight: "0.65",
            paddingBottom: "1.5rem",
            transform: "translateY(5px)", 
          }}
          className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#C9A227] via-[#D4AF37] to-[#E0C068] animate-pulse px-2"
        >
          RAW CROWNZ RECORDS
        </h1>
        <p className="mt-4 md:mt-6 text-lg md:text-xl max-w-xl mx-auto text-[#E0C068] font-mono uppercase tracking-widest drop-shadow-lg px-2">
          Добро пожаловать в звук Raw Crownz
        </p>

        <div className="mt-8 md:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate("/beats")}
            className="bg-[#C9A227] hover:bg-[#D4AF37] text-black font-bold px-5 py-3 rounded-md shadow-md border border-[#A98C2C] transition-all duration-200 hover:brightness-110 active:scale-95 text-sm sm:text-base"
          >
            Слушать биты
          </button>
          <button
            onClick={() => navigate("/about")}
            className="bg-transparent text-[#D4AF37] border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black px-5 py-3 rounded-md shadow-inner transition-all duration-200 hover:shadow-lg active:scale-95 text-sm sm:text-base"
          >
            О команде
          </button>
        </div>
      </section>
    </div>
  );
}
