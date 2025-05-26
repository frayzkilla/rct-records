import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768);
      if (window.innerWidth > 768) setIsMenuOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <style>
        {`
          .burger {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            width: 30px;
            height: 20px;
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 0;
            z-index: 100;
          }

          .burger span {
            width: 100%;
            height: 2px;
            background: white;
            transition: all 0.3s;
          }

          .burger.active span:nth-child(1) {
            transform: rotate(45deg) translate(6px, 5px);
          }

          .burger.active span:nth-child(2) {
            opacity: 0;
          }

          .burger.active span:nth-child(3) {
            transform: rotate(-45deg) translate(6px, -5px);
          }

          .mobile-menu {
            position: fixed;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100vh;
            background: black;
            transition: left 0.3s;
            padding-top: 80px;
            z-index: 99;
          }

          .mobile-menu.open {
            left: 0;
          }

          .mobile-nav {
            display: flex;
            flex-direction: column;
            gap: 25px;
            padding: 20px;
          }

          .mobile-link {
            font-family: monospace;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: white;
            text-decoration: none;
            font-size: 1.2rem;
            transition: color 0.3s;
          }

          .mobile-link:hover {
            color: #888;
          }

          @media (max-width: 768px) {
            .desktop-nav {
              display: none;
            }
          }
        `}
      </style>

      <header className="w-full bg-black text-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold font-mono uppercase tracking-widest">
            <Link to="/">RawCrownzRecords</Link>
          </div>

          {/* Десктопное меню */}
          <nav className="desktop-nav flex space-x-6 font-mono uppercase tracking-widest">
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

          {/* Мобильный бургер */}
          {!isDesktop && (
            <button
              className={`burger ${isMenuOpen ? "active" : ""}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          )}
        </div>

        {/* Мобильное меню */}
        {!isDesktop && (
          <div className={`mobile-menu ${isMenuOpen ? "open" : ""}`}>
            <nav className="mobile-nav">
              <Link
                to="/"
                className="mobile-link"
                onClick={() => setIsMenuOpen(false)}
              >
                Главная
              </Link>
              <Link
                to="/beats"
                className="mobile-link"
                onClick={() => setIsMenuOpen(false)}
              >
                Биты
              </Link>
              <Link
                to="/albums"
                className="mobile-link"
                onClick={() => setIsMenuOpen(false)}
              >
                Альбомы
              </Link>
              <Link
                to="/artists"
                className="mobile-link"
                onClick={() => setIsMenuOpen(false)}
              >
                Артисты
              </Link>
              <Link
                to="/about"
                className="mobile-link"
                onClick={() => setIsMenuOpen(false)}
              >
                О нас
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;