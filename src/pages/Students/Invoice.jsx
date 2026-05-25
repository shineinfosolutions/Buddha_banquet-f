import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { bookingAPI, menuAPI } from "../../services/api";
import { useReactToPrint } from "react-to-print";
import { motion } from "framer-motion";
import Logo from "../../assets/buddha avenue.png";
import WaterMark from "../../assets/buddha avenue.png";
import TermsAndConditions from "../../components/TermsAndConditions";
import html2pdf from "html2pdf.js";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  if (opts.long) {
    const utcDate = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
    return `${opts.weekday ? weekdays[utcDate.getDay()] + ", " : ""}${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
};

const Invoice = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuData, setMenuData] = useState(null);
  const printRef = useRef();
  const invoiceRef = useRef();
  const termsRef = useRef();
  const navigate = useNavigate();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice_${booking?.name}_${booking?.startDate}`,
    pageStyle: `
      @page { size: A4; margin: 0.5in; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: sans-serif; }
    `,
  });

  const fetchMenuData = async (customerRef) => {
    if (!customerRef) return;
    try {
      const response = await menuAPI.getByCustomerRef(customerRef);
      if (response.data?.menu?.categories)
        setMenuData(response.data.menu.categories);
    } catch {}
  };

  const handleShare = () => {
    const message = `Hi ${booking.name}, here is your booking invoice from Buddha Avenue. Please use Ctrl+P (or Cmd+P on Mac) to print/save as PDF, then share the PDF file.`;
    window.open(
      `https://wa.me/${booking.whatsapp || booking.number}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
    setTimeout(() => window.print(), 500);
  };

  const handleSharePDF = async () => {
    if (!invoiceRef.current || !termsRef.current) return;
    const raw = String(booking.whatsapp || booking.number || "")
      .replace(/\D/g, "")
      .replace(/^0+/, "");
    const phone =
      raw.length === 10
        ? `91${raw}`
        : raw.length === 12 && raw.startsWith("91")
          ? raw
          : null;
    if (!phone) {
      alert("Invalid phone number.");
      return;
    }

    const patchAndCapture = async (element) => {
      const clone = element.cloneNode(true);
      clone.style.cssText =
        "position:fixed;top:0;left:0;width:794px;background:#fff;z-index:-9999;";

      // Fix watermark background-image to use absolute URL
      clone.querySelectorAll("*").forEach((el) => {
        const bg =
          el.style.backgroundImage ||
          window.getComputedStyle(el).backgroundImage;
        if (bg && bg.includes("url")) {
          const match = bg.match(/url\(["']?(.*?)["']?\)/);
          if (
            match &&
            match[1] &&
            !match[1].startsWith("data:") &&
            !match[1].startsWith("http")
          ) {
            el.style.backgroundImage = `url(${window.location.origin}${match[1].startsWith("/") ? "" : "/"}${match[1]})`;
          }
        }
      });

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

    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const addCanvasToPDF = (canvas, isFirst) => {
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let y = 0;
      while (y < imgHeight) {
        if (!isFirst || y > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -y, pageWidth, imgHeight);
        y += pageHeight;
      }
    };

    const canvas1 = await patchAndCapture(invoiceRef.current);
    addCanvasToPDF(canvas1, true);

    const canvas2 = await patchAndCapture(termsRef.current);
    addCanvasToPDF(canvas2, false);

    pdf.save(
      `Invoice_${booking.name}_${formatDateUTC(booking.startDate).replace(/\//g, "-")}.pdf`,
    );

    const msg = `Hi *${booking.name}*, please find your booking invoice attached above.\n\n📅 *Date:* ${formatDateUTC(booking.startDate, { long: true, weekday: true })}\n🏛️ *Hall:* ${booking.hall}\n👥 *Guests:* ${booking.pax} pax\n💰 *Total:* ₹${booking.total || grandTotal.toFixed(2)}\n🔴 *Balance Due:* ₹${booking.balance || 0}\n\n_Buddha Avenue Banquet, Medical Road, Gorakhpur_ 🙏`;
    setTimeout(
      () =>
        window.open(
          `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
          "_blank",
        ),
      1000,
    );
  };

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await bookingAPI.getAll();
        let allBookings = [];
        if (Array.isArray(response.data)) allBookings = response.data;
        else if (response.data?.data) allBookings = response.data.data;
        const bookingData = allBookings.find((b) => b._id === id);
        if (!bookingData) throw new Error("Booking not found");
        setBooking(bookingData);
        await fetchMenuData(bookingData.customerRef || bookingData._id);
      } catch {
        setError("Failed to load booking details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchBooking();
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c3ad6b] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          {error}
        </div>
      </div>
    );

  if (!booking)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          Booking not found.
        </div>
      </div>
    );

  const formatDate = (d) => formatDateUTC(d, { long: true });

  const pax = booking.pax || 0;
  const ratePerPax = booking.ratePerPax || 0;
  const gstPercent = Number(booking.gst) || 0;
  const decorationCharge = booking.decorationCharge || 0;
  const musicCharge = booking.musicCharge || 0;
  const extraRoomCharge = booking.extraRoomTotalPrice || 0;
  const discountPercent = booking.discount || 0;
  const baseRatePerPax =
    gstPercent > 0 ? ratePerPax / (1 + gstPercent / 100) : ratePerPax;
  const taxableFood = baseRatePerPax * pax;
  const taxableAmount =
    taxableFood + decorationCharge + musicCharge + extraRoomCharge;
  const discountAmount =
    discountPercent > 0 ? (taxableAmount * discountPercent) / 100 : 0;
  const taxableAfterDiscount = taxableAmount - discountAmount;
  const totalGST =
    gstPercent > 0 ? (taxableAfterDiscount * gstPercent) / 100 : 0;
  const cgst = totalGST / 2;
  const sgst = totalGST / 2;
  const grandTotal = taxableAfterDiscount + totalGST;
  const totalAdvance = Array.isArray(booking.advance)
    ? booking.advance.reduce((sum, adv) => sum + (adv.amount || 0), 0)
    : booking.advance || 0;

  const displayMenuData = menuData || booking.categorizedMenu;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen py-8 px-4 bg-gray-100"
    >
      {/* Action buttons - hidden on print */}
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-[#c3ad6b]/20 text-[#c3ad6b] rounded hover:bg-[#c3ad6b]/40 font-semibold"
        >
          ← Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
          >
            📱 WhatsApp
          </button>
          <button
            onClick={handleSharePDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800"
          >
            📄 Share PDF
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#c3ad6b] text-white rounded-lg font-semibold hover:bg-[#b39b5a]"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div ref={printRef} className="max-w-3xl mx-auto">
        {/* PAGE 1 */}
        <div
          ref={invoiceRef}
          className="bg-white shadow-lg relative overflow-hidden mb-0"
        >
          <img
            src={WaterMark}
            alt=""
            className="absolute pointer-events-none"
            style={{
              opacity: 0.12,
              width: "30%",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
          <div className="relative z-10">
            {/* Header */}
            <div className="bg-[#c3ad6b]/10 border-b border-[#c3ad6b]/30 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={Logo}
                  alt="Buddha Avenue"
                  className="w-20 h-20 object-contain"
                />
                <div>
                  <h1 className="text-xl font-bold text-gray-800">
                    Buddha Avenue Banquet
                  </h1>
                  <p className="text-sm text-gray-500">Booking Invoice</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Invoice Date</p>
                <p className="text-base font-semibold text-gray-700">
                  {formatDate(new Date())}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Customer & Booking Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-3">
                  <h3 className="text-sm font-bold text-[#c3ad6b] uppercase mb-2 border-b border-gray-100 pb-1">
                    Customer Details
                  </h3>
                  <div className="space-y-1 text-base text-gray-700">
                    <p>
                      <span className="font-semibold">Name:</span>{" "}
                      {booking.name}
                    </p>
                    <p>
                      <span className="font-semibold">Mobile:</span>{" "}
                      {booking.phone || booking.number}
                    </p>
                    {booking.email && (
                      <p>
                        <span className="font-semibold">Email:</span>{" "}
                        {booking.email}
                      </p>
                    )}
                    {booking.whatsapp && (
                      <p>
                        <span className="font-semibold">WhatsApp:</span>{" "}
                        {booking.whatsapp}
                      </p>
                    )}
                    {gstPercent > 0 && (
                      <p>
                        <span className="font-semibold">GST:</span> {gstPercent}
                        %
                      </p>
                    )}
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <h3 className="text-sm font-bold text-[#c3ad6b] uppercase mb-2 border-b border-gray-100 pb-1">
                    Booking Details
                  </h3>
                  <div className="space-y-1 text-base text-gray-700">
                    <p>
                      <span className="font-semibold">Date:</span>{" "}
                      {formatDate(booking.startDate)}
                    </p>
                    <p>
                      <span className="font-semibold">Time:</span>{" "}
                      {booking.time}
                    </p>
                    <p>
                      <span className="font-semibold">Hall:</span>{" "}
                      {booking.hall}
                    </p>
                    <p>
                      <span className="font-semibold">Guests:</span>{" "}
                      {booking.pax} pax
                    </p>
                    <p>
                      <span className="font-semibold">Status:</span>{" "}
                      {booking.bookingStatus}
                    </p>
                  </div>
                </div>
              </div>

              {/* Package Details */}
              <div className="border border-gray-200 rounded-lg p-3">
                <h3 className="text-sm font-bold text-[#c3ad6b] uppercase mb-2 border-b border-gray-100 pb-1">
                  Package Details
                </h3>
                <div className="grid grid-cols-2 gap-2 text-base text-gray-700 mb-3">
                  <p>
                    <span className="font-semibold">Rate Plan:</span>{" "}
                    {booking.ratePlan}
                  </p>
                  <p>
                    <span className="font-semibold">Food Type:</span>{" "}
                    {booking.foodType}
                  </p>
                  <p>
                    <span className="font-semibold">Rate per Pax:</span> ₹
                    {ratePerPax}
                  </p>
                  <p>
                    <span className="font-semibold">Meal Plan:</span>{" "}
                    {booking.mealPlan || "Without Breakfast"}
                  </p>
                </div>
                {displayMenuData &&
                  typeof displayMenuData === "object" &&
                  Object.keys(displayMenuData).length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-1">
                        Menu Items ({booking.foodType})
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-gray-700">
                        {Object.entries(displayMenuData)
                          .filter(
                            ([key, items]) =>
                              ![
                                "_id",
                                "bookingRef",
                                "customerRef",
                                "createdAt",
                                "updatedAt",
                                "__v",
                              ].includes(key) &&
                              Array.isArray(items) &&
                              items.length > 0,
                          )
                          .map(([category, items]) => (
                            <p key={category}>
                              <span className="font-bold text-gray-800">
                                {category
                                  .replaceAll("_", " ")
                                  .split(" ")
                                  .map(
                                    (w) =>
                                      w.charAt(0).toUpperCase() + w.slice(1),
                                  )
                                  .join(" ")}
                                :{" "}
                              </span>
                              {items.join(", ")}
                            </p>
                          ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* Room Details */}
              {booking.complimentaryRooms > 0 && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <h3 className="text-sm font-bold text-[#c3ad6b] uppercase mb-2 border-b border-gray-100 pb-1">
                    Room Details
                  </h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>
                      <span className="font-semibold">
                        Complimentary Rooms:
                      </span>{" "}
                      {booking.complimentaryRooms} (FREE)
                    </p>
                    {booking.extraRooms > 0 && (
                      <>
                        <p>
                          <span className="font-semibold">
                            Additional Rooms:
                          </span>{" "}
                          {booking.extraRooms}
                        </p>
                        <p>
                          <span className="font-semibold">Room Price:</span> ₹
                          {booking.roomPricePerUnit} per room
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Summary */}
              <div className="border border-gray-200 rounded-lg p-3">
                <h3 className="text-sm font-bold text-[#c3ad6b] uppercase mb-2 border-b border-gray-100 pb-1">
                  Payment Summary
                </h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <div className="flex justify-between">
                    <span>
                      Food ({pax} pax × ₹{baseRatePerPax.toFixed(2)})
                    </span>
                    <span>₹{taxableFood.toFixed(2)}</span>
                  </div>
                  {decorationCharge > 0 && (
                    <div className="flex justify-between">
                      <span>Decoration Charge</span>
                      <span>₹{decorationCharge}</span>
                    </div>
                  )}
                  {musicCharge > 0 && (
                    <div className="flex justify-between">
                      <span>Music Charge</span>
                      <span>₹{musicCharge}</span>
                    </div>
                  )}
                  {extraRoomCharge > 0 && (
                    <div className="flex justify-between">
                      <span>Additional Rooms</span>
                      <span>₹{extraRoomCharge}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({discountPercent}%)</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t border-gray-200 pt-1 mt-1">
                    <span>Taxable Amount</span>
                    <span>₹{taxableAfterDiscount.toFixed(2)}</span>
                  </div>
                  {gstPercent > 0 && (
                    <>
                      <div className="flex justify-between text-gray-500">
                        <span>CGST ({gstPercent / 2}%)</span>
                        <span>₹{cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>SGST ({gstPercent / 2}%)</span>
                        <span>₹{sgst.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-gray-300 pt-2 mt-1 space-y-1">
                    <div className="flex justify-between font-bold text-base">
                      <span>Total Amount</span>
                      <span className="text-[#c3ad6b]">
                        ₹{grandTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Advance Paid</span>
                      <span>₹{totalAdvance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-red-600">
                      <span>Balance Due</span>
                      <span>₹{booking.balance || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {booking.notes && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <h3 className="text-sm font-bold text-[#c3ad6b] uppercase mb-1">
                    Special Notes
                  </h3>
                  <p className="text-sm text-gray-700">{booking.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-sm text-gray-500 border-t border-gray-200 pt-3">
                <p>Thank you for choosing Buddha Avenue Banquet!</p>
              </div>
            </div>
          </div>
        </div>

        {/* PAGE 2 - Terms & Conditions */}
        <div ref={termsRef}>
          <TermsAndConditions />
        </div>
      </div>
    </motion.div>
  );
};

export default Invoice;
