import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import api from "../../services/api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Logo from "../../assets/buddha avenue.png";

const SharedInvoice = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const invoiceRef = useRef();

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await api.get(`/api/banquet-bookings/${id}`);
        setBooking(res.data);
      } catch (error) {
        setError("Failed to load booking details. Please try again later.");
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
          <p className="text-gray-600 text-lg">Loading invoice...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-100 border-l-4 border-[#c3ad6b] text-[#c3ad6b] p-4 max-w-md rounded shadow">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );

  if (!booking)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-yellow-100 border-l-4 border-[#c3ad6b] text-[#c3ad6b] p-4 max-w-md rounded shadow">
          <p className="font-bold">Not Found</p>
          <p>No booking found with this ID.</p>
        </div>
      </div>
    );

  const formatDate = (dateString) => {
    if (!dateString) return "";
    // Always use UTC date parts to avoid timezone shift (date stored as UTC midnight)
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const day = date.getUTCDate();
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
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
    return `${day} ${months[month]} ${year}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const generatePDF = async () => {
    setPdfLoading(true);
    try {
      const element = invoiceRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      return pdf;
    } catch (error) {
      alert("Error generating PDF");
      return null;
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const pdf = await generatePDF();
    if (pdf) {
      pdf.save(`Invoice_${booking.name}_${booking.startDate}.pdf`);
    }
  };

  const handleShareWhatsApp = async () => {
    const pdf = await generatePDF();
    if (pdf) {
      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Create a temporary link to download the PDF
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `Invoice_${booking.name}_${booking.startDate}.pdf`;
      link.click();

      // Open WhatsApp with message
      const message = `Hi ${booking.name}, here is your booking invoice from Buddha Avenue. Please find the PDF attachment.`;
      const whatsappUrl = `https://wa.me/${booking.whatsapp || booking.number}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");

      // Clean up
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 print:py-0 print:px-0 print:bg-white">
      <div className="max-w-4xl mx-auto print:max-w-none">
        <div
          ref={invoiceRef}
          className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#f7f5ef] to-[#c3ad6b]/30 px-8 py-6 print:bg-white print:px-4 print:py-3">
            <div className="flex items-center justify-between print:flex-row">
              <div className="flex flex-col items-center space-y-2 print:flex-row print:space-y-0 print:space-x-4">
                <img
                  src={Logo}
                  alt="Buddha Avenue"
                  className="w-24 h-24 object-contain rounded-lg print:w-16 print:h-16"
                />
                <p className="text-gray-600 text-center print:text-lg print:font-semibold print:text-black">
                  Booking Invoice
                </p>
              </div>
              <div className="text-right space-y-2 print:space-y-1">
                <div className="print:hidden flex gap-2 mb-2">
                  <button
                    onClick={handleShareWhatsApp}
                    disabled={pdfLoading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                  >
                    📱 {pdfLoading ? "Generating..." : "Share PDF on WhatsApp"}
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={pdfLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    📄 Download PDF
                  </button>
                  <button
                    onClick={handlePrint}
                    className="bg-[#c3ad6b] hover:bg-[#b39c5a] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    🖨️ Print
                  </button>
                </div>
                <div>
                  <p className="text-sm text-gray-600 print:text-xs print:text-black">
                    Invoice Date
                  </p>
                  <p className="font-semibold print:text-sm">
                    {formatDate(new Date())}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Content */}
          <div className="px-8 py-6 print:px-4 print:py-3">
            {/* Customer & Booking Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:grid-cols-2 print:gap-4 print:mb-4">
              {/* Customer Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2 print:text-sm print:mb-2 print:pb-1">
                  Customer Details
                </h3>
                <div className="space-y-2 print:space-y-1">
                  <p className="print:text-xs">
                    <span className="font-medium">Name:</span> {booking.name}
                  </p>
                  <p className="print:text-xs">
                    <span className="font-medium">Mobile:</span>{" "}
                    {booking.number}
                  </p>
                  {booking.email && (
                    <p className="print:text-xs">
                      <span className="font-medium">Email:</span>{" "}
                      {booking.email}
                    </p>
                  )}
                  {booking.whatsapp && (
                    <p className="print:text-xs">
                      <span className="font-medium">WhatsApp:</span>{" "}
                      {booking.whatsapp}
                    </p>
                  )}
                </div>
              </div>

              {/* Booking Details */}
              <div className="text-right">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2 print:text-sm print:mb-2 print:pb-1">
                  Booking Details
                </h3>
                <div className="space-y-2 print:space-y-1">
                  <p className="print:text-xs">
                    <span className="font-medium">Date:</span>{" "}
                    {formatDate(booking.startDate)}
                  </p>
                  <p className="print:text-xs">
                    <span className="font-medium">Time:</span> {booking.time}
                  </p>
                  <p className="print:text-xs">
                    <span className="font-medium">Hall:</span> {booking.hall}
                  </p>
                  <p className="print:text-xs">
                    <span className="font-medium">Guests:</span> {booking.pax}{" "}
                    pax
                  </p>
                  <p className="print:text-xs">
                    <span className="font-medium">Status:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs font-semibold print:px-1 print:py-0 print:text-xs ${
                        booking.bookingStatus === "Confirmed"
                          ? "bg-green-100 text-green-800 print:bg-transparent print:text-black"
                          : booking.bookingStatus === "Tentative"
                            ? "bg-yellow-100 text-yellow-800 print:bg-transparent print:text-black"
                            : "bg-gray-100 text-gray-800 print:bg-transparent print:text-black"
                      }`}
                    >
                      {booking.bookingStatus}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Package Details */}
            <div className="mb-8 print:mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2 print:text-sm print:mb-2 print:pb-1">
                Package Details
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 print:bg-white print:border print:border-gray-300 print:p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4">
                  <div>
                    <p className="font-medium text-gray-600 print:text-xs">
                      Rate Plan
                    </p>
                    <p className="text-lg font-semibold text-[#c3ad6b] print:text-xs print:text-black">
                      {booking.ratePlan}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600 print:text-xs">
                      Rate per Pax
                    </p>
                    <p className="text-lg font-semibold text-[#c3ad6b] print:text-xs print:text-black">
                      ₹{booking.ratePerPax}
                    </p>
                  </div>
                </div>
                <div className="mt-4 print:mt-2">
                  <p className="font-medium text-gray-600 mb-3 print:text-xs print:mb-1">
                    Selected Menu Items ({booking.foodType})
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-3 print:gap-1">
                    {booking.categorizedMenu ? (
                      Object.entries(booking.categorizedMenu)
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
                          <div
                            key={category}
                            className="bg-white rounded-lg p-2 border border-gray-200 print:border-gray-400 print:p-1"
                          >
                            <h4 className="font-medium text-[#c3ad6b] mb-1 text-xs print:text-black print:text-xs">
                              {category
                                .replaceAll("_", " ")
                                .split(" ")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() +
                                    word.slice(1),
                                )
                                .join(" ")}
                            </h4>
                            <div className="text-xs text-gray-600 print:text-xs print:text-black">
                              {items.join(", ")}
                            </div>
                          </div>
                        ))
                    ) : (
                      <span className="text-gray-500 text-sm italic print:text-xs print:text-black">
                        No menu items selected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Room Details */}
            {booking.complimentaryRooms > 0 && (
              <div className="mb-8 print:mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2 print:text-sm print:mb-2 print:pb-1">
                  Room Details
                </h3>
                <div className="bg-green-50 rounded-lg p-4 print:bg-white print:border print:border-gray-300 print:p-2">
                  <p className="print:text-xs">
                    <span className="font-medium">Complimentary Rooms:</span>{" "}
                    {booking.complimentaryRooms} (FREE)
                  </p>
                  {booking.extraRooms > 0 && (
                    <>
                      <p className="print:text-xs">
                        <span className="font-medium">Additional Rooms:</span>{" "}
                        {booking.extraRooms}
                      </p>
                      <p className="print:text-xs">
                        <span className="font-medium">Room Price:</span> ₹
                        {booking.roomPricePerUnit} per room
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div className="mb-8 print:mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2 print:text-sm print:mb-2 print:pb-1">
                Payment Summary
              </h3>
              <div className="bg-gray-50 rounded-lg p-6 print:bg-white print:border print:border-gray-300 print:p-3">
                <div className="space-y-3 print:space-y-1">
                  <div className="flex justify-between print:text-xs">
                    <span>
                      Subtotal ({booking.pax} pax × ₹{booking.ratePerPax})
                    </span>
                    <span>
                      ₹{(booking.pax * booking.ratePerPax).toFixed(2)}
                    </span>
                  </div>
                  {booking.discount > 0 && (
                    <div className="flex justify-between text-green-600 print:text-xs print:text-black">
                      <span>Discount ({booking.discount}%)</span>
                      <span>
                        -₹
                        {(() => {
                          const subtotal = booking.pax * booking.ratePerPax;
                          const discountAmount =
                            (subtotal * booking.discount) / 100;
                          return discountAmount.toFixed(2);
                        })()}
                      </span>
                    </div>
                  )}
                  {booking.decorationCharge > 0 && (
                    <div className="flex justify-between print:text-xs">
                      <span>Decoration Charge</span>
                      <span>₹{booking.decorationCharge}</span>
                    </div>
                  )}
                  {booking.musicCharge > 0 && (
                    <div className="flex justify-between print:text-xs">
                      <span>Music Charge</span>
                      <span>₹{booking.musicCharge}</span>
                    </div>
                  )}
                  {booking.extraRoomTotalPrice > 0 && (
                    <div className="flex justify-between print:text-xs">
                      <span>Additional Rooms</span>
                      <span>₹{booking.extraRoomTotalPrice}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-3 print:pt-1">
                    <div className="flex justify-between text-lg font-semibold print:text-sm">
                      <span>Total Amount</span>
                      <span className="text-[#c3ad6b] print:text-black">
                        ₹{booking.total}
                      </span>
                    </div>
                    <div className="flex justify-between text-green-600 print:text-xs print:text-black">
                      <span>Advance Paid</span>
                      <span>₹{booking.advance || 0}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-red-600 print:text-sm print:text-black">
                      <span>Balance Due</span>
                      <span>₹{booking.balance || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="mb-8 print:mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2 print:text-sm print:mb-2 print:pb-1">
                  Special Notes
                </h3>
                <div className="bg-blue-50 rounded-lg p-4 print:bg-white print:border print:border-gray-300 print:p-2">
                  <p className="text-gray-700 print:text-xs print:text-black">
                    {booking.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-200 pt-6 text-center text-sm text-gray-600 print:pt-3 print:text-xs print:text-black">
              <p className="mb-2 print:mb-1">
                Thank you for choosing Buddha Avenue!
              </p>
              <p>For any queries, please contact us at your convenience.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedInvoice;
