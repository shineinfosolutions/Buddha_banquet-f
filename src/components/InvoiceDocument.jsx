import Logo from "../assets/buddha avenue.png";
import WaterMark from "../assets/buddha avenue.png";
import TermsAndConditions from "./TermsAndConditions";
import { formatDateUTC } from "../utils/invoicePdf";

const MENU_SKIP_KEYS = [
  "_id",
  "bookingRef",
  "customerRef",
  "createdAt",
  "updatedAt",
  "__v",
];

// Invoice page + Terms page; invoiceRef/termsRef are captured separately for the PDF
const InvoiceDocument = ({ booking, menuData, invoiceRef, termsRef }) => {
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
    <>
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
                            !MENU_SKIP_KEYS.includes(key) &&
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
                                  (w) => w.charAt(0).toUpperCase() + w.slice(1),
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
                    <span className="font-semibold">Complimentary Rooms:</span>{" "}
                    {booking.complimentaryRooms} (FREE)
                  </p>
                  {booking.extraRooms > 0 && (
                    <>
                      <p>
                        <span className="font-semibold">Additional Rooms:</span>{" "}
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
    </>
  );
};

export default InvoiceDocument;
