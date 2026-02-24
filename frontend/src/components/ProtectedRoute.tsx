import { Navigate } from 'react-router-dom'

interface Props {
  children: React.ReactNode
}

export const ProtectedRoute = ({ children }: Props) => {
  const token = localStorage.getItem('admin_token')

  if (!token) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}