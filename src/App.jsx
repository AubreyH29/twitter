import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Feed from './pages/Feed'
import ForgotPassword from './pages/ForgotPassword'
import Profile from './pages/Profile'
import Explore from './pages/Explore'
import Notifications from './pages/Notifications'
import Messages from './pages/Messages'
import Bookmarks from './pages/Bookmarks'
import PostThread from './pages/PostThread'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/feed" element={<PrivateRoute><Feed /></PrivateRoute>} />
      <Route path="/explore" element={<PrivateRoute><Explore /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
      <Route path="/bookmarks" element={<PrivateRoute><Bookmarks /></PrivateRoute>} />
      <Route path="/profile/:username" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/post/:id" element={<PrivateRoute><PostThread /></PrivateRoute>} />
    </Routes>
  )
}
