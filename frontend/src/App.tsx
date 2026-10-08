import { Suspense } from "react";
import { Routes } from "./router";
import { AnalyticsTracker } from "./lib/analytics";
import AudioPlayer from "./components/AudioPlayer";
export default function App() {
  return (
    <Suspense fallback={<div className="feedback">Загрузка…</div>}>
      <AnalyticsTracker />
      <Routes />
      <AudioPlayer />
    </Suspense>
  );
}
