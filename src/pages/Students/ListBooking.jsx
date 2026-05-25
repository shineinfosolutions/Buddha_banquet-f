import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { bookingAPI, menuAPI } from "../../services/api";
import { AiFillFileExcel } from "react-icons/ai";
import {
  FiSearch,
  FiX,
  FiPlus,
  FiEdit,
  FiEye,
  FiFileText,
  FiTrash2,
  FiMenu,
} from "react-icons/fi";
import { FaWhatsapp, FaList } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import ChefPDFPreview from "../ChefPDFPreview";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Logo from "../../assets/buddha avenue.png";
import WaterMark from "../../assets/buddha avenue.png";

const debounce = (func, delay) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

const statusStyle = (status) => {
  if (status === "Confirmed") return "bg-green-100 text-green-800";
  if (status === "Tentative") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-700";
};

// Safe UTC-based date formatter — avoids timezone shift (dates stored as UTC midnight in MongoDB)
const formatDateUTC = (dateStr, opts = {}) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  if (opts.long) {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const weekdays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    // Reconstruct date from UTC parts to get correct weekday
    const utcDate = new Date(Date.UTC(year, d.getUTCMonth(), d.getUTCDate()));
    return `${opts.weekday ? weekdays[utcDate.getDay()] + ", " : ""}${d.getUTCDate()} ${months[d.getUTCMonth()]} ${year}`;
  }
  return `${day}/${month}/${year}`;
};

