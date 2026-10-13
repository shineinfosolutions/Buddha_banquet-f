import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaPhone,
  FaStickyNote,
  FaRegCalendarAlt,
  FaEdit,
  FaFileInvoice,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useAppContext } from '../../context/AppContext';
import { bookingAPI } from '../../services/api';
import DashboardLoader from '../../DashboardLoader';
import useWebSocket from '../../hooks/useWebSocket';
import WebSocketStatus from '../../components/WebSocketStatus';

function LaganCalendar({ setSidebarOpen }) {
  const { axios } = useAppContext();
  const [pageLoading, setPageLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const userRole = localStorage.getItem("role") || "Staff";
  const [hoveredDate, setHoveredDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    notes: "",
  });
  const [bookings, setBookings] = useState({});
  const calendarRef = useRef(null);
  const [selectedRange, setSelectedRange] = useState({
    start: null,
    end: null,
  });
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setHoveredDate(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [month, year]);

  const handleBooking = () => {
    if (selectedDate) {
      setShowModal(true);
    } else {
      alert("Please select a date first.");
    }
  };

  const format = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const getAuspiciousDates = (year) => {
    const format = (m, d) =>
      `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const datesByYear = {
      2025: [
        // January 2025
        format(1,16), format(1,17), format(1,18), format(1,19), format(1,20),
        format(1,21), format(1,22), format(1,23), format(1,24), format(1,25),
        format(1,27), format(1,28), format(1,29), format(1,30), format(1,31),
        // February 2025
        format(2,1), format(2,2), format(2,3), format(2,4), format(2,6),
        format(2,7), format(2,12), format(2,13), format(2,14), format(2,16),
        format(2,17), format(2,18), format(2,19), format(2,20), format(2,23),
        format(2,24), format(2,25), format(2,26),
        // March 2025
        format(3,1), format(3,2), format(3,3), format(3,5), format(3,6),
        format(3,7), format(3,8),
        // April 2025 — Holashtak & Kharmas gap, limited dates
        format(4,14), format(4,16), format(4,17), format(4,18), format(4,19),
        format(4,20), format(4,21), format(4,22), format(4,23), format(4,25),
        format(4,27), format(4,28), format(4,29), format(4,30),
        // May 2025
        format(5,1), format(5,2), format(5,5), format(5,6), format(5,7),
        format(5,8), format(5,9), format(5,10), format(5,12), format(5,13),
        format(5,14), format(5,15), format(5,17), format(5,18), format(5,19),
        format(5,20), format(5,22), format(5,24), format(5,25), format(5,26),
        format(5,28), format(5,29), format(5,30),
        // June 2025
        format(6,1), format(6,2), format(6,4), format(6,5), format(6,7), format(6,8),
        // July 2025 — Devshayani Ekadashi starts (no marriages)
        // August-September 2025 — Chaturmas (no marriages)
        // October 2025 — Dev Uthani Ekadashi resumes
        format(10,22), format(10,23), format(10,24), format(10,25), format(10,26),
        format(10,27), format(10,28), format(10,29), format(10,30), format(10,31),
        // November 2025
        format(11,1), format(11,2), format(11,3), format(11,4), format(11,5),
        format(11,6), format(11,7), format(11,8), format(11,10), format(11,11),
        format(11,12), format(11,13), format(11,17), format(11,18), format(11,19),
        format(11,20), format(11,21), format(11,22), format(11,23), format(11,24),
        format(11,25), format(11,26), format(11,27), format(11,28), format(11,29),
        format(11,30),
        // December 2025
        format(12,1), format(12,2), format(12,3), format(12,4), format(12,5),
        format(12,6), format(12,7), format(12,8), format(12,9), format(12,10),
      ],
      2026: [
        // January 2026
        format(1,14), format(1,15), format(1,16), format(1,17), format(1,18),
        format(1,19), format(1,20), format(1,21), format(1,22), format(1,23),
        format(1,24), format(1,25), format(1,26), format(1,27), format(1,28),
        format(1,29), format(1,30), format(1,31),
        // February 2026
        format(2,1), format(2,2), format(2,3), format(2,4), format(2,5),
        format(2,6), format(2,7), format(2,9), format(2,10), format(2,11),
        format(2,12), format(2,13), format(2,14), format(2,16), format(2,17),
        format(2,18), format(2,19), format(2,20), format(2,23), format(2,24),
        format(2,25), format(2,26), format(2,27),
        // March 2026
        format(3,1), format(3,2), format(3,3), format(3,4), format(3,5),
        format(3,6), format(3,7), format(3,9), format(3,10),
        // April 2026
        format(4,15), format(4,16), format(4,17), format(4,18), format(4,19),
        format(4,20), format(4,21), format(4,22), format(4,23), format(4,24),
        format(4,25), format(4,27), format(4,28), format(4,29), format(4,30),
        // May 2026
        format(5,1), format(5,2), format(5,4), format(5,5), format(5,6),
        format(5,7), format(5,8), format(5,9), format(5,11), format(5,12),
        format(5,13), format(5,14), format(5,15), format(5,18), format(5,19),
        format(5,20), format(5,21), format(5,22), format(5,25), format(5,26),
        format(5,27), format(5,28), format(5,29),
        // June 2026
        format(6,1), format(6,2), format(6,3), format(6,4), format(6,5),
        format(6,6), format(6,8), format(6,9), format(6,10),
        // July 2026 — Devshayani Ekadashi (no marriages)
        // Oct-Nov 2026 — Dev Uthani Ekadashi resumes
        format(10,28), format(10,29), format(10,30), format(10,31),
        format(11,1), format(11,2), format(11,3), format(11,4), format(11,5),
        format(11,6), format(11,7), format(11,9), format(11,10), format(11,11),
        format(11,12), format(11,13), format(11,16), format(11,17), format(11,18),
        format(11,19), format(11,20), format(11,23), format(11,24), format(11,25),
        format(11,26), format(11,27), format(11,28), format(11,29), format(11,30),
        // December 2026
        format(12,1), format(12,2), format(12,3), format(12,4), format(12,5),
        format(12,7), format(12,8), format(12,9), format(12,10),
      ],
    };

    return datesByYear[year] || [];
  };

  const auspiciousDates = new Set(getAuspiciousDates(year));

  const exportAuspiciousDates = () => {
    const currentYearDates = getAuspiciousDates(year);
    const emailBody = `Auspicious Marriage Dates for ${year}:\n\n` +
      currentYearDates.map(date => {
        const [y, m, d] = date.split('-');
        const dateObj = new Date(y, m - 1, d);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
        return `${dayName}, ${monthName} ${d}, ${y} - Auspicious Date`;
      }).join('\n');
    
    const subject = `Auspicious Marriage Dates ${year} - Lagan Calendar`;
    const mailtoLink = `mailto:calendar@LaganCalendar.jsx?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoLink);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setBookings((prev) => {
      const dateBookings = prev[selectedDate] || [];
      return {
        ...prev,
        [selectedDate]: [...dateBookings, { ...formData }],
      };
    });
    setShowModal(false);
    setFormData({ name: "", contact: "", notes: "" });
  };

  const dateTemplate = ({ year, month, day }) => {
    const currentDate = format(year, month, day);
    const dayBookings = bookings[currentDate] || [];
    const bookingCount = dayBookings.length;
    const isAuspicious = auspiciousDates.has(currentDate);
    
    let fillPosition = 'none';
    
    if (bookingCount === 1) {
      const booking = dayBookings[0];
      const timeValue = booking.eventTime || booking.startTime || booking.timeSlot || booking.time || booking.slot;
      if (timeValue) {
        let hour = 0;
        if (timeValue.includes(':')) {
          hour = parseInt(timeValue.split(':')[0]);
        } else if (timeValue.toLowerCase().includes('pm') && !timeValue.toLowerCase().includes('12')) {
          hour = parseInt(timeValue) + 12;
        } else {
          hour = parseInt(timeValue);
        }
        fillPosition = hour < 16 ? 'upper' : 'lower';
      } else {
        fillPosition = 'upper';
      }
    } else if (bookingCount >= 2) {
      fillPosition = 'full';
    }
    
    const isSelected = selectedDate === currentDate;
    
    let bgClass = 'bg-white';
    let borderClass = 'border-gray-200';
    let textClass = 'text-gray-800';
    
    if (isSelected) {
      bgClass = 'bg-[#c3ad6b]';
      textClass = 'text-white';
      borderClass = 'border-[#c3ad6b]';
    } else if (isAuspicious) {
      bgClass = 'bg-green-50';
      borderClass = 'border-green-300';
      textClass = 'text-green-800';
    }
    
    const tooltipText = isAuspicious 
      ? `Auspicious Date${bookingCount > 0 ? ` | ${bookingCount} booking${bookingCount > 1 ? 's' : ''}` : ''}` 
      : bookingCount > 0 ? `${bookingCount} booking${bookingCount > 1 ? 's' : ''}` : '';
    
    return (
      <div
        className={`w-12 h-12 sm:w-16 sm:h-16 relative rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 overflow-hidden touch-manipulation ${bgClass} ${borderClass} border-2 hover:shadow-md ${isSelected ? 'shadow-lg scale-105' : 'hover:scale-102'}`}
        onClick={() => setSelectedDate(currentDate)}
        onMouseEnter={() => setHoveredDate(currentDate)}
        onMouseLeave={() => setHoveredDate(null)}
        title={tooltipText}
      >
        {isAuspicious && !isSelected && (
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 shadow-sm" />
        )}
        
        {fillPosition === 'upper' && !isSelected && (
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-[#c3ad6b]/40 rounded-t-lg" />
        )}
        {fillPosition === 'lower' && !isSelected && (
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#c3ad6b]/40 rounded-b-lg" />
        )}
        {fillPosition === 'full' && !isSelected && (
          <div className="absolute inset-0 bg-[#c3ad6b]/40 rounded-lg" />
        )}
        
        <span className={`font-bold text-sm sm:text-base z-10 ${textClass}`}>
          {day}
        </span>
        
        {bookingCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow z-20">
            {bookingCount > 9 ? '9+' : bookingCount}
          </div>
        )}
      </div>
    );
  };

  const renderCalendar = () => {
    const weeks = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    let day = 1;
    for (let week = 0; week < 6; week++) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const cellIndex = week * 7 + i;
        if (cellIndex < firstDay || day > daysInMonth) {
          days.push(
            <td key={i} className="h-16 sm:h-20 align-top text-center"></td>
          );
        } else {
          const cellContent = dateTemplate({ year, month, day });
          days.push(
            <td key={i} className="h-16 sm:h-20 p-1">
              <div className="h-full flex items-center justify-center">
                {cellContent}
              </div>
            </td>
          );
          day++;
        }
      }
      const isRowEmpty = days.every(
        (cell) =>
          !cell.props.children || cell.props.children.props === undefined
      );
      if (!isRowEmpty) {
        weeks.push(<tr key={week}>{days}</tr>);
      }
    }
    return weeks;
  };

  const handlePrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'BOOKING_CREATED':
        case 'BOOKING_UPDATED':
        case 'BOOKING_DELETED':
          fetchBookings();
          break;
        default:
          break;
      }
    }
  }, [lastMessage]);

  const fetchBookings = async () => {
    try {
      const response = await bookingAPI.getAll();
      const data = response.data;
      
      let bookingsArray = [];
      if (Array.isArray(data)) {
        bookingsArray = data;
      } else if (data.success && Array.isArray(data.data)) {
        bookingsArray = data.data;
      } else if (data.data && Array.isArray(data.data)) {
        bookingsArray = data.data;
      }
      
      const grouped = {};
      bookingsArray.forEach((booking) => {
        // Cancelled bookings free up the date
        if (booking.bookingStatus === 'Cancelled') return;
        const dateKey = (booking.eventDate || booking.startDate)?.split('T')[0];
        if (dateKey) {
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(booking);
        }
      });
      setBookings(grouped);
    } catch (err) {
    }
  };

  const bookingsForDate = bookings[selectedDate] || [];
  const filteredBookingsForDate =
    statusFilter === "All"
      ? bookingsForDate
      : bookingsForDate.filter(
          (b) =>
            (b.bookingStatus || "").toLowerCase() === statusFilter.toLowerCase()
        );

  const displayBookings =
    searchTerm.trim() && searchResults !== null
      ? searchResults
      : filteredBookingsForDate;

  if (pageLoading) {
    return <DashboardLoader pageName="Event Calendar" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen" style={{backgroundColor: 'hsl(45, 100%, 95%)'}}>
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 xs:px-4 py-3 xs:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen && setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-[#c3ad6b] text-white hover:bg-[#b39b5a] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg xs:text-xl sm:text-2xl font-bold truncate" style={{color: 'hsl(45, 100%, 20%)'}}>
              Lagan Calendar
            </h1>
          </div>
          <div className="flex items-center gap-2 xs:gap-4">
            <span className="inline-flex items-center gap-1 xs:gap-2 px-2 xs:px-3 py-1 rounded-full bg-[#c3ad6b]/10 text-[#c3ad6b] font-semibold text-xs xs:text-sm shadow">
              {userRole === "Admin" ? "👑 Admin" : "👤 Staff"}
            </span>
            {!isMobile && <WebSocketStatus />}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 xs:px-4 py-4 xs:py-6">
        <div className="bg-white rounded-lg xs:rounded-xl shadow-md overflow-hidden">
          <div className="p-3 xs:p-4 sm:p-6">
            {/* Calendar Navigation */}
            <div className="bg-gradient-to-r from-[#c3ad6b]/10 to-[#c3ad6b]/5 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-4 py-2 bg-[#c3ad6b] hover:bg-[#b39b5a] text-white rounded-lg shadow-md font-semibold transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
                >
                  <span>←</span>
                  <span className="hidden xs:inline">Previous</span>
                </button>
                
                <div className="text-center flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold mb-0.5" style={{color: 'hsl(45, 100%, 20%)'}}>
                    {monthNames[month]} {year}
                  </h2>
                  <div className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                    Auspicious Marriage Calendar
                  </div>
                </div>
                
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-2 bg-[#c3ad6b] hover:bg-[#b39b5a] text-white rounded-lg shadow-md font-semibold transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
                >
                  <span className="hidden xs:inline">Next</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="mb-6 p-4 bg-white border border-[#c3ad6b]/20 rounded-lg shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-700">Calendar Legend:</h4>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-50 border-2 border-green-300 rounded shadow-sm"></div>
                    <span className="text-gray-700">Auspicious Dates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full shadow-sm"></div>
                    <span className="text-gray-700">Auspicious Indicator</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">1</div>
                    <span className="text-gray-700">Booking Count</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto bg-[#c3ad6b]/10 rounded-lg p-3">
              <table className="w-full border-collapse min-w-[320px] sm:min-w-[600px]">
                <thead>
                  <tr>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                      <th
                        key={day}
                        className="h-10 sm:h-12 text-sm md:text-base font-bold text-[#c3ad6b] border-b-2 border-[#c3ad6b]/20 px-1"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderCalendar()}</tbody>
              </table>
            </div>

            <div className="mt-4 xs:mt-6 flex flex-col xs:flex-row gap-3 xs:gap-4 justify-center items-center">
              <Link to="/add-booking" state={{ selectedDate }}>
                <button
                  className={`py-2 xs:py-3 px-6 xs:px-8 rounded-lg font-semibold shadow transition-colors touch-manipulation text-sm xs:text-base ${
                    selectedDate
                      ? "bg-[#c3ad6b] hover:bg-[#b39b5a] active:bg-[#a08a4f] text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  disabled={!selectedDate}
                  onClick={handleBooking}
                >
                  {isMobile && selectedDate ? `Book ${selectedDate}` : `Book Now ${selectedDate ? `for ${selectedDate}` : ''}`}
                </button>
              </Link>
            </div>
          </div>
        </div>
        
        {selectedDate && (
          <div className="mt-4 xs:mt-6">
            <div className="bg-white rounded-lg xs:rounded-xl shadow-md overflow-hidden">
              <div className="p-3 xs:p-4 sm:p-6">
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mb-3 xs:mb-4">
                  <h3 className="text-lg xs:text-xl font-bold" style={{color: 'hsl(45, 100%, 20%)'}}>
                    Bookings for {selectedDate}
                  </h3>
                  {auspiciousDates.has(selectedDate) && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      ✨ Auspicious Date
                    </div>
                  )}
                </div>
                
                <div className="mb-4 xs:mb-6 flex flex-col gap-3 xs:gap-4">
                  <div className="flex flex-col xs:flex-row gap-3 xs:gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-[#c3ad6b] whitespace-nowrap">Status:</label>
                      <select
                        className="border border-[#c3ad6b]/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c3ad6b] focus:border-[#c3ad6b] flex-1 xs:flex-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="All">All</option>
                        <option value="Tentative">Tentative</option>
                        <option value="Enquiry">Enquiry</option>
                        <option value="Confirmed">Confirmed</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        className="border border-[#c3ad6b]/30 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[#c3ad6b] focus:border-[#c3ad6b]"
                        placeholder={isMobile ? "Search..." : "Search by name or phone..."}
                        value={searchTerm}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setSearchTerm(val);
                          if (!val.trim()) {
                            setSearchResults(null);
                            return;
                          }
                          setSearchLoading(true);
                          try {
                            const resp = await axios.get(
                              `/api/bookings/search?q=${encodeURIComponent(val)}`
                            );
                            const results = (resp.data.data || resp.data || []).filter(
                              (b) => {
                                const dateKey = b.startDate && b.startDate.split("T")[0];
                                return dateKey === selectedDate;
                              }
                            );
                            setSearchResults(results);
                          } catch (err) {
                            setSearchResults([]);
                          } finally {
                            setSearchLoading(false);
                          }
                        }}
                      />
                      {searchLoading && (
                        <span className="text-xs text-[#c3ad6b] whitespace-nowrap">Searching...</span>
                      )}
                    </div>
                  </div>
                </div>

                {displayBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-lg">
                      {searchTerm.trim()
                        ? "No bookings found for this search"
                        : `No bookings for this date${
                            statusFilter !== "All" ? ` with status "${statusFilter}"` : ""
                          }`}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {displayBookings.map((b, i) => (
                      <div
                        key={i}
                        className="bg-[#c3ad6b]/10 border border-[#c3ad6b]/20 rounded-lg p-3 hover:shadow-md transition-shadow"
                      >
                        <div className="font-semibold text-gray-800 mb-2 text-sm truncate">{b.name}</div>
                        <div className="text-xs text-gray-600 space-y-1 mb-3">
                          <div className="truncate">📞 {b.number || b.contact}</div>
                          <div>📋 {b.bookingStatus}</div>
                          {b.notes && (
                            <div className="text-xs text-gray-500 line-clamp-2">📝 {b.notes}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (b._id) navigate(`/banquet/update-booking/${b._id}`);
                            }}
                            className="flex-1 bg-[#c3ad6b] hover:bg-[#b39b5a] text-white px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <FaEdit className="text-xs" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (b._id) navigate(`/banquet/invoice/${b._id}`);
                            }}
                            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <FaFileInvoice className="text-xs" />
                            Invoice
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
  );
}

export default LaganCalendar;