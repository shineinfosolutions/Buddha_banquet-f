import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const MONTHS = [
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
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Safe UTC-based date formatter — avoids timezone shift (dates stored as UTC midnight in MongoDB)
export const formatDateUTC = (dateStr, opts = {}) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  if (opts.long) {
    const weekday = opts.weekday ? WEEKDAYS[d.getUTCDay()] + ", " : "";
    return `${weekday}${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
};

// html2canvas can't parse Tailwind v4's oklch/oklab colors, so capture a patched clone
const captureElement = async (element) => {
  const clone = element.cloneNode(true);
  clone.style.cssText =
    "position:fixed;top:0;left:0;width:794px;background:#fff;z-index:-9999;";

  // Fix watermark background-image to use absolute URL
  clone.querySelectorAll("*").forEach((el) => {
    const bg =
      el.style.backgroundImage || window.getComputedStyle(el).backgroundImage;
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

  try {
    return await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: 794,
      windowWidth: 794,
    });
  } finally {
    document.body.removeChild(clone);
  }
};

// Each element starts on a new A4 page; tall elements spill over onto extra pages
export const downloadInvoicePdf = async (elements, fileName) => {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < elements.length; i++) {
    const canvas = await captureElement(elements[i]);
    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    for (let y = 0; y < imgHeight; y += pageHeight) {
      if (i > 0 || y > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, -y, pageWidth, imgHeight);
    }
  }

  pdf.save(fileName);
};

export const invoiceFileName = (booking) =>
  `Invoice_${booking.name}_${formatDateUTC(booking.startDate).replace(/\//g, "-")}.pdf`;

// Public page (no login) where the customer can view and download the invoice
export const sharedInvoiceUrl = (bookingId) =>
  `${window.location.origin}/share/invoice/${bookingId}`;

const toWhatsAppPhone = (booking) => {
  const raw = String(booking.whatsapp || booking.number || "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");
  if (raw.length === 10) return `91${raw}`;
  if (raw.length === 12 && raw.startsWith("91")) return raw;
  return null;
};

export const shareInvoiceOnWhatsApp = (booking) => {
  const phone = toWhatsAppPhone(booking);
  if (!phone) {
    alert("Invalid phone number.");
    return;
  }
  const msg = `Hi *${booking.name}*, thank you for booking with Buddha Avenue Banquet.\n\n📅 *Date:* ${formatDateUTC(booking.startDate, { long: true, weekday: true })}\n🏛️ *Hall:* ${booking.hall || "-"}\n👥 *Guests:* ${booking.pax} pax\n💰 *Total:* ₹${booking.total ?? 0}\n🔴 *Balance Due:* ₹${booking.balance ?? 0}\n\n📄 *View & download your invoice (PDF):*\n${sharedInvoiceUrl(booking._id)}\n\n_Buddha Avenue Banquet, Medical Road, Gorakhpur_ 🙏`;
  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
    "_blank",
  );
};
