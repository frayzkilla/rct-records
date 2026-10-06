import type { RouteObject } from "react-router-dom";

import Home from "../pages/Home";
import MainLayout from "../layouts/MainLayout";
import Artists from "../pages/Artists";
import BeatsPage from "../pages/Beats";
import AboutPage from "../pages/About";
import AlbumsPage from "../pages/Albums";
import AdminPage from "../pages/AdminPage";
import { Navigate } from "react-router-dom";
import EntityPage from "../pages/EntityPage";
import NotFound from "../pages/NotFound";

export const useRoutesConfig = (): RouteObject[] => {
  const routes: RouteObject[] = [
    {
      path: "/",
      element: <MainLayout />,
      children: [
        { path: "artists/:id", element: <EntityPage kind="artist" /> },
        { path: "albums/:id", element: <EntityPage kind="album" /> },
        { path: "beats/:id", element: <EntityPage kind="track" /> },
        { path: "tracks", element: <BeatsPage /> },
        { path: "tracks/:id", element: <EntityPage kind="track" /> },
        { path: "*", element: <NotFound /> },
        {
          index: true,
          element: <Home />,
        },
        {
          path: "artists",
          element: <Artists />,
        },
        {
          path: "beats",
          element: <BeatsPage />,
        },
        {
          path: "about",
          element: <AboutPage />,
        },
        {
          path: "albums",
          element: <AlbumsPage />,
        },
        {
          path: "admin",
          element: <AdminPage />,
        },
        {
          path: "adminEdit",
          element: <Navigate to="/admin" replace />,
        },
      ],
    },
  ];

  return routes;
};
