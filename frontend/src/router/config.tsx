import type { RouteObject } from 'react-router-dom'

import Home from '../pages/Home'
import MainLayout from '../layouts/MainLayout'
import Artists from '../pages/Artists'
import BeatsPage from '../pages/Beats'
import AboutPage from '../pages/About'
import AlbumsPage from '../pages/Albums'

export const useRoutesConfig = (): RouteObject[] => {
  const routes: RouteObject[] = [
    {
      path: '/',
      element: <MainLayout />, 
      children: [
        {
          index: true, 
          element: <Home />,
        },
        {
          path: 'artists',
          element: <Artists />,
        },
        {
          path: 'beats',
          element: <BeatsPage />,
        },
        {
          path: 'about',
          element: <AboutPage />,
        },
        {
          path: 'albums',
          element: <AlbumsPage />,
        },
      ],
    },
  ]

  return routes
}
