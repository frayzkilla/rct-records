const Footer = () => {
  return (
    <footer className="w-full bg-black text-white px-6 py-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm">
        <div className="mb-4 md:mb-0">
          &copy; {new Date().getFullYear()} Raw Crownz Records. Все права
          защищены.
        </div>
        <div className="space-x-4">
          <a href="/privacy" className="hover:text-gray-400">
            Политика конфиденциальности
          </a>
          <a href="/terms" className="hover:text-gray-400">
            Условия использования
          </a>
          <a href="/contacts" className="hover:text-gray-400">
            Контакты
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
