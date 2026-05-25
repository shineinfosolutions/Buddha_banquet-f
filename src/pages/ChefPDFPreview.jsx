import React, { useState, useRef } from "react";
import api from "../services/api";
import { useReactToPrint } from "react-to-print";
import Logo from "../assets/buddha avenue.png";
import WaterMark from "../assets/buddha avenue.png";
import { FiX, FiPrinter } from "react-icons/fi";

const SKIP_KEYS = [
  "_id",
  "createdAt",
  "updatedAt",
  "__v",
  "bookingRef",
  "customerRef",
];

// Safe UTC-based date formatter — avoids timezone shift (dates stored as UTC midnight in MongoDB)
const formatDateUTC = (dateStr, opts = {}) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
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
  if (opts.long) {
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
};

const ChefPDFPreview = ({ booking, className }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef();

  const fetchMenuData = async () => {
    setLoading(true);
    try {
      if (
        booking.categorizedMenu &&
        Object.keys(booking.categorizedMenu).length > 0
      ) {
        setMenuData(booking.categorizedMenu);
        return;
      }
      for (const endpoint of [
        `/api/menus/all/${booking.customerRef || booking._id}`,
        `/api/menus/${booking._id}`,
      ]) {
        try {
          const res = await api.get(endpoint);
          const data =
            res.data?.menu?.categories ||
            res.data?.data?.categories ||
            res.data?.categories ||
            res.data?.data;
          if (data && Object.keys(data).length > 0) {
            setMenuData(data);
            return;
          }
        } catch {
          continue;
        }
      }
      setMenuData(booking.categorizedMenu || {});
    } catch {
      setMenuData(booking.categorizedMenu || {});
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    await fetchMenuData();
    setShowPreview(true);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Chef_${booking.name}_${formatDateUTC(booking.startDate).replace(/\//g, "-")}`,
    pageStyle: `@page { size: A4; margin: 0.5in; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`,
  });

  const displayMenu = menuData || booking.categorizedMenu;
  const menuEntries = displayMenu
    ? Object.entries(displayMenu).filter(
        ([k, v]) => !SKIP_KEYS.includes(k) && Array.isArray(v) && v.length > 0,
      )
    : [];

  return (
    <>
      <button
        onClick={handlePreview}
        className={`inline-flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-800 text-white rounded-lg transition-colors font-semibold px-2 py-1 ${className || ""}`}
        title="Chef Instructions"
      >
        🍽️ Chef
      </button>

      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#c3ad6b] px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={Logo}
                  alt="Buddha Avenue"
                  className="w-10 h-10 object-contain bg-white/20 rounded-full p-1"
                />
                <div>
                  <h3 className="text-white font-bold text-lg">
                    Chef Instructions
                  </h3>
                  <p className="text-white/80 text-sm">
                    {booking.name} —{" "}
                    {formatDateUTC(booking.startDate, { long: true })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#c3ad6b] rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <FiPrinter size={14} /> Print / PDF
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 bg-gray-50 p-6">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#c3ad6b] mr-3"></div>
                  <span className="text-gray-500 font-medium">
                    Loading menu...
                  </span>
                </div>
              ) : (
                <div
                  ref={printRef}
                  className="bg-white rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="relative">
                    <img
                      src={WaterMark}
                      alt=""
                      className="absolute pointer-events-none"
                      style={{
                        opacity: 0.08,
                        width: "35%",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                    <div className="relative z-10">
                      {/* Print Header */}
                      <div className="bg-[#c3ad6b]/10 border-b border-[#c3ad6b]/30 px-8 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={Logo}
                            alt="Buddha Avenue"
                            className="w-16 h-16 object-contain"
                          />
                          <div>
                            <h1 className="text-xl font-bold text-gray-800">
                              Buddha Avenue Banquet
                            </h1>
                            <p className="text-sm text-[#c3ad6b] font-semibold uppercase tracking-widest">
                              Chef Instructions Sheet
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400 uppercase tracking-wide">
                            Prepared On
                          </p>
                          <p className="text-sm font-semibold text-gray-700">
                            {new Date().toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="px-8 py-6 space-y-5">
                        {/* Booking Details */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="text-sm font-bold text-[#c3ad6b] uppercase mb-3 border-b border-gray-100 pb-2">
                            Booking Details
                          </h3>
                          <div className="grid grid-cols-4 gap-3">
                            {[
                              ["Customer", booking.name],
                              [
                                "Date",
                                (() => {
                                  const d = new Date(booking.startDate);
                                  if (isNaN(d.getTime())) return "";
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
                                  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
                                })(),
                              ],
                              ["Time", booking.time || "TBC"],
                              ["Guests (Pax)", booking.pax],
                              ["Food Type", booking.foodType],
                              ["Rate Plan", booking.ratePlan],
                              ["Hall", booking.hall],
                              ["Status", booking.bookingStatus],
                            ].map(([label, value]) => (
                              <div
                                key={label}
                                className="bg-[#c3ad6b]/5 rounded-lg p-2 border border-[#c3ad6b]/20"
                              >
                                <p className="text-xs text-[#c3ad6b] font-semibold uppercase tracking-wide mb-0.5">
                                  {label}
                                </p>
                                <p className="text-gray-800 font-semibold text-sm">
                                  {value || "N/A"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="text-sm font-bold text-[#c3ad6b] uppercase mb-3 border-b border-gray-100 pb-2">
                            Menu Items to Prepare
                          </h3>
                          {menuEntries.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                              {menuEntries.map(([category, items]) => (
                                <div
                                  key={category}
                                  className="border border-gray-200 rounded-lg overflow-hidden"
                                >
                                  <div className="bg-gray-800 px-3 py-2 flex items-center justify-between">
                                    <h4 className="text-white font-bold text-sm uppercase tracking-wide">
                                      {category
                                        .replaceAll("_", " ")
                                        .split(" ")
                                        .map(
                                          (w) =>
                                            w.charAt(0).toUpperCase() +
                                            w.slice(1),
                                        )
                                        .join(" ")}
                                    </h4>
                                    <span className="bg-[#c3ad6b] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                      {items.length}
                                    </span>
                                  </div>
                                  <ul className="p-3 space-y-1.5 bg-white">
                                    {items.map((item, i) => (
                                      <li
                                        key={i}
                                        className="flex items-start gap-2 text-sm text-gray-700"
                                      >
                                        <span className="w-5 h-5 bg-[#c3ad6b]/20 text-[#c3ad6b] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                          {i + 1}
                                        </span>
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center py-8 text-gray-400">
                              No menu items available
                            </p>
                          )}
                        </div>

                        {/* Notes */}
                        {booking.notes && (
                          <div className="border border-[#c3ad6b]/30 bg-[#c3ad6b]/5 rounded-lg p-3">
                            <p className="text-xs font-bold text-[#c3ad6b] uppercase mb-1">
                              Special Notes
                            </p>
                            <p className="text-gray-700 text-sm">
                              {booking.notes}
                            </p>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-3">
                          Buddha Avenue Banquet — Chef Copy —{" "}
                          {new Date().toLocaleDateString("en-IN")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChefPDFPreview;
