import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { bookingAPI, menuAPI } from "../../services/api";
import { useReactToPrint } from "react-to-print";
import { motion } from "framer-motion";
import InvoiceDocument from "../../components/InvoiceDocument";
import {
  downloadInvoicePdf,
  invoiceFileName,
  shareInvoiceOnWhatsApp,
} from "../../utils/invoicePdf";

const Invoice = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuData, setMenuData] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
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

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current || !termsRef.current) return;
    setPdfLoading(true);
    try {
      await downloadInvoicePdf(
        [invoiceRef.current, termsRef.current],
        invoiceFileName(booking),
      );
    } catch {
      alert("Error generating PDF");
    } finally {
      setPdfLoading(false);
    }
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
            onClick={() => shareInvoiceOnWhatsApp(booking)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
          >
            📱 WhatsApp
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            📄 {pdfLoading ? "Generating..." : "Download PDF"}
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
        <InvoiceDocument
          booking={booking}
          menuData={menuData}
          invoiceRef={invoiceRef}
          termsRef={termsRef}
        />
      </div>
    </motion.div>
  );
};

export default Invoice;
