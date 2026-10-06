import { Suspense } from "react";
import { Routes } from "./router";
import AudioPlayer from "./components/AudioPlayer";
export default function App() {
  return (
    <Suspense fallback={<div className="feedback">Загрузка…</div>}>
      <Routes />
      <AudioPlayer />
    </Suspense>
  );
}