const ListBooking = ({ setSidebarOpen }) => {
  const tableRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const invoiceRenderRef = useRef(null);
  const termsRenderRef = useRef(null);
  const [pdfItem, setPdfItem] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [productToDelete, setProductToDelete] = useState(null);
  const [allData, setAllData] = useState([]);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 600 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const userRole = localStorage.getItem("role") || "Staff";

  const fetchUsers = () => {
    setLoading(true);
    bookingAPI
      .getPaginated(currentPage)
      .then((res) => {
        if (res.data) {
          const processedData = res.data.data
            .map((item) => {
              const totalAdvance = Array.isArray(item.advance)
                ? item.advance.reduce((sum, p) => sum + (p.amount || 0), 0)
                : typeof item.advance === "number"
                  ? item.advance
                  : 0;
              return {
                ...item,
                advance: totalAdvance,
                total: item.total ?? 0,
                balance: item.balance ?? 0,
              };
            })
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
          setUserData(processedData);
          setTotalPages(res.data.total);
        }
      })
      .catch(() => alert("Failed to load bookings."))
      .finally(() => setLoading(false));
  };

  const fetchAllData = () => {
    bookingAPI
      .getAll()
      .then((res) => {
        if (res.data) setAllData(res.data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchAllData();
    fetchUsers();
  }, [currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleDelete = async (id) => {
    setLoading(true);
    bookingAPI
      .delete(id)
      .then(() => {
        alert("Booking deleted successfully");
        fetchUsers();
      })
      .catch((err) =>
        alert(err.response?.data?.message || "Failed to delete booking"),
      )
      .finally(() => setLoading(false));
  };

  const handleDeleteModal = (product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };
  const confirmDelete = () => {
    handleDelete(productToDelete._id);
    setDeleteModalOpen(false);
    setProductToDelete(null);
  };
  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setProductToDelete(null);
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setLoading(true);
      try {
        const response = await bookingAPI.search(
          encodeURIComponent(searchQuery),
        );
        const data = response.data;
        const arr = Array.isArray(data) ? data : data?.data || [];
        setUserData(arr);
        setTotalPages(arr.length);
      } catch {
        setUserData([]);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    } else {
      fetchUsers();
    }
  };

  const debouncedSearch = debounce(handleSearch, 300);
  const handleChange = (e) => {
    setSearchQuery(e.target.value);
    clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => debouncedSearch(), 800);
  };

  const handleDownloadCSV = () => {
    if (!allData?.length) {
      alert("No data available to export");
      return;
    }
    const headers = [
      "Name",
      "Number",
      "WhatsApp",
      "Pax",
      "Booking Date",
      "Food Type",
      "Rate Plan",
      "Advance",
      "GST",
      "Total",
      "Balance",
      "Rate/Pax",
      "Hall",
      "Time",
      "Status",
    ];
    const rows = allData.map((item) =>
      [
        item.name,
        item.number,
        item.whatsapp,
        item.pax,
        item.startDate ? formatDateUTC(item.startDate) : "",
        item.foodType,
        item.ratePlan,
        item.advance,
        item.gst,
        item.total,
        item.balance,
        item.ratePerPax,
        item.hall,
        item.time,
        item.bookingStatus,
      ]
        .map((v) => {
          const s = String(v || "");
          return s.includes(",") || s.includes('"')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(","),
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bookings-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const sendWhatsApp = async (item) => {
    let raw = String(item.whatsapp || item.number || "")
      .replace(/\D/g, "")
      .replace(/^0+/, "");
    let phone =
      raw.length === 10
        ? `91${raw}`
        : raw.length === 12 && raw.startsWith("91")
          ? raw
          : null;
    if (!phone) {
      alert("Invalid phone number.");
      return;
    }

    setGeneratingPDF(true);
    setPdfItem(item);
    await new Promise((r) => setTimeout(r, 300));

    const patchAndCapture = async (element) => {
      const clone = element.cloneNode(true);
      clone.style.cssText =
        "position:fixed;top:0;left:0;width:794px;background:#fff;z-index:-9999;";
      document.body.appendChild(clone);
      clone.querySelectorAll("*").forEach((el) => {
        const computed = window.getComputedStyle(el);
        const bg = computed.getPropertyValue("background-color");
        const color = computed.getPropertyValue("color");
        const border = computed.getPropertyValue("border-color");
        if (bg && (bg.includes("oklab") || bg.includes("oklch")))
          el.style.setProperty("background-color", "transparent", "important");
        if (color && (color.includes("oklab") || color.includes("oklch")))
          el.style.setProperty("color", "#1a1a1a", "important");
        if (border && (border.includes("oklab") || border.includes("oklch")))
          el.style.setProperty("border-color", "#e5e7eb", "important");
      });
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 794,
        windowWidth: 794,
      });
      document.body.removeChild(clone);
      return canvas;
    };

    const addCanvasToPDF = (pdf, canvas, isFirst) => {
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let y = 0;
      while (y < imgHeight) {
        if (!isFirst || y > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -y, pageWidth, imgHeight);
        y += pageHeight;
      }
    };

    try {
      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });
      const canvas1 = await patchAndCapture(invoiceRenderRef.current);
      addCanvasToPDF(pdf, canvas1, true);
      const canvas2 = await patchAndCapture(termsRenderRef.current);
      addCanvasToPDF(pdf, canvas2, false);
      pdf.save(
        `Invoice_${item.name}_${formatDateUTC(item.startDate).replace(/\//g, "-")}.pdf`,
      );

      const msg = `Hi *${item.name}*, please find your booking invoice attached above.\n\n📅 *Date:* ${formatDateUTC(item.startDate, { long: true, weekday: true })}\n🏛️ *Hall:* ${item.hall}\n👥 *Guests:* ${item.pax} pax\n💰 *Total:* ₹${item.total}\n🔴 *Balance Due:* ₹${item.balance}\n\n_Buddha Avenue Banquet, Medical Road, Gorakhpur_ 🙏`;
      setTimeout(
        () =>
          window.open(
            `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
            "_blank",
          ),
        1000,
      );
    } finally {
      setGeneratingPDF(false);
      setPdfItem(null);
    }
  };

  const maxPage = Math.ceil(totalPages / 10);

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-[#c3ad6b] mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading Bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen && setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-[#c3ad6b] text-white hover:bg-[#b39b5a] transition-colors"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-[#c3ad6b]/20 p-2 rounded-full">
                <FaList className="text-[#c3ad6b] text-lg" />
              </div>
              <h1 className="text-xl font-bold text-yellow-900">
                Booking List
              </h1>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${userRole === "Admin" ? "bg-[#c3ad6b]/20 text-[#c3ad6b]" : "bg-gray-100 text-gray-600"}`}
          >
            {userRole === "Admin" ? "👑 Admin" : "👤 Staff"}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Top Bar */}
          <div className="bg-[#c3ad6b] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-white font-bold text-lg">Manage Bookings</h2>
            <div className="flex gap-2">
              <Link
                to="/add-booking"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#c3ad6b] rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                <FiPlus /> Add Booking
              </Link>
              <button
                onClick={handleDownloadCSV}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900 transition-colors"
              >
                <AiFillFileExcel /> CSV
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleChange}
                placeholder={
                  isMobile ? "Search..." : "Search by name or phone..."
                }
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c3ad6b]"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    fetchUsers();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600"
                >
                  <FiX />
                </button>
              )}
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c3ad6b]"></div>
              </div>
            ) : userData.length === 0 ? (
              <div className="py-16 text-center">
                <FaList className="text-gray-200 text-5xl mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No bookings found</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="block sm:hidden space-y-3">
                  <AnimatePresence>
                    {userData.map((item, idx) => (
                      <motion.div
                        key={item._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: idx * 0.04 }}
                        className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
                      >
                        <div className="bg-[#c3ad6b]/10 border-b border-[#c3ad6b]/20 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#c3ad6b] rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {item.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 text-sm">
                                {item.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.number}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyle(item.bookingStatus)}`}
                          >
                            {item.bookingStatus}
                          </span>
                        </div>
                        <div className="px-4 py-3 grid grid-cols-2 gap-y-1 text-xs text-gray-600">
                          <span className="font-medium text-gray-700">
                            Date:
                          </span>
                          <span>{formatDateUTC(item.startDate)}</span>
                          <span className="font-medium text-gray-700">
                            Rate Plan:
                          </span>
                          <span>{item.ratePlan}</span>
                          <span className="font-medium text-gray-700">
                            Food Type:
                          </span>
                          <span>{item.foodType}</span>
                          <span className="font-medium text-gray-700">
                            Total:
                          </span>
                          <span className="font-semibold text-gray-800">
                            ₹{item.total}
                          </span>
                          <span className="font-medium text-gray-700">
                            Advance:
                          </span>
                          <span>₹{item.advance}</span>
                          <span className="font-medium text-gray-700">
                            Balance:
                          </span>
                          <span className="text-red-600 font-semibold">
                            ₹{item.balance}
                          </span>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-1">
                          <Link
                            to={`/banquet/update-booking/${item._id}`}
                            className="flex-1 min-w-[50px] inline-flex items-center justify-center gap-1 bg-[#c3ad6b] hover:bg-[#b39b5a] text-white px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <FiEdit size={11} /> Edit
                          </Link>
                          <Link
                            to={`/banquet/menu-view/${item._id}`}
                            className="flex-1 min-w-[50px] inline-flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-800 text-white px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <FiEye size={11} /> Menu
                          </Link>
                          <Link
                            to={`/banquet/invoice/${item._id}`}
                            className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <FiFileText size={11} /> Invoice
                          </Link>
                          <ChefPDFPreview
                            booking={item}
                            className="flex-1 min-w-[60px] text-xs"
                          />
                          <button
                            onClick={() => sendWhatsApp(item)}
                            className="flex-1 min-w-[70px] inline-flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <FaWhatsapp size={11} /> WA
                          </button>
                          <button
                            onClick={() => handleDeleteModal(item)}
                            className="flex-1 min-w-[50px] inline-flex items-center justify-center gap-1 bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <FiTrash2 size={11} /> Del
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200">
                  <table
                    ref={tableRef}
                    className="w-full text-sm min-w-[1100px]"
                  >
                    <thead>
                      <tr className="bg-gray-900 text-white">
                        <th className="px-4 py-3 text-left font-semibold">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Number
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Plan
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Advance
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Hall
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <AnimatePresence>
                        {userData.map((item, idx) => (
                          <motion.tr
                            key={item._id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-[#c3ad6b]/5 transition-colors`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-[#c3ad6b]/20 rounded-full flex items-center justify-center text-[#c3ad6b] font-bold text-xs flex-shrink-0">
                                  {item.name?.[0]?.toUpperCase() || "?"}
                                </div>
                                <span className="font-semibold text-gray-800 truncate max-w-[120px]">
                                  {item.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {item.number}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatDateUTC(item.startDate)}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#c3ad6b]">
                              {item.ratePlan}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {item.foodType}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              ₹{item.advance || 0}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-800">
                              ₹{item.total || 0}
                            </td>
                            <td className="px-4 py-3 text-gray-600 truncate max-w-[100px]">
                              {item.hall}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyle(item.bookingStatus)}`}
                              >
                                {item.bookingStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 flex-wrap">
                                <Link
                                  to={`/banquet/update-booking/${item._id}`}
                                  className="inline-flex items-center gap-1 bg-[#c3ad6b] hover:bg-[#b39b5a] text-white px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                                >
                                  <FiEdit size={11} /> Edit
                                </Link>
                                <Link
                                  to={`/banquet/menu-view/${item._id}`}
                                  className="inline-flex items-center gap-1 bg-gray-700 hover:bg-gray-800 text-white px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                                >
                                  <FiEye size={11} /> Menu
                                </Link>
                                <Link
                                  to={`/banquet/invoice/${item._id}`}
                                  className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                                >
                                  <FiFileText size={11} /> Invoice
                                </Link>
                                <ChefPDFPreview
                                  booking={item}
                                  className="text-xs"
                                />
                                <button
                                  onClick={() => sendWhatsApp(item)}
                                  className="inline-flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                                >
                                  <FaWhatsapp size={11} />
                                </button>
                                <button
                                  onClick={() => handleDeleteModal(item)}
                                  className="inline-flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                                >
                                  <FiTrash2 size={11} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Pagination */}
            {maxPage > 1 && (
              <div className="flex justify-center items-center gap-2 pt-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${currentPage === 1 ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                >
                  Previous
                </button>
                {Array.from(
                  { length: Math.min(maxPage, 5) },
                  (_, i) => i + 1,
                ).map((i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${currentPage === i ? "bg-[#c3ad6b] text-white border-[#c3ad6b]" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                  >
                    {i}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(maxPage, p + 1))
                  }
                  disabled={currentPage === maxPage}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${currentPage === maxPage ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete Modal */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-red-500 px-6 py-4">
              <h3 className="text-white font-bold text-lg">Delete Booking</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-6 text-sm">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-800">
                  {productToDelete.name}
                </span>
                's booking? This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDelete}
                  className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Hidden invoice renderer for PDF generation */}
      {pdfItem && (
        <div
          ref={invoiceRenderRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "794px",
            background: "#fff",
            zIndex: -9999,
            pointerEvents: "none",
          }}
        >
          <div className="relative overflow-hidden">
            <img
              src={WaterMark}
              alt=""
              style={{
                position: "absolute",
                opacity: 0.12,
                width: "30%",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", zIndex: 10 }}>
              <div
                style={{
                  background: "rgba(195,173,107,0.1)",
                  borderBottom: "1px solid rgba(195,173,107,0.3)",
                  padding: "16px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img
                    src={Logo}
                    alt="Buddha Avenue"
                    style={{ width: 80, height: 80, objectFit: "contain" }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        color: "#1f2937",
                      }}
                    >
                      Buddha Avenue Banquet
                    </div>
                    <div style={{ fontSize: 14, color: "#6b7280" }}>
                      Booking Invoice
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, color: "#6b7280" }}>
                    Invoice Date
                  </div>
                  <div
                    style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}
                  >
                    {formatDateUTC(new Date().toISOString(), { long: true })}
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: "16px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  {[
                    [
                      "Customer Details",
                      [
                        ["Name", pdfItem.name],
                        ["Mobile", pdfItem.phone || pdfItem.number],
                        pdfItem.email && ["Email", pdfItem.email],
                        pdfItem.whatsapp && ["WhatsApp", pdfItem.whatsapp],
                      ].filter(Boolean),
                    ],
                    [
                      "Booking Details",
                      [
                        [
                          "Date",
                          formatDateUTC(pdfItem.startDate, { long: true }),
                        ],
                        ["Time", pdfItem.time],
                        ["Hall", pdfItem.hall],
                        ["Guests", `${pdfItem.pax} pax`],
                        ["Status", pdfItem.bookingStatus],
                      ],
                    ],
                  ].map(([title, rows]) => (
                    <div
                      key={title}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: "bold",
                          color: "#c3ad6b",
                          textTransform: "uppercase",
                          marginBottom: 8,
                          borderBottom: "1px solid #f3f4f6",
                          paddingBottom: 4,
                        }}
                      >
                        {title}
                      </div>
                      {rows.map(([k, v]) => (
                        <div
                          key={k}
                          style={{
                            fontSize: 15,
                            color: "#374151",
                            marginBottom: 2,
                          }}
                        >
                          <b>{k}:</b> {v}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: "bold",
                      color: "#c3ad6b",
                      textTransform: "uppercase",
                      marginBottom: 8,
                      borderBottom: "1px solid #f3f4f6",
                      paddingBottom: 4,
                    }}
                  >
                    Package Details
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 4,
                      fontSize: 15,
                      color: "#374151",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <b>Rate Plan:</b> {pdfItem.ratePlan}
                    </div>
                    <div>
                      <b>Food Type:</b> {pdfItem.foodType}
                    </div>
                    <div>
                      <b>Rate per Pax:</b> ₹{pdfItem.ratePerPax}
                    </div>
                    <div>
                      <b>Meal Plan:</b>{" "}
                      {pdfItem.mealPlan || "Without Breakfast"}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: "bold",
                      color: "#c3ad6b",
                      textTransform: "uppercase",
                      marginBottom: 8,
                      borderBottom: "1px solid #f3f4f6",
                      paddingBottom: 4,
                    }}
                  >
                    Payment Summary
                  </div>
                  <div style={{ fontSize: 14, color: "#374151" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 2,
                      }}
                    >
                      <span>
                        Food ({pdfItem.pax} pax × ₹{pdfItem.ratePerPax})
                      </span>
                      <span>
                        ₹{(pdfItem.pax * pdfItem.ratePerPax).toFixed(2)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: "bold",
                        fontSize: 15,
                        borderTop: "1px solid #d1d5db",
                        paddingTop: 6,
                        marginTop: 4,
                      }}
                    >
                      <span>Total Amount</span>
                      <span style={{ color: "#c3ad6b" }}>₹{pdfItem.total}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        color: "#16a34a",
                      }}
                    >
                      <span>Advance Paid</span>
                      <span>₹{pdfItem.advance}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: "bold",
                        color: "#dc2626",
                      }}
                    >
                      <span>Balance Due</span>
                      <span>₹{pdfItem.balance}</span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 14,
                    color: "#6b7280",
                    borderTop: "1px solid #e5e7eb",
                    paddingTop: 12,
                  }}
                >
                  Thank you for choosing Buddha Avenue Banquet!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden terms renderer for PDF generation */}
      {pdfItem && (
        <div
          ref={termsRenderRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "794px",
            background: "#fff",
            zIndex: -9999,
            pointerEvents: "none",
          }}
        >
          <div style={{ position: "relative", overflow: "hidden" }}>
            <img
              src={WaterMark}
              alt=""
              style={{
                position: "absolute",
                opacity: 0.12,
                width: "30%",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", zIndex: 10 }}>
              <div
                style={{
                  background: "#f7f5ef",
                  padding: "16px 32px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <img
                  src={Logo}
                  alt="Buddha Avenue"
                  style={{ width: 48, height: 48, objectFit: "contain" }}
                />
                <div>
                  <div
                    style={{
                      fontWeight: "bold",
                      color: "#1f2937",
                      fontSize: 16,
                    }}
                  >
                    Buddha Avenue Banquet
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Terms &amp; Conditions
                  </div>
                </div>
              </div>
              <div style={{ padding: "24px 32px" }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#c3ad6b",
                    borderBottom: "2px solid rgba(195,173,107,0.3)",
                    paddingBottom: 8,
                    marginBottom: 16,
                  }}
                >
                  TERMS &amp; CONDITIONS OF BOOKING
                </div>
                <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {[
                    'CONFIRMATION OF BANQUET HALL/VENUE IS SUBJECT TO ITS AVAILABILITY ON THE DATE OF RECEIPT OF ADVANCE AMOUNT. TILL SUCH TIME, YOUR BOOKING WOULD BE TREATED AS TENTATIVE AND WOULD LIABLE TO BE CANCELLED WITHOUT PRIOR NOTICE, BASED ON OUR HOTEL POLICY OF "FIRST COME FIRST SERVE" AGAINST THE CONFIRMED BOOKING.',
                    "50% ADVANCE ON CONFIRMATION AND THE REST AMOUNT SHOULD BE SETTLED FIFTEEN DAYS BEFORE THE FUNCTION DATE.",
                    "DAY EVENT SESSION: 10:00 HOURS TILL 15:00 HOURS. EVENING EVENT SESSION: 19:30 HOURS TILL 23:30 HOURS.",
                    "ADVANCE PAYMENT CANNOT BE REFUNDABLE.",
                    "FULL PAYMENT OF THE PACKAGE SHOULD BE DONE AT LEAST 15 DAYS (FIFTEEN DAYS) BEFORE THE FUNCTION DATE. HOTEL RESERVES THE RIGHT TO CANCEL THE BOOKING IF PAYMENT IS NOT DONE ON TIME, THIS WILL AVOID LAST MINUTE NOC ISSUES.",
                    "CHEQUE WILL BE ACCEPTED 20 DAYS PRIOR TO THE EVENT. NO PDC WILL BE ENTERTAINED.",
                    "MENU & OTHER EVENT DETAILS TO BE DECIDED MINIMUM 10 DAYS PRIOR TO THE EVENT. AFTER THE DUE DATE, CHEF CHOICE MENU WILL BE APPLICABLE.",
                    "HOTEL RESERVES THE RIGHT TO REVISE THE RATES FOR ANY REDUCTION IN THE NUMBER OF PEOPLE.",
                    "RATES QUOTED WILL BE APPLICABLE FOR THE SPECIFIC FUNCTION ONLY AND SUBJECT TO CONFIRMATION FROM YOUR END WITHIN 5 DAYS FROM THE DATE OF THE QUOTATION, AFTER WHICH THEY WILL LAPSE.",
                    "THE CHARGES WOULD BE MADE AS PER THE GUARANTEED NUMBER OF PERSONS. ALL APPLICABLE GST AS EXTRA.",
                    "FULL MENU ITEMS CANNOT BE SERVED ON THE TABLE FOR ANY VIP OR SPECIAL GUEST.",
                    "D.J / SOUND / MUSIC / ORCHESTRA / BAR TIMINGS TILL 22:30 HRS ONLY.",
                    "NO CSD, DUTY FREE LIQUORS ARE ALLOWED. ONLY U.P SALES LIQUOR IS ALLOWED.",
                    "NO LEFTOVER FOOD WILL BE PACKED EVEN IF PLATES CONSUMED ARE LESS THAN THE GUARANTEED NUMBER OF PEOPLE.",
                    "STARTER WILL BE SERVED ONLY (90 MINUTES) FROM THE BEGINNING OF THE EVENT.",
                    "IN CASE THE BAR TEAM IS APPOINTED WITH OUTSIDE STAFF THEN, ITEMS LIKE SODA, SOFT DRINKS, JUICES, AND ICE-CUBES ETC. WILL NOT BE PART OF OUR PACKAGE.",
                    "EXTRA USAGE OF THE VENUE BEYOND THE SPECIFIED TIME WOULD BE CHARGED EXTRA ON AN HOURLY BASIS AND IT WOULD BE RS. 15,000/- PER HOUR.",
                    "THE HOTEL DOES NOT PERMIT DECORATORS FROM OUTSIDE OTHER THAN THE ONES ON THE HOTEL'S EMPANELMENT.",
                    "ANY OTHER CHARGES SUCH AS GATE PASS WILL BE GUEST LIABILITY.",
                    "THE HALL SHOULD BE VACATED ON OR BEFORE THE END TIME MENTIONED IN THIS CONTRACT. IN CASE OF EXTENSION OF TIME, APPLICABLE CHARGES WILL BE LEVIED ON AN HOURLY BASIS SUBJECT TO ITS AVAILABILITY.",
                    "KINDLY NOTE THAT THE HOTEL DOES NOT ALLOW FIRE CRACKERS, DHOL GHODI, BAND WITHIN OR AROUND THE VICINITY OF THE PREMISES.",
                    "ELECTRICITY CONSUMPTION SHOULD BE UP TO 03 KW ONLY. ABOVE WILL BE CHARGED @ INR 1000 + GST PER KWH ACCORDINGLY.",
                    "PETS, ARMS & AMMUNITION IS STRICTLY PROHIBITED INSIDE THE PREMISES.",
                    "WE WILL NOT PROVIDE QUARTER PLATES FOR ANY MAIN COURSE FOOD ITEMS.",
                    "FOOD SHALL BE PREPARED ONLY FOR 110% OF THE NUMBER OF GUESTS GUARANTEED. SHOULD THE NUMBER OF PERSONS EXCEED 110% OF THE GUARANTEED NUMBER, THE HOTEL WOULD BE UNABLE TO ENSURE CONSISTENCY IN THE QUALITY OF FOOD & SERVICES.",
                    "ANY ADDITION BEYOND THE EXPECTED NUMBER OF GUESTS WOULD ATTRACT AN ADDITIONAL CHARGE (SURCHARGE) OF 20% OF THE RATE APPLICABLE. ONLY AGAINST ADVANCE PAYMENT FOOD CAN BE SERVED TO EXTRA GUESTS.",
                    "IPRS OR PPL LICENSE WILL BE APPLICABLE ON (LIVE PERFORMANCES, D.J, SANGEET, DANCE, ETC). WITHOUT LICENSE, EVENT WILL NOT BE ENTERTAINED IN THE PREMISES. ALL LIABILITIES RELATED TO THE LICENSES ARE TO BE BORNE BY THE GUEST. THE HOTEL WILL NOT BE RESPONSIBLE FOR ANY LAPSES.",
                  ].map((term, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 6,
                        fontSize: 12,
                        color: "#111827",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "bold",
                          color: "#c3ad6b",
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}.
                      </span>
                      <span>{term}</span>
                    </li>
                  ))}
                </ol>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 32,
                    marginTop: 40,
                  }}
                >
                  {[
                    [
                      "Guest Signature",
                      "Name: ___________________",
                      "Date: ____________________",
                    ],
                    [
                      "Authorized Signatory",
                      "Buddha Avenue Banquet",
                      "Date: ____________________",
                    ],
                  ].map(([title, line1, line2]) => (
                    <div key={title} style={{ textAlign: "center" }}>
                      <div
                        style={{
                          borderTop: "2px solid #9ca3af",
                          paddingTop: 8,
                          marginTop: 48,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#374151",
                          }}
                        >
                          {title}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {line1}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {line2}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {generatingPDF && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl px-8 py-6 flex flex-col items-center gap-3 shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#c3ad6b]"></div>
            <p className="text-gray-700 font-medium">Generating PDF...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListBooking;
