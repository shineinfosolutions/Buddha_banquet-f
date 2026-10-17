import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { bookingAPI } from "../../services/api";
import InvoiceDocument from "../../components/InvoiceDocument";
import { downloadInvoicePdf, invoiceFileName } from "../../utils/invoicePdf";

// Public invoice page opened by the customer from the WhatsApp link (no login needed)
const SharedInvoice = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const invoiceRef = useRef();
  const termsRef = useRef();

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await bookingAPI.getById(id);
        // getById replaces categorizedMenu with the linked Menu document
        const { categorizedMenu, ...bookingData } = res.data;
        setBooking(bookingData);
        setMenuData(categorizedMenu?.categories || null);
      } catch {
        setError("Invoice not found or could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchBooking();
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current || !termsRef.current) return;
    setPdfLoading(true);
    try {
      await downloadInvoicePdf(
        [invoiceRef.current, termsRef.current],
        invoiceFileName(booking),
      );
    } catch {
      alert("Error generating PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c3ad6b] mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading invoice...</p>
        </div>
      </div>
    );

  if (error || !booking)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="bg-red-100 border-l-4 border-[#c3ad6b] text-[#c3ad6b] p-4 max-w-md rounded shadow">
          <p className="font-bold">Error</p>
          <p>{error || "Invoice not found."}</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 py-4 px-2 sm:py-8 sm:px-4">
      <div className="max-w-3xl mx-auto mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">
            Buddha Avenue Banquet
          </h1>
          <p className="text-sm text-gray-500">Invoice for {booking.name}</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={pdfLoading}
          className="w-full sm:w-auto px-6 py-3 bg-[#c3ad6b] hover:bg-[#b39b5a] disabled:opacity-60 text-white rounded-lg font-semibold shadow"
        >
          📄 {pdfLoading ? "Generating PDF..." : "Download PDF"}
        </button>
      </div>

      {/* Fixed width so the invoice looks the same on phones as in the PDF */}
      <div className="overflow-x-auto">
        <div className="mx-auto" style={{ width: 768, maxWidth: "none" }}>
          <InvoiceDocument
            booking={booking}
            menuData={menuData}
            invoiceRef={invoiceRef}
            termsRef={termsRef}
          />
        </div>
      </div>
    </div>
  );
};

export default SharedInvoice;
