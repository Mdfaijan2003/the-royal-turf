export function generateBookingPDF(booking) {
  if (!window.jspdf) return alert("PDF library not loaded");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "A4" });

  const b = booking;
  const bookingId = booking._id
    ? booking._id.slice(-6).toUpperCase()
    : "XXXXXX";

  // Formatting
  const startDate = new Date(b.start);
  const endDate = new Date(b.end);

  const bookingDate = startDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const startTime = startDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const endTime = endDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // ---- brand palette ----
  const GREEN = "#145531";
  const GOLD = "#B8912F";
  const INK = "#1a1a1a";
  const MUTED = "#6b7280";
  const LINE = "#e5e7eb";
  const PAGE_W = 595.28; // A4 width in pt
  const MARGIN_L = 40;
  const MARGIN_R = 40;
  const CONTENT_R = PAGE_W - MARGIN_R;

  const money = n => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

  const advance = Number(b.advanceAmount || 0);
  const totalFee = Number(b.totalAmount || 0);
  const balanceDue = Math.max(totalFee - advance, 0);
  const isFullyPaid = balanceDue === 0;

  // ---- number to words (Indian numbering system) ----
  const numberToWords = num => {
    num = Math.round(Number(num) || 0);
    if (num === 0) return "Zero Rupees Only";

    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const twoDigits = n => {
      if (n < 20) return ones[n];
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    };
    const threeDigits = n => {
      if (n < 100) return twoDigits(n);
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + twoDigits(n % 100) : "")
      );
    };

    let n = num;
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundred = n;

    let parts = [];
    if (crore) parts.push(threeDigits(crore) + " Crore");
    if (lakh) parts.push(threeDigits(lakh) + " Lakh");
    if (thousand) parts.push(threeDigits(thousand) + " Thousand");
    if (hundred) parts.push(threeDigits(hundred));

    return parts.join(" ") + " Rupees Only";
  };

  let y = 46;

  /* ================= BRAND HEADER ================= */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(GREEN);
  doc.text("THE ROYAL TURF", MARGIN_L, y);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(MUTED);
  doc.text("Where Kings Play", MARGIN_L, y + 16);

  // Invoice badge, top right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(INK);
  doc.text("INVOICE", CONTENT_R, y - 4, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED);
  doc.text(`No. RT-${bookingId}`, CONTENT_R, y + 10, { align: "right" });
  doc.text(
    `Date: ${new Date().toLocaleDateString("en-IN")}`,
    CONTENT_R,
    y + 22,
    { align: "right" }
  );

  y += 34;
  doc.setDrawColor(GOLD);
  doc.setLineWidth(1.25);
  doc.line(MARGIN_L, y, CONTENT_R, y);

  /* ================= STATUS PILL ================= */
  y += 22;
  const pillLabel = isFullyPaid ? "PAID IN FULL" : "PARTIALLY PAID";
  const pillColor = isFullyPaid ? [20, 85, 49] : [184, 145, 47];
  doc.setFillColor(...pillColor);
  const pillW = doc.getTextWidth(pillLabel) + 20;
  doc.roundedRect(CONTENT_R - pillW, y - 12, pillW, 18, 9, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor("#ffffff");
  doc.text(pillLabel, CONTENT_R - pillW / 2, y, {
    align: "center",
    baseline: "middle",
  });

  /* ================= BILLED TO / BOOKING DETAILS (two columns) ================= */
  const colGap = 20;
  const colW = (CONTENT_R - MARGIN_L - colGap) / 2;
  const col1X = MARGIN_L;
  const col2X = MARGIN_L + colW + colGap;

  const sectionTop = y + 14;

  const writeLabel = (text, x, yy) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED);
    doc.text(text.toUpperCase(), x, yy);
  };

  const writeRow = (label, value, x, yy) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(MUTED);
    doc.text(label, x, yy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(INK);
    doc.text(String(value || "N/A"), x, yy + 13);
  };

  writeLabel("Billed To", col1X, sectionTop);
  writeRow("Customer Name", b.customerName, col1X, sectionTop + 16);
  writeRow("Phone", b.customerPhone, col1X, sectionTop + 44);
  writeRow("Email", b.customerEmail, col1X, sectionTop + 72);

  writeLabel("Booking Details", col2X, sectionTop);
  writeRow("Date", bookingDate, col2X, sectionTop + 16);
  writeRow("Time Slot", `${startTime} - ${endTime}`, col2X, sectionTop + 44);
  writeRow("Booking ID", `RT-${bookingId}`, col2X, sectionTop + 72);

  y = sectionTop + 100;
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.75);
  doc.line(MARGIN_L, y, CONTENT_R, y);

  /* ================= CHARGES TABLE ================= */
  y += 24;
  const tableTop = y;
  const rowH = 26;

  doc.setFillColor(GREEN);
  doc.rect(MARGIN_L, tableTop, CONTENT_R - MARGIN_L, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor("#ffffff");
  doc.text("DESCRIPTION", MARGIN_L + 12, tableTop + rowH / 2 + 3);
  doc.text("AMOUNT", CONTENT_R - 12, tableTop + rowH / 2 + 3, {
    align: "right",
  });

  const chargeRows = [
    ["Turf Booking Fee", money(totalFee)],
    ["Advance Paid", `- ${money(advance)}`],
  ];

  let rowY = tableTop + rowH;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  chargeRows.forEach(([label, value], i) => {
    if (i % 2 === 1) {
      doc.setFillColor("#f9fafb");
      doc.rect(MARGIN_L, rowY, CONTENT_R - MARGIN_L, rowH, "F");
    }
    doc.setTextColor(INK);
    doc.text(label, MARGIN_L + 12, rowY + rowH / 2 + 3);
    doc.text(value, CONTENT_R - 12, rowY + rowH / 2 + 3, { align: "right" });
    rowY += rowH;
  });

  // Balance due row, emphasized
  doc.setFillColor(isFullyPaid ? "#ecfdf5" : "#fffbeb");
  doc.rect(MARGIN_L, rowY, CONTENT_R - MARGIN_L, rowH + 4, "F");
  doc.setDrawColor(GOLD);
  doc.setLineWidth(1);
  doc.line(MARGIN_L, rowY, CONTENT_R, rowY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(GREEN);
  doc.text(
    isFullyPaid ? "Balance Due" : "Balance Due (Pay at venue)",
    MARGIN_L + 12,
    rowY + (rowH + 4) / 2 + 4
  );
  doc.text(money(balanceDue), CONTENT_R - 12, rowY + (rowH + 4) / 2 + 4, {
    align: "right",
  });

  y = rowY + rowH + 4;
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.75);
  doc.rect(MARGIN_L, tableTop, CONTENT_R - MARGIN_L, y - tableTop);

  /* ================= AMOUNT IN WORDS ================= */
  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text("TOTAL AMOUNT IN WORDS", MARGIN_L, y);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(INK);
  const amountWordsLines = doc.splitTextToSize(
    numberToWords(totalFee),
    CONTENT_R - MARGIN_L
  );
  doc.text(amountWordsLines, MARGIN_L, y + 14);
  y += 14 + amountWordsLines.length * 13;

  /* ================= BOOKING POLICY ================= */
  y += 18;
  const policyTop = y;
  const policyLines = [
    "\u2022 Cancellations must be made at least 4 hours before the slot time; no refunds for no-shows.",
    "\u2022 Please arrive 10 minutes before your slot with a valid ID.",
    "\u2022 Remaining balance is payable in cash or UPI directly at the venue before play begins.",
  ];
  const policyPad = 12;
  const policyLineH = 13;
  const policyBoxH = policyPad * 2 + 14 + policyLines.length * policyLineH;

  doc.setFillColor("#f9fafb");
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.75);
  doc.roundedRect(
    MARGIN_L,
    policyTop,
    CONTENT_R - MARGIN_L,
    policyBoxH,
    6,
    6,
    "FD"
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(GREEN);
  doc.text("BOOKING POLICY", MARGIN_L + policyPad, policyTop + policyPad + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  policyLines.forEach((line, i) => {
    doc.text(
      line,
      MARGIN_L + policyPad,
      policyTop + policyPad + 18 + i * policyLineH
    );
  });

  y = policyTop + policyBoxH;

  /* ================= FOOTER ================= */
  const footerY = 760;
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.75);
  doc.line(MARGIN_L, footerY - 34, CONTENT_R, footerY - 34);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(GREEN);
  doc.text("Thank you for choosing The Royal Turf!", MARGIN_L, footerY - 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text(
    "Follow us: @theroyalturf  |  www.theroyalturf.in",
    MARGIN_L,
    footerY - 3
  );

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text(
    "This is a system-generated invoice and does not require a signature.",
    MARGIN_L,
    footerY + 5
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    "The Royal Turf  |  +91 82729 52122 / 70443 85501  |  info@theroyalturf.in",
    MARGIN_L,
    footerY + 18
  );

  doc.save(`RoyalTurf_Invoice_${bookingId}.pdf`);
}
