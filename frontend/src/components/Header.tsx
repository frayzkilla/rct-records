import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="w-full bg-black text-white shadow-md">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold font-mono uppercase tracking-widest">
          <Link to="/">RawCrownzRecords</Link>
        </div>
        <nav className="flex space-x-6 font-mono uppercase tracking-widest">
          <Link to="/" className="hover:text-gray-400">
            Главная
          </Link>
          <Link to="/beats" className="hover:text-gray-400">
            Биты
          </Link>
          <Link to="/albums" className="hover:text-gray-400">
            Альбомы
          </Link>
          <Link to="/artists" className="hover:text-gray-400">
            Артисты
          </Link>
          <Link to="/about" className="hover:text-gray-400">
            О нас
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
