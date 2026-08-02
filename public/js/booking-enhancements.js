/**
 * ROYAL TURF - BOOKING PAGE ENHANCEMENTS
 * Handles: Price toggle, real-time validation, progress bar, phone formatting
 * This file complements main.js without replacing it
 */

// ════════════════════════════════════════════════════════════════════════════════
// PRICING CHART TOGGLE (Mobile Only)
// ════════════════════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", function () {
  const toggleBtns = document.querySelectorAll(".toggle-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  toggleBtns.forEach(btn => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const targetTab = this.dataset.tab;

      // Update active button
      toggleBtns.forEach(b => b.classList.remove("active"));
      this.classList.add("active");

      // Show/hide content
      tabContents.forEach(content => {
        if (content.dataset.tab === targetTab) {
          content.style.display = "block";
          content.classList.add("active");
        } else {
          content.style.display = "none";
          content.classList.remove("active");
        }
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // PHONE NUMBER FORMATTING
  // ════════════════════════════════════════════════════════════════════════════════

  const phoneInput = document.getElementById("phone");
  if (phoneInput) {
    phoneInput.addEventListener("input", function (e) {
      let value = e.target.value.replace(/\D/g, "");

      // Keep only 10 digits
      if (value.length > 10) {
        value = value.slice(0, 10);
      }

      // Format as: +91 98765 43210
      if (value.length > 0) {
        if (value.length <= 5) {
          value = "+91 " + value;
        } else {
          value = "+91 " + value.slice(0, 5) + " " + value.slice(5);
        }
      }

      e.target.value = value;
    });

    // Remove formatting on blur and re-validate
    phoneInput.addEventListener("blur", function () {
      let value = this.value.replace(/\D/g, "");
      if (value.length === 10) {
        this.value = "+91 " + value.slice(0, 5) + " " + value.slice(5);
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // REAL-TIME FORM VALIDATION & PROGRESS BAR UPDATE
  // ════════════════════════════════════════════════════════════════════════════════

  const formFields = [
    "name",
    "email",
    "phone",
    "date",
    "start-time",
    "end-time",
  ];
  const bookingForm = document.getElementById("booking-form");

  function updateProgressBar() {
    let filledFields = 0;

    formFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field && field.value.trim() !== "") {
        filledFields++;
      }
    });

    const progressPercentage = (filledFields / formFields.length) * 100;
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");

    if (progressFill) {
      progressFill.style.width = progressPercentage + "%";
    }

    // Update progress text
    if (progressText) {
      if (filledFields < 3) {
        progressText.textContent = "Step 1 of 3";
      } else if (filledFields < 6) {
        progressText.textContent = "Step 2 of 3";
      } else {
        progressText.textContent = "Step 3 of 3";
      }
    }
  }

  // Attach listeners to all form fields
  formFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener("input", updateProgressBar);
      field.addEventListener("change", updateProgressBar);
    }
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // REAL-TIME SUMMARY UPDATES
  // ════════════════════════════════════════════════════════════════════════════════

  function calculateAmount() {
    const date = document.getElementById("date");
    const startTime = document.getElementById("start-time");
    const endTime = document.getElementById("end-time");

    if (!date.value || !startTime.value || !endTime.value) {
      document.getElementById("selected-time").textContent = "–";
      document.getElementById("selected-date").textContent = "–";
      document.getElementById("duration-hours").textContent = "–";
      document.getElementById("rate-per-hour").textContent = "–";
      document.getElementById("booking-fees").textContent = "–";
      document.getElementById("advance-amount").textContent = "–";
      document.getElementById("total-payable").textContent = "–";
      return;
    }

    // Parse selected date
    const selectedDate = new Date(date.value);
    const dayOfWeek = selectedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday

    // Format date for display
    const formattedDate = selectedDate.toLocaleDateString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    // Parse times
    const [startHour, startMin] = startTime.value.split(":").map(Number);
    const [endHour, endMin] = endTime.value.split(":").map(Number);

    // Calculate duration in hours
    let duration = endHour - startHour;

    // Handle midnight crossing (e.g., 10 PM to 1 AM)
    if (endHour <= startHour && endHour !== startHour) {
      duration = 24 - startHour + endHour;
    }

    // Handle minutes
    if (startMin > endMin && endHour > startHour) {
      duration -= 0.5;
    } else if (startMin < endMin) {
      duration += 0.5;
    }

    duration = Math.max(1, Math.round(duration * 2) / 2); // Round to nearest 0.5

    // Determine rate based on day type and time of day
    let ratePerHour;
    const isNight = startHour >= 18 || startHour < 6;

    if (isWeekend) {
      ratePerHour = isNight ? 1200 : 900;
    } else {
      ratePerHour = isNight ? 1000 : 700;
    }

    // Calculate amounts
    const baseAmount = ratePerHour * duration;
    const bookingFee = Math.round(baseAmount * 0.05); // 5% booking fee
    const advanceAmount = Math.round(baseAmount * 0.3); // 30% advance
    const totalAmount = baseAmount + bookingFee;

    // Update summary with formatted values
    document.getElementById("selected-time").textContent =
      `${startTime.value} – ${endTime.value}`;
    document.getElementById("selected-date").textContent = formattedDate;
    document.getElementById("duration-hours").textContent = `${duration} hrs`;
    document.getElementById("rate-per-hour").textContent = `₹${ratePerHour}/hr`;
    document.getElementById("booking-fees").textContent = `₹${bookingFee}`;
    document.getElementById("advance-amount").textContent = `₹${advanceAmount}`;
    document.getElementById("total-payable").textContent = `₹${totalAmount}`;
  }

  // Attach listeners for real-time calculation
  ["date", "start-time", "end-time"].forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener("change", calculateAmount);
      field.addEventListener("input", calculateAmount);
    }
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // FORM VALIDATION BEFORE SUBMISSION
  // ════════════════════════════════════════════════════════════════════════════════

  if (bookingForm) {
    bookingForm.addEventListener("submit", function (e) {
      // Phone validation
      const phone = document.getElementById("phone");
      const phoneDigits = phone.value.replace(/\D/g, "");

      if (phoneDigits.length !== 10) {
        e.preventDefault();
        showModal(
          "Invalid Phone",
          "❌",
          "Please enter a valid 10-digit phone number"
        );
        return false;
      }

      // Date validation
      const date = document.getElementById("date");
      const selectedDate = new Date(date.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        e.preventDefault();
        showModal(
          "Invalid Date",
          "❌",
          "Please select a date from today onwards"
        );
        return false;
      }

      // Time validation
      const startTime = document.getElementById("start-time");
      const endTime = document.getElementById("end-time");

      if (!startTime.value || !endTime.value) {
        e.preventDefault();
        showModal(
          "Missing Time",
          "❌",
          "Please select both start and end time"
        );
        return false;
      }

      const [startHour] = startTime.value.split(":").map(Number);
      const [endHour] = endTime.value.split(":").map(Number);

      if (endHour <= startHour) {
        e.preventDefault();
        showModal("Invalid Time", "❌", "End time must be after start time");
        return false;
      }

      // If all validations pass, show processing
      this.submit();
    });
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // MODAL HELPER (if not already in main.js)
  // ════════════════════════════════════════════════════════════════════════════════

  function showModal(title, icon, message) {
    const modal = document.getElementById("message-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalIcon = document.getElementById("modal-icon");
    const modalMessage = document.getElementById("modal-message");
    const modalCloseButton = document.getElementById("modal-close-button");

    if (modal && modalTitle && modalIcon && modalMessage) {
      modalTitle.textContent = title;
      modalIcon.textContent = icon;
      modalMessage.textContent = message;
      modal.classList.remove("hidden");

      modalCloseButton.onclick = () => {
        modal.classList.add("hidden");
      };

      modal.addEventListener("click", e => {
        if (e.target === modal) {
          modal.classList.add("hidden");
        }
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // INITIALIZE FIRST FIELD FOCUS & EMPTY STATE
  // ════════════════════════════════════════════════════════════════════════════════

  const nameField = document.getElementById("name");
  if (nameField) {
    nameField.focus();
  }

  // Initialize progress bar on load
  updateProgressBar();

  // ════════════════════════════════════════════════════════════════════════════════
  // PREVENT DOUBLE SUBMISSION
  // ════════════════════════════════════════════════════════════════════════════════

  if (bookingForm) {
    let isSubmitting = false;

    bookingForm.addEventListener("submit", function (e) {
      if (isSubmitting) {
        e.preventDefault();
        return;
      }

      const confirmButton = document.getElementById("confirm-pay");
      if (confirmButton) {
        isSubmitting = true;
        confirmButton.disabled = true;
        confirmButton.textContent = "Processing...";

        // Re-enable after 3 seconds or when form processing is done
        setTimeout(() => {
          if (isSubmitting) {
            isSubmitting = false;
            confirmButton.disabled = false;
            confirmButton.innerHTML =
              '<span class="material-symbols-outlined">lock</span> Secure Your Slot Now';
          }
        }, 3000);
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // SET MINIMUM DATE TO TODAY
  // ════════════════════════════════════════════════════════════════════════════════

  const dateInput = document.getElementById("date");
  if (dateInput) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    dateInput.setAttribute("min", `${year}-${month}-${day}`);
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // SCROLL TO BOOKING SECTION ON LOAD (if URL has #booking-section)
  // ════════════════════════════════════════════════════════════════════════════════

  if (window.location.hash === "#booking-section") {
    const bookingSection = document.getElementById("booking-section");
    if (bookingSection) {
      setTimeout(() => {
        bookingSection.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // ACCESSIBILITY: ANNOUNCE PROGRESS TO SCREEN READERS
  // ════════════════════════════════════════════════════════════════════════════════

  function announceToScreenReader(message) {
    const announcement = document.createElement("div");
    announcement.setAttribute("role", "status");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.style.position = "absolute";
    announcement.style.left = "-9999px";
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => {
      announcement.remove();
    }, 1000);
  }

  // Announce when summary updates
  const originalCalculateAmount = calculateAmount;
  calculateAmount = function () {
    originalCalculateAmount.call(this);
    const total = document.getElementById("total-payable");
    if (total && total.textContent !== "–") {
      announceToScreenReader(`Total amount updated to ${total.textContent}`);
    }
  };
});

// ════════════════════════════════════════════════════════════════════════════════
// EXPORT FOR TESTING (if needed)
// ════════════════════════════════════════════════════════════════════════════════

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    // Enhancements module loaded
  };
}
