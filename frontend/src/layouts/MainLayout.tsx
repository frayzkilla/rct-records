import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
export default function MainLayout() {
  const { pathname } = useLocation();
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
