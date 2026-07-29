/**
 * ==================== ROYAL TURF LOADER ====================
 * ES6 Module version - works with import/export
 *
 * Usage:
 * import loader from './loader.js';
 *
 * Then use:
 * - loader.show('message')
 * - loader.hide()
 * - loader.showTemporary('message', delay)
 * - await loader.execute(asyncFunction, 'message')
 * ===========================================================
 */

// ==================== INJECT STYLES ====================
function injectStyles() {
  if (document.getElementById("royal-turf-loader-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "royal-turf-loader-styles";
  style.textContent = `
    .loader-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .loader-backdrop.active {
      display: flex;
      opacity: 1;
    }

    .loader-container {
      background: #ffffff;
      border-radius: 20px;
      padding: 60px 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      text-align: center;
      min-width: 320px;
      max-width: 420px;
      transform: scale(0.9) translateY(20px);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      animation: slideInUp 0.4s ease-out forwards;
    }

    .loader-backdrop.active .loader-container {
      transform: scale(1) translateY(0);
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(30px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .spinner-wrapper {
      margin-bottom: 30px;
      display: flex;
      justify-content: center;
    }

    .spinner {
      width: 60px;
      height: 60px;
      border: 4px solid #f0f0f0;
      border-top: 4px solid #059669;
      border-radius: 50%;
      animation: spin 1.2s linear infinite;
      position: relative;
    }

    .spinner::after {
      content: '';
      position: absolute;
      width: 50px;
      height: 50px;
      border: 3px solid #f0f0f0;
      border-right: 3px solid #10b981;
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: spin-reverse 1.8s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes spin-reverse {
      0% { transform: translate(-50%, -50%) rotate(360deg); }
      100% { transform: translate(-50%, -50%) rotate(0deg); }
    }

    .loader-text {
      margin-bottom: 10px;
    }

    .loader-title {
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }

    .loader-subtitle {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.5;
      font-weight: 400;
    }

    .loader-dots {
      display: inline-block;
      margin-left: 4px;
    }

    .dot {
      display: inline-block;
      width: 4px;
      height: 4px;
      background: #059669;
      border-radius: 50%;
      margin: 0 3px;
      animation: bounce 1.4s infinite;
    }

    .dot:nth-child(1) { animation-delay: 0s; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes bounce {
      0%, 60%, 100% {
        opacity: 0.7;
        transform: translateY(0);
      }
      30% {
        opacity: 1;
        transform: translateY(-8px);
      }
    }

    @media (max-width: 480px) {
      .loader-container {
        padding: 40px 30px;
        min-width: 280px;
      }
      .loader-title { font-size: 18px; }
      .loader-subtitle { font-size: 13px; }
    }
  `;

  document.head.appendChild(style);
}

// ==================== INJECT HTML ====================
function injectHTML() {
  if (document.getElementById("loader-backdrop")) {
    return;
  }

  const backdrop = document.createElement("div");
  backdrop.id = "loader-backdrop";
  backdrop.className = "loader-backdrop";
  backdrop.innerHTML = `
    <div class="loader-container">
      <div class="spinner-wrapper">
        <div class="spinner"></div>
      </div>
      <div class="loader-text">
        <div class="loader-title">
          Loading
          <span class="loader-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </span>
        </div>
        <div class="loader-subtitle" id="loaderMessage">
          We're working on your request
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
}

// ==================== LOADER FUNCTIONS ====================

function init() {
  injectStyles();
  injectHTML();
}

function show(message = "We're working on your request") {
  init();
  const backdrop = document.getElementById("loader-backdrop");
  const messageElement = document.getElementById("loaderMessage");

  if (messageElement) {
    messageElement.textContent = message;
  }

  backdrop.classList.add("active");
  document.body.style.overflow = "hidden";
}

function hide() {
  const backdrop = document.getElementById("loader-backdrop");

  if (backdrop) {
    backdrop.classList.remove("active");
  }

  document.body.style.overflow = "auto";
}

function hideAfter(delay = 2000) {
  setTimeout(() => hide(), delay);
}

function showTemporary(
  message = "We're working on your request",
  delay = 2000
) {
  show(message);
  hideAfter(delay);
}

async function execute(asyncFn, message = "We're working on your request") {
  show(message);
  try {
    const result = await asyncFn();
    return result;
  } catch (error) {
    console.error("Operation failed:", error);
    throw error;
  } finally {
    hide();
  }
}

// ==================== CREATE LOADER OBJECT ====================
const loader = {
  show,
  hide,
  hideAfter,
  showTemporary,
  execute,
};

// ==================== AUTO-INITIALIZE ====================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// ==================== ES6 MODULE EXPORT ====================
export default loader;
