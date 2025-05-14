import type { RouteObject } from 'react-router-dom'

import Home from '../pages/Home'
import MainLayout from '../layouts/MainLayout'

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
      ],
    },
  ]

  return routes
}
