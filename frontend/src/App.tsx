import { Suspense } from "react";

import { Routes } from "./router";
import AudioPlayer from "./components/AudioPlayer";

export default function App() {
  return (
    <Suspense fallback={<>loading...</>}>
      <Routes />
      <div className="fixed bottom-0 left-0 w-full z-50">
        <AudioPlayer />
      </div>
    </Suspense>
  );
}
