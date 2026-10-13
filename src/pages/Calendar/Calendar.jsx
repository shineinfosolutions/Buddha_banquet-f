import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUser, FaPhone, FaStickyNote, FaRegCalendarAlt, FaBars, FaSearch, FaFilter } from 'react-icons/fa'
import { bookingAPI } from '../../services/api'
import { motion } from 'framer-motion'
import DashboardLoader from '../../DashboardLoader'

function Calendar({ setSidebarOpen }) {
  const [pageLoading, setPageLoading] = useState(true)
  const [bookings, setBookings] = useState({})
  const [allBookings, setAllBookings] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [hoveredDate, setHoveredDate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showFilters, setShowFilters] = useState(false)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 600 : false
  )
  const calendarRef = useRef(null)
  const navigate = useNavigate()
  
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())
  const userRole = localStorage.getItem("role") || "Staff"

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setHoveredDate(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [month, year, searchTerm, statusFilter])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const response = await bookingAPI.getAll()
      const data = response.data
      
      let bookingsArray = []
      
      // Handle different response structures
      if (Array.isArray(data)) {
        bookingsArray = data
      } else if (data.success && Array.isArray(data.data)) {
        bookingsArray = data.data
      } else if (data.data && Array.isArray(data.data)) {
        bookingsArray = data.data
      }
      
      setAllBookings(bookingsArray)
      
      // Apply filters
      const filteredBookings = bookingsArray.filter(booking => {
        const matchesSearch = !searchTerm || 
          (booking.name && booking.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (booking.phone && booking.phone.includes(searchTerm)) ||
          (booking.number && booking.number.includes(searchTerm)) ||
          (booking.contact && booking.contact.includes(searchTerm))
        
        // Cancelled bookings free up the date, so "All" leaves them out
        const matchesStatus = statusFilter === 'All'
          ? booking.bookingStatus !== 'Cancelled'
          : booking.bookingStatus === statusFilter
        
        return matchesSearch && matchesStatus
      })
      
      const grouped = {}
      filteredBookings.forEach((booking) => {
        const dateKey = (booking.eventDate || booking.startDate)?.split('T')[0]
        if (dateKey) {
          if (!grouped[dateKey]) grouped[dateKey] = []
          grouped[dateKey].push(booking)
        }
      })
      
      setBookings(grouped)
    } catch (err) {
    } finally {
      setLoading(false)
    }
  }

  const format = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const getAuspiciousDates = (year) => {
    const format = (m, d) =>
      `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return [
      format(1, 16), format(1, 17), format(1, 18), format(1, 19), format(1, 21),
      format(1, 22), format(1, 24), format(1, 25), format(1, 30), format(2, 3),
      format(2, 4), format(2, 6), format(2, 7), format(2, 13), format(2, 14),
      format(2, 15), format(2, 18), format(2, 19), format(2, 20), format(2, 21),
      format(2, 25), format(3, 1), format(3, 2), format(3, 3), format(3, 5),
      format(3, 6), format(4, 14), format(4, 16), format(4, 17), format(4, 18),
      format(4, 19), format(4, 20), format(4, 21), format(4, 22), format(4, 23),
      format(4, 25), format(4, 29), format(4, 30), format(5, 1), format(5, 5),
      format(5, 6), format(5, 7), format(5, 8), format(5, 10), format(5, 15),
      format(5, 17), format(5, 18), format(5, 19), format(5, 24), format(5, 28),
      format(6, 2), format(6, 4), format(6, 7), format(6, 8), format(7, 11),
      format(7, 12), format(7, 13), format(7, 17), format(7, 20), format(7, 21),
      format(7, 22), format(7, 26), format(7, 28), format(7, 29), format(7, 31),
      format(8, 1), format(8, 3), format(8, 4), format(8, 7), format(8, 8),
      format(8, 9), format(8, 13), format(8, 14), format(8, 17), format(8, 24),
      format(8, 25), format(8, 28), format(8, 29), format(8, 30), format(8, 31),
      format(9, 1), format(9, 2), format(9, 3), format(9, 4), format(9, 5),
      format(9, 26), format(9, 27), format(9, 28), format(10, 1), format(10, 2),
      format(10, 3), format(10, 4), format(10, 7), format(10, 8), format(10, 10),
      format(10, 11), format(10, 12), format(10, 22), format(10, 23), format(10, 24),
      format(10, 25), format(10, 26), format(10, 27), format(10, 28), format(10, 29),
      format(10, 30), format(10, 31), format(11, 2), format(11, 3), format(11, 4),
      format(11, 7), format(11, 8), format(11, 12), format(11, 13), format(11, 22),
      format(11, 23), format(11, 24), format(11, 25), format(11, 26), format(11, 27),
      format(11, 29), format(11, 30), format(12, 4), format(12, 5), format(12, 6)
    ]
  }

  const auspiciousDates = new Set(getAuspiciousDates(year))

  const getDateCategory = (date) => {
    const heavyDates = new Set(
      Array.from(auspiciousDates).filter((d) =>
        [1, 5, 10, 15, 20, 25, 30].includes(parseInt(d.split("-")[2]))
      )
    )
    const mediumDates = new Set(
      Array.from(auspiciousDates).filter((d) =>
        [2, 4, 7, 9, 17, 22, 27].includes(parseInt(d.split("-")[2]))
      )
    )
    if (heavyDates.has(date)) return "heavy"
    if (mediumDates.has(date)) return "medium"
    if (auspiciousDates.has(date)) return "light"
    return null
  }

  const getTooltipText = (category) => {
    if (category === "heavy") return "Heavy Booking"
    if (category === "medium") return "Medium Booking"
    if (category === "light") return "Light Booking"
    return ""
  }

  const dateTemplate = ({ year, month, day }) => {
    const currentDate = format(year, month, day)
    const dayBookings = bookings[currentDate] || []
    const bookingCount = dayBookings.length
    
    // Determine fill position based on booking count and time
    let fillPosition = 'none'
    
    if (bookingCount >= 2) {
      // 2 या अधिक bookings = पूरा colored
      fillPosition = 'full'
    } else if (bookingCount === 1) {
      const booking = dayBookings[0]
      const timeValue = booking.eventTime || booking.startTime || booking.timeSlot || booking.time || booking.slot
      
      if (timeValue) {
        // Time को parse करें
        let hour = 0
        if (timeValue.includes(':')) {
          hour = parseInt(timeValue.split(':')[0])
        } else if (timeValue.toLowerCase().includes('pm') && !timeValue.toLowerCase().includes('12')) {
          hour = parseInt(timeValue) + 12
        } else {
          hour = parseInt(timeValue)
        }
        
        // 4 PM (16:00) से पहले = first half (upper), बाद में = second half (lower)
        fillPosition = hour < 16 ? 'upper' : 'lower'
      } else {
        // अगर time नहीं मिला तो default upper
        fillPosition = 'upper'
      }
    }
    
    const isSelected = selectedDate === currentDate
    
    return (
      <div
        className={`w-12 h-12 sm:w-16 sm:h-16 relative rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 overflow-hidden ${
          isSelected 
            ? 'bg-[#c3ad6b] text-white shadow-lg scale-105 border-2 border-[#c3ad6b]' 
            : 'bg-white hover:bg-[#c3ad6b]/10 border border-gray-200 hover:border-[#c3ad6b]/30'
        }`}
        onClick={() => setSelectedDate(currentDate)}
        onMouseEnter={() => setHoveredDate(currentDate)}
        onMouseLeave={() => setHoveredDate(null)}
        title={bookingCount > 0 ? `${bookingCount} booking${bookingCount > 1 ? 's' : ''} - ${fillPosition === 'upper' ? 'First Half' : fillPosition === 'lower' ? 'Second Half' : fillPosition === 'full' ? 'Full Day' : ''}` : ''}
      >
        {/* Fill based on booking time - only show when not selected */}
        {!isSelected && (
          <>
            {fillPosition === 'upper' && (
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-[#c3ad6b] opacity-70 rounded-t-lg"></div>
            )}
            {fillPosition === 'lower' && (
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#c3ad6b] opacity-70 rounded-b-lg"></div>
            )}
            {fillPosition === 'full' && (
              <div className="absolute inset-0 bg-[#c3ad6b] opacity-70 rounded-lg"></div>
            )}
          </>
        )}
        
        {/* Day number */}
        <span className={`font-bold text-xs sm:text-sm z-10 ${
          isSelected ? 'text-white' : 'text-gray-800'
        }`}>
          {day}
        </span>
        
        {/* Booking count indicator */}
        {bookingCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow">
            {bookingCount}
          </div>
        )}
      </div>
    )
  }

  const renderCalendar = () => {
    const weeks = []
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    let day = 1
    
    for (let week = 0; week < 6; week++) {
      const days = []
      for (let i = 0; i < 7; i++) {
        const cellIndex = week * 7 + i
        if (cellIndex < firstDay || day > daysInMonth) {
          days.push(
            <td key={i} className="h-16 sm:h-20 align-top text-center"></td>
          )
        } else {
          const cellContent = dateTemplate({ year, month, day })
          days.push(
            <td key={i} className="h-16 sm:h-20 p-1">
              <div className="h-full flex items-center justify-center">
                {cellContent}
              </div>
            </td>
          )
          day++
        }
      }
      const isRowEmpty = days.every(
        (cell) =>
          !cell.props.children || cell.props.children.props === undefined
      )
      if (!isRowEmpty) {
        weeks.push(<tr key={week}>{days}</tr>)
      }
    }
    return weeks
  }

  const handlePrev = () => {
    if (month === 0) {
      setMonth(11)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const handleNext = () => {
    if (month === 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const bookingsForDate = bookings[selectedDate] || []

  // Convert 24-hour time to 12-hour format
  const convertTo12Hour = (time24) => {
    if (!time24) return time24
    
    // If already in 12-hour format, return as is
    if (time24.toLowerCase().includes('am') || time24.toLowerCase().includes('pm')) {
      return time24
    }
    
    // Handle HH:MM format
    if (time24.includes(':')) {
      const [hours, minutes] = time24.split(':')
      const hour = parseInt(hours)
      const min = minutes || '00'
      
      if (hour === 0) return `12:${min} AM`
      if (hour < 12) return `${hour}:${min} AM`
      if (hour === 12) return `12:${min} PM`
      return `${hour - 12}:${min} PM`
    }
    
    // Handle single number format
    const hour = parseInt(time24)
    if (isNaN(hour)) return time24
    
    if (hour === 0) return '12 AM'
    if (hour < 12) return `${hour} AM`
    if (hour === 12) return '12 PM'
    return `${hour - 12} PM`
  }

  if (pageLoading) {
    return <DashboardLoader pageName="Calendar" />
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen" style={{backgroundColor: 'hsl(45, 100%, 95%)'}}>
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 xs:px-4 py-3 xs:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen && setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-[#c3ad6b] text-white hover:bg-[#b39b5a] transition-colors"
            >
              <FaBars className="w-5 h-5" />
            </button>
            <h1 className="text-lg xs:text-xl sm:text-2xl font-bold truncate" style={{color: 'hsl(45, 100%, 20%)'}}>
              Event Calendar
            </h1>
          </div>
          <span className="inline-flex items-center gap-1 px-2 xs:px-3 py-1 rounded-full bg-[#c3ad6b]/10 text-[#c3ad6b] font-semibold text-xs xs:text-sm shadow">
            {userRole === "Admin" ? "👑 Admin" : "👤 Staff"}
          </span>
        </div>
      </header>

      <main className="container mx-auto px-3 xs:px-4 py-4 xs:py-6">
        <div className="bg-white rounded-lg xs:rounded-xl shadow-md overflow-hidden">
          <div className="p-3 xs:p-4 sm:p-6">

            {/* Navigation - inline like LaganCalendar */}
            <div className="bg-gradient-to-r from-[#c3ad6b]/10 to-[#c3ad6b]/5 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between gap-2">
                <button onClick={handlePrev}
                  className="flex items-center gap-1 px-4 py-2 bg-[#c3ad6b] hover:bg-[#b39b5a] text-white rounded-lg shadow-md font-semibold transition-all text-sm sm:text-base whitespace-nowrap">
                  <span>←</span>
                  <span className="hidden xs:inline">Previous</span>
                </button>
                <div className="text-center flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold mb-0.5" style={{color: 'hsl(45, 100%, 20%)'}}>
                    {monthNames[month]} {year}
                  </h2>
                  <div className="text-xs sm:text-sm text-gray-600 hidden sm:block">Event Calendar</div>
                </div>
                <button onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-2 bg-[#c3ad6b] hover:bg-[#b39b5a] text-white rounded-lg shadow-md font-semibold transition-all text-sm sm:text-base whitespace-nowrap">
                  <span className="hidden xs:inline">Next</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="mb-4 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search by name, phone..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c3ad6b] text-sm" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c3ad6b] text-sm">
                <option value="All">All Status</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Tentative">Tentative</option>
                <option value="Enquiry">Enquiry</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              {(searchTerm || statusFilter !== 'All') && (
                <button onClick={() => { setSearchTerm(''); setStatusFilter('All'); }}
                  className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                  Clear
                </button>
              )}
            </div>

            {/* Legend */}
            <div className="mb-4 p-3 bg-white border border-[#c3ad6b]/20 rounded-lg shadow-sm">
              <div className="flex flex-wrap gap-4 text-sm items-center">
                <span className="text-sm font-semibold text-gray-700">Legend:</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#c3ad6b]/70 rounded shadow-sm"></div>
                  <span className="text-gray-700">Booked (First Half)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#c3ad6b] rounded shadow-sm"></div>
                  <span className="text-gray-700">Fully Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">1</div>
                  <span className="text-gray-700">Booking Count</span>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="overflow-x-auto bg-[#c3ad6b]/10 rounded-lg p-3">
              <table className="w-full border-collapse min-w-[320px] sm:min-w-[600px]">
                <thead>
                  <tr>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <th key={day} className="h-10 sm:h-12 text-sm md:text-base font-bold text-[#c3ad6b] border-b-2 border-[#c3ad6b]/20 px-1">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderCalendar()}</tbody>
              </table>
            </div>

            {/* Book Now */}
            <div className="mt-4 xs:mt-6 flex justify-center">
              <Link to="/add-booking" state={{ selectedDate }}>
                <button
                  className={`py-2 xs:py-3 px-6 xs:px-8 rounded-lg font-semibold shadow transition-colors text-sm xs:text-base ${
                    selectedDate ? "bg-[#c3ad6b] hover:bg-[#b39b5a] text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  disabled={!selectedDate}
                >
                  {selectedDate ? `Book Now for ${selectedDate}` : 'Book Now'}
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Bookings for selected date */}
        {selectedDate && (
          <div className="mt-4 xs:mt-6">
            <div className="bg-white rounded-lg xs:rounded-xl shadow-md overflow-hidden">
              <div className="p-3 xs:p-4 sm:p-6">
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mb-4">
                  <h3 className="text-lg xs:text-xl font-bold" style={{color: 'hsl(45, 100%, 20%)'}}>
                    Bookings for {selectedDate}
                  </h3>
                </div>
                {bookingsForDate.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No bookings for this date</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {bookingsForDate.map((b, i) => (
                      <div key={i} className="bg-[#c3ad6b]/10 border border-[#c3ad6b]/20 rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="font-semibold text-gray-800 mb-2 text-sm truncate">{b.name}</div>
                        <div className="text-xs text-gray-600 space-y-1 mb-3">
                          <div>📞 {b.phone || b.number || b.contact}</div>
                          <div>📋 {b.bookingStatus}</div>
                          {(b.startTime || b.time) && <div>⏰ {convertTo12Hour(b.startTime || b.time)}</div>}
                          {b.notes && <div className="line-clamp-2">📝 {b.notes}</div>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => b._id && navigate(`/banquet/update-booking/${b._id}`)}
                            className="flex-1 bg-[#c3ad6b] hover:bg-[#b39b5a] text-white px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1">
                            ✏️ Edit
                          </button>
                          <button onClick={() => b._id && navigate(`/banquet/invoice/${b._id}`)}
                            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1">
                            🧾 Invoice
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </motion.div>
  )
}

export default Calendar