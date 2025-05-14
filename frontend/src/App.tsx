import { Suspense } from "react";

import { Routes } from "./router";

export default function App() {
  return (
      <Suspense fallback={<>loading...</>}>
        <Routes />
      </Suspense>
  );
}