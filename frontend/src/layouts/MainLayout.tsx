import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import type { FC } from 'react'

const MainLayout: FC = () => { 
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-160px)]">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

export default MainLayout
