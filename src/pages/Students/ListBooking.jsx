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
  FiXCircle,
  FiRotateCcw,
} from "react-icons/fi";
import { FaWhatsapp, FaList } from "react-icons/fa";
import { formatDateUTC, shareInvoiceOnWhatsApp } from "../../utils/invoicePdf";
import { motion, AnimatePresence } from "framer-motion";
import ChefPDFPreview from "../ChefPDFPreview";

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
  if (status === "Cancelled") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
};

const ListBooking = ({ setSidebarOpen }) => {
  const tableRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
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

  // Cancel a booking, or restore a cancelled one back to Confirmed/Tentative
  const handleCancelToggle = (item) => {
    const isCancelled = item.bookingStatus === "Cancelled";
    const totalAdvance = Array.isArray(item.advance)
      ? item.advance.reduce((sum, p) => sum + (p.amount || 0), 0)
      : Number(item.advance) || 0;
    const newStatus = isCancelled
      ? totalAdvance > 0
        ? "Confirmed"
        : "Tentative"
      : "Cancelled";
    const question = isCancelled
      ? `Restore ${item.name}'s booking as ${newStatus}?`
      : `Cancel ${item.name}'s booking?`;
    if (!window.confirm(question)) return;
    bookingAPI
      .update(item._id, {
        bookingStatus: newStatus,
        statusHistory: [
          { status: newStatus, changedAt: new Date().toISOString() },
        ],
      })
      .then(() => {
        fetchAllData();
        if (searchQuery.trim()) handleSearch();
        else fetchUsers();
      })
      .catch((err) =>
        alert(err.response?.data?.message || "Failed to update booking"),
      );
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
                            onClick={() => shareInvoiceOnWhatsApp(item)}
                            className="flex-1 min-w-[70px] inline-flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <FaWhatsapp size={11} /> WA
                          </button>
                          <button
                            onClick={() => handleCancelToggle(item)}
                            className="flex-1 min-w-[70px] inline-flex items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            {item.bookingStatus === "Cancelled" ? (
                              <>
                                <FiRotateCcw size={11} /> Restore
                              </>
                            ) : (
                              <>
                                <FiXCircle size={11} /> Cancel
                              </>
                            )}
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
                                  onClick={() => shareInvoiceOnWhatsApp(item)}
                                  className="inline-flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                                >
                                  <FaWhatsapp size={11} />
                                </button>
                                <button
                                  onClick={() => handleCancelToggle(item)}
                                  className="inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                                >
                                  {item.bookingStatus === "Cancelled" ? (
                                    <>
                                      <FiRotateCcw size={11} /> Restore
                                    </>
                                  ) : (
                                    <>
                                      <FiXCircle size={11} /> Cancel
                                    </>
                                  )}
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
    </div>
  );
};

export default ListBooking;
