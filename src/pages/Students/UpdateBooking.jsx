import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { bookingAPI, menuAPI } from "../../services/api";
import { motion } from "framer-motion";
import {
  FaUser,
  FaPhone,
  FaCalendarAlt,
  FaUsers,
  FaMoneyBillWave,
  FaUtensils,
  FaBuilding,
  FaInfoCircle,
  FaArrowLeft,
  FaSave,
  FaEnvelope,
  FaRupeeSign,
  FaPlus,
  FaTrash,
  FaList,
} from "react-icons/fa";
import MenuSelector from "../Menu/MenuSelector"; // Import your MenuSelector component

const UpdateBooking = () => {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id;
  const role = localStorage.getItem("role");
  const [booking, setBooking] = useState({
    name: "",
    email: "",
    number: "",
    whatsapp: "",
    pax: 1,
    startDate: "",
    hall: "",
    time: "",
    bookingStatus: "Tentative",
    statusHistory: [
      {
        status: "Tentative",
        type: false,
        changedAt: new Date().toISOString(),
      },
    ],
    ratePlan: "",
    useCustomPrice: false,
    customPlatePrice: "",
    showRatePerPax: false,
    roomOption: "complimentary",
    complimentaryRooms: 2,

    advance: [],
    total: 0,
    balance: 0,
    advanceHistory: [],
    ratePerPax: 0,
    foodType: "Veg",
    menuItems: [],
    notes: "",
    discount: "",
    decorationCharge: "",
    musicCharge: "",
    hasDecoration: false,
    hasMusic: false,
    statusChangedAt: null, // Track when status changes
    staffEditCount: 0, // Added for staff edit limit logic
    paymentMethod: "cash", // Payment method
    transactionId: "", // Transaction ID for online payments
    mealPlan: "Without Breakfast", // Meal plan option
  });

  const [showMenuModal, setShowMenuModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);

  // Mock WebSocket for now
  const sendMessage = () => {};

  // Staff edit limit logic (frontend) - define at component level so it's available in JSX
  const isStaffEditLimitReached =
    booking.staffEditCount >= 2 && role !== "Admin";

  // --- RATE CONFIGURATION (copy from AddBooking) ---
  const RATE_CONFIG = {
    Veg: {
      Silver: {
        basePrice: 1050,
        taxPercent: 18,
      },
      Gold: {
        basePrice: 1250,
        taxPercent: 18,
      },
      Platinum: {
        basePrice: 1899,
        taxPercent: 18,
      },
    },
    "Non-Veg": {
      Silver: {
        basePrice: 1599,
        taxPercent: 18,
      },
      Gold: {
        basePrice: 1899,
        taxPercent: 18,
      },
      Platinum: {
        basePrice: 2299,
        taxPercent: 18,
      },
    },
  };

  // Calculate total when any relevant field changes
  useEffect(() => {
    if (booking.pax && booking.ratePerPax) {
      const paxNum = parseInt(booking.pax) || 0;
      const ratePerPax = parseFloat(booking.ratePerPax) || 0;
      const foodTotal = ratePerPax * paxNum;

      // Add decoration and music charges
      const decorationCharge = booking.hasDecoration
        ? parseFloat(booking.decorationCharge) || 0
        : 0;
      const musicCharge = booking.hasMusic
        ? parseFloat(booking.musicCharge) || 0
        : 0;
      const total = foodTotal + decorationCharge + musicCharge;

      setBooking((prev) => ({
        ...prev,
        total: total.toFixed(2),
      }));
    }
  }, [
    booking.pax,
    booking.ratePerPax,
    booking.decorationCharge,
    booking.musicCharge,
    booking.hasDecoration,
    booking.hasMusic,
  ]);

  // Calculate room price when rooms change
  useEffect(() => {
    const roomsValue = parseInt(booking.rooms);
    if (!isNaN(roomsValue) && roomsValue > 2) {
      const extraRooms = roomsValue - 2;
      const pricePerUnit =
        booking.roomPricePerUnit === "" || isNaN(booking.roomPricePerUnit)
          ? 0
          : parseFloat(booking.roomPricePerUnit);
      const extraRoomTotalPrice = extraRooms * pricePerUnit;
      setBooking((prev) => ({
        ...prev,
        extraRoomTotalPrice,
        roomPrice: extraRoomTotalPrice, // Keep roomPrice for backward compatibility
      }));
    } else {
      setBooking((prev) => ({
        ...prev,
        extraRoomTotalPrice: 0,
        roomPrice: 0,
      }));
    }
  }, [booking.rooms, booking.roomPricePerUnit]);

  // Auto-calculate balance and update status if advance is paid
  useEffect(() => {
    const totalAdvance = booking.advance.reduce(
      (sum, adv) => sum + (parseFloat(adv.amount) || 0),
      0,
    );
    const total = parseFloat(booking.total) || 0;
    const balance = total - totalAdvance;
    let newStatus = booking.bookingStatus;
    let statusBool = booking.status;
    if (totalAdvance > 0) {
      newStatus = "Confirmed";
      statusBool = true;
    } else {
      newStatus = "Tentative";
      statusBool = false;
    }
    setBooking((prev) => ({
      ...prev,
      balance: balance.toFixed(2),
      bookingStatus: newStatus,
      status: statusBool,
      statusChangedAt: new Date().toISOString(),
      statusHistory: [
        ...(Array.isArray(prev.statusHistory) ? prev.statusHistory : []),
        {
          status: newStatus,
          type: statusBool,
          changedAt: new Date().toISOString(),
        },
      ],
    }));
  }, [booking.advance, booking.total]);

  // Add advance payment
  const addAdvancePayment = () => {
    setBooking((prev) => ({
      ...prev,
      advance: [
        ...prev.advance,
        {
          amount: 0,
          date: new Date(),
          method: "cash",
          remarks: "",
        },
      ],
    }));
  };

  // Update advance payment
  const updateAdvancePayment = (index, field, value) => {
    setBooking((prev) => ({
      ...prev,
      advance: prev.advance.map((adv, i) =>
        i === index ? { ...adv, [field]: value } : adv,
      ),
    }));
  };

  // Remove advance payment
  const removeAdvancePayment = (index) => {
    setBooking((prev) => ({
      ...prev,
      advance: prev.advance.filter((_, i) => i !== index),
    }));
  };

  // Fetch booking details when component loads
  useEffect(() => {
    fetchBookingDetail();
  }, [id]);

  const fetchBookingDetail = async () => {
    try {
      // Fetch booking data
      const bookingResponse = await bookingAPI.getById(id);

      // Fetch associated menu data
      let categorizedMenu = null;
      try {
        const menuResponse = await menuAPI.getByBookingId(id);
        const rawMenuData =
          menuResponse.data?.data || menuResponse.data || null;
        categorizedMenu = rawMenuData?.categories || rawMenuData || null;
      } catch (menuErr) {
        // No menu found for this booking
      }

      if (bookingResponse.data) {
        const bookingData = bookingResponse.data.data || bookingResponse.data;

        // Flatten all items from categorizedMenu into a single array
        const menuItems = categorizedMenu
          ? Object.entries(categorizedMenu)
              .filter(
                ([key]) =>
                  ![
                    "_id",
                    "bookingRef",
                    "createdAt",
                    "updatedAt",
                    "__v",
                    "customerRef",
                  ].includes(key),
              )
              .map(([, arr]) => arr)
              .flat()
              .filter((item) => typeof item === "string")
          : [];

        const formatDate = (date) => {
          if (!date) return "";
          try {
            const d = new Date(date);
            return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
          } catch {
            return "";
          }
        };

        // Ensure statusHistory exists and is an array
        let statusHistory =
          Array.isArray(bookingData.statusHistory) &&
          bookingData.statusHistory.length > 0
            ? bookingData.statusHistory
            : [
                {
                  status: bookingData.bookingStatus || "Tentative",
                  changedAt:
                    bookingData.statusChangedAt || new Date().toISOString(),
                },
              ];

        // Check if this is a custom rate - compare stored rate with RATE_CONFIG
        const hasCustomRate =
          bookingData.ratePlan &&
          bookingData.ratePerPax &&
          RATE_CONFIG[bookingData.foodType] &&
          RATE_CONFIG[bookingData.foodType][bookingData.ratePlan] &&
          Number(bookingData.ratePerPax) !==
            RATE_CONFIG[bookingData.foodType][bookingData.ratePlan].basePrice;

        // Use numbers for calculation fields, empty string if missing
        // Ensure staffEditCount is loaded from backend if present, else default to 0
        const formattedData = {
          ...bookingData,
          startDate: formatDate(bookingData.startDate),
          menuItems,
          categorizedMenu,
          useCustomPrice: hasCustomRate || bookingData.useCustomPrice || false,
          customPlatePrice: hasCustomRate
            ? String(bookingData.ratePerPax)
            : bookingData.customPlatePrice || "",
          pax:
            bookingData.pax !== undefined &&
            bookingData.pax !== null &&
            bookingData.pax !== ""
              ? Number(bookingData.pax)
              : "",
          ratePerPax:
            bookingData.ratePerPax !== undefined &&
            bookingData.ratePerPax !== null &&
            bookingData.ratePerPax !== ""
              ? Number(bookingData.ratePerPax)
              : "",

          total:
            bookingData.total !== undefined &&
            bookingData.total !== null &&
            bookingData.total !== ""
              ? Number(bookingData.total)
              : "",
          balance:
            bookingData.balance !== undefined &&
            bookingData.balance !== null &&
            bookingData.balance !== ""
              ? Number(bookingData.balance)
              : "",
          gst:
            bookingData.gst !== undefined &&
            bookingData.gst !== null &&
            bookingData.gst !== ""
              ? Number(bookingData.gst)
              : "",
          statusHistory,
          staffEditCount:
            typeof bookingData.staffEditCount === "number"
              ? bookingData.staffEditCount
              : 0,
          // Add these lines to initialize room-related fields
          extraRooms:
            bookingData.extraRooms !== undefined
              ? String(bookingData.extraRooms)
              : "",
          roomPricePerUnit:
            bookingData.roomPricePerUnit !== undefined
              ? String(bookingData.roomPricePerUnit)
              : "",
          extraRoomTotalPrice:
            bookingData.extraRoomTotalPrice || bookingData.roomPrice || 0,
          roomOption: bookingData.roomOption || "complimentary", // Add this line
          decorationCharge: bookingData.decorationCharge || "",
          musicCharge: bookingData.musicCharge || "",
          hasDecoration: !!(
            bookingData.decorationCharge && bookingData.decorationCharge > 0
          ),
          hasMusic: !!(bookingData.musicCharge && bookingData.musicCharge > 0),
          showRatePerPax: !!(
            bookingData.ratePerPax && bookingData.ratePerPax > 0
          ),
          advance: Array.isArray(bookingData.advance)
            ? bookingData.advance
            : bookingData.advance > 0
              ? [
                  {
                    amount: Number(bookingData.advance),
                    date: bookingData.createdAt || new Date().toISOString(),
                    method: bookingData.paymentMethod || "cash",
                  },
                ]
              : [],
          // ... rest of the fields
        };

        setBooking(formattedData);
      }
    } catch (err) {
      toast.error("Error fetching booking details");
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val = type === "checkbox" ? checked : value;

    // Reset charges when unchecking
    if (name === "hasDecoration" && !checked) {
      setBooking((prev) => ({
        ...prev,
        hasDecoration: false,
        decorationCharge: "",
      }));
      return;
    }
    if (name === "hasMusic" && !checked) {
      setBooking((prev) => ({ ...prev, hasMusic: false, musicCharge: "" }));
      return;
    }

    // Handle custom price toggle
    if (name === "useCustomPrice") {
      setBooking((prev) => ({
        ...prev,
        useCustomPrice: checked,
        customPlatePrice: checked ? "" : prev.customPlatePrice,
      }));
      return;
    }

    // Handle show rate per pax toggle
    if (name === "showRatePerPax" && !checked) {
      setBooking((prev) => ({
        ...prev,
        showRatePerPax: false,
        ratePerPax: "",
      }));
      return;
    }

    // Capitalize name field - make all letters uppercase
    if (name === "name") {
      val = val.toUpperCase();
    }
    setBooking((prev) => {
      let newStatus = prev.bookingStatus;
      let newStatusHistory = [
        ...(Array.isArray(prev.statusHistory) ? prev.statusHistory : []),
      ];
      let isConfirmed = prev.isConfirmed || false;
      let isEnquiry = prev.isEnquiry || false;
      let isTentative = prev.isTentative || false;
      // Status changes are now handled by useEffect based on advance array
      if (name !== "advance" && prev.bookingStatus !== "Confirmed") {
        // On any other edit, set Tentative if not already
        newStatus = "Tentative";
        isConfirmed = prev.isConfirmed;
        isEnquiry = prev.isEnquiry;
        isTentative = true || prev.isTentative;
        if (
          newStatusHistory.length === 0 ||
          newStatusHistory[newStatusHistory.length - 1].status !== "Tentative"
        ) {
          newStatusHistory.push({
            status: "Tentative",
            changedAt: new Date().toISOString(),
          });
        }
      }
      // If bookingStatus is changed directly (dropdown), handle accordingly
      if (name === "bookingStatus" && value !== prev.bookingStatus) {
        newStatus = val;
        isConfirmed = prev.isConfirmed || val === "Confirmed";
        isEnquiry = prev.isEnquiry || val === "Enquiry";
        isTentative = prev.isTentative || val === "Tentative";
        if (
          newStatusHistory.length === 0 ||
          newStatusHistory[newStatusHistory.length - 1].status !== val
        ) {
          newStatusHistory.push({
            status: val,
            changedAt: new Date().toISOString(),
          });
        }
      }
      return {
        ...prev,
        [name]: val,
        bookingStatus: newStatus,
        isConfirmed,
        isEnquiry,
        isTentative,
        statusChangedAt: new Date().toISOString(),
        statusHistory: newStatusHistory,
        // staffEditCount is only incremented on menu change, not here
      };
    });
  };
  const handleNumberInputChange = (e) => {
    const { name, value } = e.target;
    // Allow empty string for controlled input, otherwise parse as number
    const numValue = value === "" ? "" : Number(value);
    setBooking((prev) => {
      const updated = {
        ...prev,
        [name]: numValue,
      };

      // For ratePerPax changes, let the useEffect handle the calculation
      if (name === "ratePerPax") {
        return updated;
      }

      if (name === "pax") {
        // Let the useEffect handle the calculation for pax changes too
        return updated;
      }

      if (name === "total") {
        return {
          ...updated,
          balance:
            (numValue !== "" ? numValue : 0) -
            prev.advance.reduce(
              (sum, adv) => sum + (parseFloat(adv.amount) || 0),
              0,
            ),
        };
      }
      return updated;
    });
  };

  // Menu item handlers
  const handleMenuItemChange = (e, index) => {
    const { name, value } = e.target;
    const updatedMenuItems = [...booking.menuItems];
    updatedMenuItems[index] = {
      ...updatedMenuItems[index],
      [name]: name === "quantity" ? Number(value) : value,
    };
    setBooking((prev) => ({ ...prev, menuItems: updatedMenuItems }));
  };

  // --- Rate Plan Summary UI Helper ---
  const getCurrentRateInfo = () => {
    if (!booking.ratePlan || !booking.foodType) return null;
    return RATE_CONFIG[booking.foodType][booking.ratePlan];
  };
  const currentRate = getCurrentRateInfo();

  const removeMenuItem = (index) => {
    const updatedMenuItems = [...booking.menuItems];
    updatedMenuItems.splice(index, 1);
    setBooking((prev) => ({ ...prev, menuItems: updatedMenuItems }));
  };

  // Handle menu selection from modal - don't increment count here
  const handleMenuSelection = (selectedItems, categorizedMenu) => {
    setBooking((prev) => ({
      ...prev,
      menuItems: selectedItems,
      categorizedMenu,
    }));
  };

  const updateBooking = () => {
    setLoading(true);

    const requiredFields = ["name", "email", "number", "pax", "startDate"];
    const missingFields = requiredFields.filter((field) => !booking[field]);

    if (missingFields.length > 0) {
      const missingFieldsMsg = `Please fill in all required fields: ${missingFields.join(
        ", ",
      )}`;
      toast.error(missingFieldsMsg);
      setLoading(false);
      return;
    }

    // Check if menu was changed and increment staff edit count
    let updatedStaffEditCount = booking.staffEditCount;
    if (role !== "Admin") {
      // Get original menu from server to compare
      bookingAPI
        .getById(id)
        .then((res) => {
          const originalMenu = res.data.categorizedMenu;
          const isMenuChanged =
            JSON.stringify(originalMenu) !==
            JSON.stringify(booking.categorizedMenu);

          if (isMenuChanged) {
            updatedStaffEditCount = booking.staffEditCount + 1;
          }

          // Continue with update
          performUpdate(updatedStaffEditCount);
        })
        .catch(() => {
          // If can't fetch original, proceed without incrementing
          performUpdate(updatedStaffEditCount);
        });
    } else {
      // Admin - proceed without checking
      performUpdate(updatedStaffEditCount);
    }
  };

  const performUpdate = (staffEditCount) => {
    // Build payload with customerRef and categorizedMenu as requested
    const categorizedMenu = booking.categorizedMenu;
    const payload = {
      ...booking,
      staffEditCount,
      complimentaryRooms:
        booking.complimentaryRooms === ""
          ? 0
          : Number(booking.complimentaryRooms),
      decorationCharge: booking.hasDecoration
        ? parseFloat(booking.decorationCharge) || 0
        : 0,
      musicCharge: booking.hasMusic ? parseFloat(booking.musicCharge) || 0 : 0,
      customerRef: String(
        booking.customerRef || booking.customerref || booking.number,
      ),
      categorizedMenu: categorizedMenu,
    };
    if (!payload.menuItems) payload.menuItems = [];
    if (!payload.statusChangedAt) {
      delete payload.statusChangedAt;
    }
    payload.statusHistory = [
      {
        status: booking.bookingStatus,
        changedAt: new Date().toISOString(),
      },
    ];
    function computeStatusBooleans(statusHistory) {
      let isEnquiry = false,
        isTentative = false,
        isConfirmed = false;
      for (const entry of statusHistory) {
        if (entry.status === "Enquiry") isEnquiry = true;
        if (entry.status === "Tentative") isTentative = true;
        if (entry.status === "Confirmed") isConfirmed = true;
      }
      return { isEnquiry, isTentative, isConfirmed };
    }
    const statusBooleans = computeStatusBooleans(payload.statusHistory || []);
    payload.isEnquiry = statusBooleans.isEnquiry;
    payload.isTentative = statusBooleans.isTentative;
    payload.isConfirmed = statusBooleans.isConfirmed;
    // Send the user's role
    payload.role = localStorage.getItem("role") || "Staff";

    // Only include categorizedMenu if staff hasn't exceeded limit
    const isStaff = payload.role !== "Admin";
    if (isStaff && staffEditCount > 2) {
      // Staff exceeded limit, remove categorizedMenu from payload
      delete payload.categorizedMenu;
    } else if (payload.categorizedMenu && payload.categorizedMenu.customerRef) {
      // Remove customerRef from categorizedMenu if present
      const { customerRef, ...rest } = payload.categorizedMenu;
      payload.categorizedMenu = rest;
    }

    bookingAPI
      .update(id, payload)
      .then((res) => {
        if (res.data) {
          toast.success("Booking updated successfully!");
          setLoading(false);
          setTimeout(() => {
            navigate("/banquet/list-booking");
          }, 600);
        }
      })
      .catch((err) => {
        setLoading(false);
        toast.error(err.response?.data?.message || "Error updating booking");
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-gray-50"
    >
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/banquet/list-booking"
            className="flex items-center text-[#c3ad6b] hover:text-[#b39b5a]"
          >
            <FaArrowLeft className="mr-2" /> Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Update Booking</h1>
          <div className="w-8"></div> {/* Spacer for balance */}
        </div>
      </header>

      {/* Main Form */}
      <main className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Form Sections */}
          <div className="p-6 space-y-8">
            {/* Guest Information Section */}
            <section className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-[#c3ad6b]/20 p-2 rounded-full">
                  <FaUser className="text-[#c3ad6b] text-lg" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Guest Information
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                      onChange={handleInputChange}
                      value={booking.name}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                      onChange={handleInputChange}
                      value={booking.email}
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="number"
                      className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                      onChange={handleInputChange}
                      value={booking.number}
                      required
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    WhatsApp Number
                  </label>
                  <div className="relative">
                    <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="whatsapp"
                      className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                      onChange={handleInputChange}
                      value={booking.whatsapp}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-gray-200"></div>

            {/* Booking Details Section */}
            <section className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-[#c3ad6b]/20 p-2 rounded-full">
                  <FaCalendarAlt className="text-[#c3ad6b] text-lg" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Booking Details
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Pax */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Number of Pax <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      name="pax"
                      className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                      onChange={handleNumberInputChange}
                      value={isNaN(booking.pax) ? "" : booking.pax}
                      min="1"
                      required
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Booking Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      name="startDate"
                      className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                      onChange={handleInputChange}
                      value={booking.startDate}
                      required
                    />
                  </div>
                </div>

                {/* Time */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Time Slot
                  </label>
                  <select
                    name="time"
                    className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                    onChange={handleInputChange}
                    value={booking.time}
                  >
                    <option value="">Select Time Slot</option>
                    <option value="10:00 AM - 4:00 PM">
                      10:00 AM - 4:00 PM
                    </option>
                    <option value="7:00 PM - 11:00 PM">
                      7:00 PM - 11:00 PM
                    </option>
                  </select>
                </div>

                {/* Hall */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Hall Type
                  </label>
                  <div className="relative">
                    <FaBuilding className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      name="hall"
                      className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                      onChange={handleInputChange}
                      value={booking.hall}
                    >
                      <option value="Nirvana">Nirvana</option>
                      <option value="Mandala">Mandala</option>
                      <option value="Mandala and Nirvana">
                        Mandala and Nirvana
                      </option>
                      <option value="Room Side Terrace">
                        Room Side Terrace
                      </option>
                    </select>
                  </div>
                </div>

                {/* Food Type */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Food Type
                  </label>
                  <div className="relative">
                    <FaUtensils className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      name="foodType"
                      className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                      onChange={handleInputChange}
                      value={booking.foodType}
                    >
                      <option value="Veg">Veg</option>
                      <option value="Non-Veg">Non-Veg</option>
                    </select>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Booking Status <span className="text-red-500">*</span>
                  </label>
                  <div className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-gray-700">
                    {booking.bookingStatus}
                  </div>
                </div>

                {/* Rate Plan */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Rate Plan
                  </label>
                  <select
                    name="ratePlan"
                    className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                    onChange={handleInputChange}
                    value={booking.ratePlan}
                    required
                  >
                    <option value="">Select Rate Plan</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>

                {/* Meal Plan */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="mealPlan"
                      checked={booking.mealPlan === "With Breakfast"}
                      onChange={(e) => {
                        setBooking((prev) => ({
                          ...prev,
                          mealPlan: e.target.checked
                            ? "With Breakfast"
                            : "Without Breakfast",
                        }));
                      }}
                      className="rounded border-gray-300 text-[#c3ad6b] focus:ring-[#c3ad6b]"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      With Breakfast
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    {booking.mealPlan === "With Breakfast"
                      ? "Breakfast included"
                      : "Without breakfast"}
                  </p>
                </div>

                {/* Custom Plate Price - Admin Only */}
                {role === "Admin" && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        name="useCustomPrice"
                        checked={booking.useCustomPrice}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-[#c3ad6b] focus:ring-[#c3ad6b]"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Rate Per Plate <span className="text-red-500">*</span>
                      </label>
                    </div>
                    {booking.useCustomPrice && (
                      <div className="relative">
                        <FaRupeeSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          name="customPlatePrice"
                          className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                          onChange={handleInputChange}
                          value={booking.customPlatePrice}
                          placeholder="Enter rate per plate"
                          min="0"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <div className="border-t border-gray-200"></div>

            {/* Rate Plan Summary Section */}
            <section className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-[#c3ad6b]/20 p-2 rounded-full">
                  <FaMoneyBillWave className="text-[#c3ad6b] text-lg" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Rate Plan Summary
                </h2>
              </div>
              <div className="bg-white shadow-lg rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:space-x-8 space-y-4 md:space-y-0 border border-[#f3e9d1]">
                {/* Rate Plan & Food Type */}
                <div className="flex-1 flex flex-col items-center md:items-start">
                  <div className="flex items-center space-x-2 mb-1">
                    <FaUtensils className="text-[#c3ad6b] text-xl" />
                    <span className="font-semibold text-gray-700 text-lg">
                      {booking.ratePlan || (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">Rate Plan</span>
                  {(() => {
                    // Check if current rate is custom by comparing with standard rates
                    let isCustomRate = false;
                    let standardRate = 0;
                    if (
                      booking.ratePlan &&
                      booking.foodType &&
                      RATE_CONFIG[booking.foodType] &&
                      RATE_CONFIG[booking.foodType][booking.ratePlan]
                    ) {
                      standardRate =
                        RATE_CONFIG[booking.foodType][booking.ratePlan]
                          .basePrice;
                      const currentRate = parseFloat(booking.ratePerPax) || 0;
                      isCustomRate =
                        Math.abs(currentRate - standardRate) > 0.01;
                    }

                    if (isCustomRate) {
                      return (
                        <div className="text-xs text-gray-500 mt-1">
                          Custom Rate:{" "}
                          <span className="font-bold text-[#c3ad6b]">
                            ₹{booking.ratePerPax}
                          </span>
                        </div>
                      );
                    } else if (
                      booking.foodType &&
                      booking.ratePlan &&
                      RATE_CONFIG[booking.foodType] &&
                      RATE_CONFIG[booking.foodType][booking.ratePlan]
                    ) {
                      return (
                        <div className="text-xs text-gray-500 mt-1">
                          {booking.ratePlan} Rate:{" "}
                          <span className="font-bold text-[#c3ad6b]">
                            ₹{standardRate}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                {/* Food Type */}
                <div className="flex-1 flex flex-col items-center md:items-start">
                  <div className="flex items-center space-x-2 mb-1">
                    <FaUsers className="text-[#c3ad6b] text-xl" />
                    <span className="font-semibold text-gray-700 text-lg">
                      {booking.foodType || (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">Food Type</span>
                </div>
                {/* Calculation */}
                <div className="flex-1 flex flex-col items-center md:items-start">
                  <div className="flex items-center space-x-2 mb-1">
                    <FaRupeeSign className="text-[#c3ad6b] text-xl" />
                    <span className="font-semibold text-gray-700 text-lg">
                      Calculation
                    </span>
                  </div>
                  {booking.pax && booking.ratePerPax ? (
                    <>
                      {(() => {
                        const pax = parseInt(booking.pax) || 0;
                        const ratePerPax = parseFloat(booking.ratePerPax) || 0;
                        const foodTotal = ratePerPax * pax;

                        const decorationCharge = booking.hasDecoration
                          ? parseFloat(booking.decorationCharge) || 0
                          : 0;
                        const musicCharge = booking.hasMusic
                          ? parseFloat(booking.musicCharge) || 0
                          : 0;
                        const grandTotal =
                          foodTotal + decorationCharge + musicCharge;

                        // Check if this is a custom rate by comparing with standard rates
                        let isCustomRate = false;
                        let standardRate = 0;
                        if (
                          booking.ratePlan &&
                          booking.foodType &&
                          RATE_CONFIG[booking.foodType] &&
                          RATE_CONFIG[booking.foodType][booking.ratePlan]
                        ) {
                          standardRate =
                            RATE_CONFIG[booking.foodType][booking.ratePlan]
                              .basePrice;
                          isCustomRate =
                            Math.abs(ratePerPax - standardRate) > 0.01; // Allow for small floating point differences
                        }

                        return (
                          <>
                            <span className="text-lg font-bold text-[#c3ad6b]">
                              ₹{ratePerPax.toFixed(2)}
                            </span>
                            <span className="text-gray-700"> x {pax} = </span>
                            <span className="text-lg font-bold text-[#c3ad6b]">
                              ₹{foodTotal.toFixed(2)}
                            </span>
                            {(decorationCharge > 0 || musicCharge > 0) && (
                              <div className="text-xs text-gray-600 mt-1">
                                {decorationCharge > 0 && (
                                  <div>+ Decoration: ₹{decorationCharge}</div>
                                )}
                                {musicCharge > 0 && (
                                  <div>+ Music: ₹{musicCharge}</div>
                                )}
                                <div className="font-semibold">
                                  = ₹{grandTotal.toFixed(2)}
                                </div>
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {isCustomRate
                                ? `Custom rate: ₹${ratePerPax.toFixed(2)} + ₹0.00 (GST) = ₹${ratePerPax.toFixed(2)}`
                                : `${booking.ratePlan} rate: ₹${standardRate} + ₹0.00 (GST) = ₹${ratePerPax.toFixed(2)}`}
                            </div>
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </div>
                {/* Total Amount */}
                <div className="flex-1 flex flex-col items-center md:items-start">
                  <div className="flex items-center space-x-2 mb-1">
                    <FaMoneyBillWave className="text-[#c3ad6b] text-xl" />
                    <span className="font-semibold text-gray-700 text-lg">
                      Total
                    </span>
                  </div>
                  <span className="text-2xl font-extrabold text-[#c3ad6b]">
                    ₹
                    {booking.total || (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-500">Total Amount</span>
                </div>
              </div>
            </section>

            {/* Financial Information Section */}
            <section className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-[#c3ad6b]/20 p-2 rounded-full">
                  <FaMoneyBillWave className="text-[#c3ad6b] text-lg" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Financial Information
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Decoration */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="hasDecoration"
                      checked={booking.hasDecoration}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-[#c3ad6b] focus:ring-[#c3ad6b]"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Decoration Charge
                    </label>
                  </div>
                  {booking.hasDecoration && (
                    <div className="relative">
                      <FaRupeeSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        name="decorationCharge"
                        className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                        onChange={handleInputChange}
                        value={booking.decorationCharge}
                        placeholder="Enter amount"
                      />
                    </div>
                  )}
                </div>

                {/* Music */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="hasMusic"
                      checked={booking.hasMusic}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-[#c3ad6b] focus:ring-[#c3ad6b]"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Music Charge
                    </label>
                  </div>
                  {booking.hasMusic && (
                    <div className="relative">
                      <FaRupeeSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        name="musicCharge"
                        className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                        onChange={handleInputChange}
                        value={booking.musicCharge}
                        placeholder="Enter amount"
                      />
                    </div>
                  )}
                </div>

                {/* Rate Per Pax */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="showRatePerPax"
                      checked={booking.showRatePerPax || false}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-[#c3ad6b] focus:ring-[#c3ad6b]"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Rate Per Plate *``
                    </label>
                  </div>
                  {booking.showRatePerPax && (
                    <div className="relative">
                      <FaRupeeSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        name="ratePerPax"
                        className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                        onChange={(e) => {
                          const value =
                            e.target.value === "" ? "" : Number(e.target.value);
                          setBooking((prev) => ({
                            ...prev,
                            ratePerPax: value,
                          }));
                        }}
                        value={booking.ratePerPax || ""}
                        min="0"
                        placeholder="Enter rate per pax"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* GST (optional) */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    GST In Percentage (%){" "}
                    <span className="text-gray-400 font-normal">
                      (Optional)
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      %
                    </span>
                    <input
                      type="number"
                      name="gst"
                      className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                      onChange={handleInputChange}
                      value={booking.gst || ""}
                      placeholder="Enter GST % if applicable"
                      min="0"
                      max="100"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Leave empty if no GST applicable
                  </p>
                </div>

                {/* Total */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Total Amount
                  </label>
                  <div className="relative">
                    <FaRupeeSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      name="total"
                      className={`pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3 ${
                        role !== "Admin" ? "bg-gray-100" : ""
                      }`}
                      onChange={handleNumberInputChange}
                      value={booking.total !== "" ? booking.total : ""}
                      min="0"
                      readOnly={role !== "Admin"}
                    />
                  </div>
                </div>

                {/* Advance Payments */}
                <div className="space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Advance Payments
                    </label>
                    <button
                      type="button"
                      onClick={addAdvancePayment}
                      className="px-3 py-1 bg-[#c3ad6b] text-white rounded-md text-sm hover:bg-[#b39b5a]"
                    >
                      Add Payment
                    </button>
                  </div>
                  {booking.advance.map((payment, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 space-y-3"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Amount
                          </label>
                          <input
                            type="number"
                            value={payment.amount}
                            onChange={(e) =>
                              updateAdvancePayment(
                                index,
                                "amount",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={
                              payment.date
                                ? typeof payment.date === "string"
                                  ? payment.date.split("T")[0]
                                  : new Date(payment.date)
                                      .toISOString()
                                      .split("T")[0]
                                : ""
                            }
                            onChange={(e) =>
                              updateAdvancePayment(
                                index,
                                "date",
                                e.target.value,
                              )
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Method
                          </label>
                          <select
                            value={payment.method}
                            onChange={(e) =>
                              updateAdvancePayment(
                                index,
                                "method",
                                e.target.value,
                              )
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          >
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="upi">UPI</option>
                            <option value="wallet">Wallet</option>
                            <option value="cheque">Cheque</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeAdvancePayment(index)}
                            className="px-3 py-2 bg-red-500 text-white rounded-md text-sm hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Remarks
                        </label>
                        <input
                          type="text"
                          value={payment.remarks}
                          onChange={(e) =>
                            updateAdvancePayment(
                              index,
                              "remarks",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          placeholder="Payment remarks"
                        />
                      </div>
                    </div>
                  ))}
                  {booking.advance.length === 0 && (
                    <p className="text-gray-500 text-sm italic">
                      No advance payments added
                    </p>
                  )}
                </div>

                {/* Balance */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Balance
                  </label>
                  <div className="relative">
                    <FaRupeeSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      name="balance"
                      className="pl-10 w-full rounded-lg border border-gray-300 bg-gray-100 py-2 px-3"
                      value={booking.balance !== "" ? booking.balance : ""}
                      readOnly
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Method
                  </label>
                  <select
                    name="paymentMethod"
                    className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                    onChange={handleInputChange}
                    value={booking.paymentMethod || "cash"}
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                {/* Transaction ID - Only show for online and card payments */}
                {(booking.paymentMethod === "online" ||
                  booking.paymentMethod === "card") && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      name="transactionId"
                      className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3"
                      onChange={handleInputChange}
                      value={booking.transactionId || ""}
                      placeholder="Enter transaction ID"
                    />
                  </div>
                )}
              </div>
            </section>

            <div className="border-t border-gray-200"></div>

            {/* Menu Section - Only for Admin */}
            {
              <>
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-[#c3ad6b]/20 p-2 rounded-full">
                        <FaUtensils className="text-[#c3ad6b] text-lg" />
                      </div>
                      <h2 className="text-xl font-semibold text-gray-800">
                        Menu Selection
                      </h2>
                    </div>
                    <button
                      onClick={() => setShowMenuModal(true)}
                      className={`flex items-center bg-[#c3ad6b] hover:bg-[#b39b5a] text-white py-2 px-4 rounded-lg ${
                        isStaffEditLimitReached
                          ? "opacity-60 cursor-not-allowed"
                          : ""
                      }`}
                      disabled={isStaffEditLimitReached}
                    >
                      <FaList className="mr-2" /> Select Menu Items
                    </button>
                    {isStaffEditLimitReached && (
                      <div className="text-red-500 text-sm ml-4">
                        Menu edit limit reached for staff.
                      </div>
                    )}
                  </div>
                  {/* Selected Menu Items (read-only textarea, like AddBooking) */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Selected Menu Items
                    </label>
                    <textarea
                      name="menuItems"
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 px-3 h-24"
                      value={
                        booking.categorizedMenu
                          ? Object.entries(booking.categorizedMenu)
                              .filter(
                                ([key]) =>
                                  ![
                                    "_id",
                                    "bookingRef",
                                    "createdAt",
                                    "updatedAt",
                                    "__v",
                                  ].includes(key),
                              )
                              .map(([, arr]) => arr)
                              .flat()
                              .join(", ")
                          : ""
                      }
                      readOnly
                      placeholder="No menu items selected yet - click 'Select Menu Items' to add items"
                    />
                    {!booking.categorizedMenu && (
                      <div className="text-sm text-blue-600 mt-1">
                        💡 This booking doesn't have menu items yet. Use the
                        "Select Menu Items" button above to add them.
                      </div>
                    )}
                  </div>
                  {/* Selected Menu Items Table */}
                  {/* {booking.menuItems && booking.menuItems.length > 0 ? (
                  <div className="space-y-4 mt-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {booking.menuItems.map((item, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                <div className="text-sm text-gray-500">{item.category}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  <FaRupeeSign className="inline mr-1" />
                                  {item.price}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="number"
                                  name="quantity"
                                  min="1"
                                  className="w-20 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-1 px-2"
                                  value={isNaN(item.quantity) ? "" : item.quantity}
                                  onChange={(e) => handleMenuItemChange(e, index)}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  <FaRupeeSign className="inline mr-1" />
                                  {item.price * item.quantity}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => removeMenuItem(index)}
                                  className="text-red-500 hover:text-red-700"
                                  title="Remove item"
                                >
                                  <FaTrash />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No menu items selected. Click "Select Menu Items" to add items.
                  </div>
                )} */}
                </section>
              </>
            }

            {/* Menu Selection Modal */}
            {showMenuModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto">
                  <MenuSelector
                    initialItems={
                      booking.menuItems && booking.menuItems.length > 0
                        ? booking.menuItems
                        : booking.categorizedMenu?.categories
                          ? Object.values(booking.categorizedMenu.categories)
                              .flat()
                              .filter((item) => typeof item === "string")
                          : []
                    }
                    foodType={booking.foodType}
                    ratePlan={booking.ratePlan}
                    onSave={handleMenuSelection}
                    onClose={() => setShowMenuModal(false)}
                  />
                </div>
              </div>
            )}

            <div className="border-t border-gray-200"></div>

            {/* Notes Section */}
            <section className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-[#c3ad6b]/20 p-2 rounded-full">
                  <FaInfoCircle className="text-[#c3ad6b] text-lg" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Additional Information
                </h2>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2 px-3 h-32"
                  onChange={handleInputChange}
                  value={booking.notes}
                  placeholder="Any special requests or notes..."
                />
              </div>
            </section>

            {/* Submit Button */}
            <div className="pt-6 flex justify-center">
              <button
                disabled={loading}
                onClick={updateBooking}
                className={`w-full md:w-1/2 flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-[#c3ad6b] hover:bg-[#b39b5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c3ad6b] transition-colors duration-300 ${
                  loading ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <FaSave className="mr-2" /> Update Booking
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </motion.div>
  );
};

export default UpdateBooking;
