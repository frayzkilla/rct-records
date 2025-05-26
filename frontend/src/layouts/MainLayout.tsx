import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import type { FC } from "react";

const MainLayout: FC = () => {
  return (
    <div className="flex flex-col bg-black min-h-screen">
      <div className="fixed top-0 left-0 w-full z-50">
        <Header />
      </div>
      <main className="flex-grow pt-10"> 
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;