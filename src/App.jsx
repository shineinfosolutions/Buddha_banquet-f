import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ListBooking from './pages/Students/ListBooking'
import Dashboard from './pages/Dashboard'
import EasyDashboard from './pages/EasyDashboard'
import CashManagement from './pages/CashManagement'
import RoomInspection from './pages/RoomInspection'
import TaskAssigned from './pages/TaskAssigned'
import StaffManagement from './pages/StaffManagement'
import RoomManagement from './pages/RoomManagement'
import AddBooking from './pages/Students/AddBooking'
import UpdateBooking from './pages/Students/UpdateBooking'
import MenuView from './pages/Students/MenuView'
import Invoice from './pages/Students/Invoice'
import SharedInvoice from './pages/Students/SharedInvoice'
import LaganCalendar from './pages/Calendar/LaganCalendar'
import Calendar from './pages/Calendar/Calendar'
import MenuPlanManager from './components/MenuPlanManager'
import Login from './pages/Auth/Login'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('currentUser') === 'true')
  
  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(localStorage.getItem('currentUser') === 'true')
    }
    
    // Check auth on mount and when storage changes
    checkAuth()
    window.addEventListener('storage', checkAuth)
    
    return () => window.removeEventListener('storage', checkAuth)
  }, [])

  return (
    <Router>
      <Routes>
        {/* Public invoice link shared with customers on WhatsApp — works without login */}
        <Route path="/share/invoice/:id" element={<SharedInvoice />} />
        <Route path="/*" element={isLoggedIn ? (
        <div className="flex min-h-screen bg-gray-100 w-full overflow-x-hidden">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <div className="flex-1 lg:ml-64 xl:ml-72 2xl:ml-80 transition-all duration-300 min-w-0 w-full overflow-x-hidden">
            <Routes>
            <Route path="/" element={<Navigate to="/banquet/list-booking" replace />} />
            <Route path="/dashboard" element={<Dashboard setSidebarOpen={setSidebarOpen} />} />
            <Route path="/easy-dashboard" element={<EasyDashboard setSidebarOpen={setSidebarOpen} />} />
            <Route path="/cash-management" element={<CashManagement setSidebarOpen={setSidebarOpen} />} />
            <Route path="/room-inspection" element={<RoomInspection setSidebarOpen={setSidebarOpen} />} />
            <Route path="/task-assigned" element={<TaskAssigned setSidebarOpen={setSidebarOpen} />} />
            <Route path="/staff-management" element={<StaffManagement setSidebarOpen={setSidebarOpen} />} />
            <Route path="/room-management" element={<RoomManagement setSidebarOpen={setSidebarOpen} />} />
            <Route path="/banquet/list-booking" element={<ListBooking setSidebarOpen={setSidebarOpen} />} />
            <Route path="/banquet/add-booking" element={<AddBooking setSidebarOpen={setSidebarOpen} />} />
            <Route path="/add-booking" element={<AddBooking setSidebarOpen={setSidebarOpen} />} />
            <Route path="/banquet/update-booking/:id" element={<UpdateBooking setSidebarOpen={setSidebarOpen} />} />
            <Route path="/banquet/menu-view/:id" element={<MenuView setSidebarOpen={setSidebarOpen} />} />
            <Route path="/banquet/invoice/:id" element={<Invoice setSidebarOpen={setSidebarOpen} />} />
            <Route path="/calendar" element={<Calendar setSidebarOpen={setSidebarOpen} />} />
              <Route path="/menu-plan" element={<MenuPlanManager setSidebarOpen={setSidebarOpen} />} />
              <Route path="/lagan-calendar" element={<LaganCalendar setSidebarOpen={setSidebarOpen} />} />
            </Routes>
          </div>
        </div>
      ) : (
        <div className="min-h-screen w-full">
          <Login />
        </div>
      )} />
      </Routes>
    </Router>
  )
}

export default App
