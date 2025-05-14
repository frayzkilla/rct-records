import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import type { FC } from "react";
import AudioPlayer from "../components/AudioPlayer";

const MainLayout: FC = () => {
  return (
    <div className="flex flex-col bg-black min-h-screen">
      <div className="fixed top-0 left-0 w-full z-50">
        <Header />
      </div>
      <main className="flex-grow">
        <Outlet />
      </main>
      <div className="fixed bottom-0 left-0 w-full z-50">
        <AudioPlayer />
      </div>
    </div>
  );
};

export default MainLayout;
