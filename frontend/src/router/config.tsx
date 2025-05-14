import type { RouteObject } from 'react-router-dom'

import Home from '../pages/Home'
import MainLayout from '../layouts/MainLayout'
import Artists from '../pages/Artists'

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
      ],
    },
  ]

  return routes
}
