import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import { useCatalog } from "../lib/catalog";
export default function MainLayout() {
  const { pathname } = useLocation();
  const { data } = useCatalog();
  useEffect(() => {
    const [section, id] = pathname.split("/").filter(Boolean);
    const names: Record<string, string> = {
      beats: "Треки",
      tracks: "Треки",
      artists: "Артисты",
      albums: "Альбомы",
      about: "О команде",
      admin: "Кабинет артиста",
    };
    const item =
      section === "artists"
        ? data?.artists.find((item) => item.id === Number(id))?.name
        : section === "albums"
          ? data?.albums.find((item) => item.id === Number(id))?.title
          : data?.tracks.find((item) => item.id === Number(id))?.title;
    document.title = `${item ?? names[section] ?? "Sounds from Siberia"} / Raw Crownz Records`;
  }, [pathname, data]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return (
    <div className={`site-shell ${pathname === "/admin" ? "admin-site-shell" : ""}`}>
      <a href="#main-content" className="skip-link">
        К содержимому
      </a>
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className={pathname.startsWith("/admin") ? "admin-shell" : ""}
      >
        <Outlet />
      </main>
    </div>
  );
}
