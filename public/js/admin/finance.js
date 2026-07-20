/* =======================
   HELPERS
======================= */
let revenueExpenseChart;
let profitTrendChart;
let paymentSplitChart;
let expenseCategoryChart;

function getThisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function formatMonth(ym) {
  const [y, m] = ym.split("-");
  return new Date(y, m - 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

/* =======================
   Chart 
======================= */
async function loadCharts(start, end) {
  const res = await fetch(
    `/api/admin/finance/charts?start=${start}&end=${end}`
  );
  if (!res.ok) throw new Error("Chart API failed");
  return await res.json();
}

function renderCharts(data) {
  /* ===== Revenue vs Expense ===== */
  const ctx1 = document.getElementById("revenueExpenseChart");
  revenueExpenseChart?.destroy();

  revenueExpenseChart = new Chart(ctx1, {
    type: "bar",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "Revenue",
          data: data.revenue,
          backgroundColor: "#22c55e",
        },
        {
          label: "Expenses",
          data: data.expenses,
          backgroundColor: "#ef4444",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" } },
    },
  });

  /* ===== Profit Trend ===== */
  const ctx2 = document.getElementById("profitTrendChart");
  profitTrendChart?.destroy();

  profitTrendChart = new Chart(ctx2, {
    type: "line",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "Net Profit",
          data: data.profit,
          borderColor: "#3b82f6",
          tension: 0.3,
        },
      ],
    },
  });
  /* ===== Expense Category ===== */
  const ctx4 = document.getElementById("expenseCategoryChart");
  expenseCategoryChart?.destroy();

  expenseCategoryChart = new Chart(ctx4, {
    type: "pie",
    data: {
      labels: Object.keys(data.expenseCategory),
      datasets: [
        {
          data: Object.values(data.expenseCategory),
          backgroundColor: ["#ef4444", "#f59e0b", "#6366f1", "#22c55e"],
        },
      ],
    },
  });
}

async function loadFinanceCharts(start, end) {
  const res = await fetch(
    `/api/admin/finance/charts?start=${start}&end=${end}`
  );

  if (!res.ok) {
    console.error("Chart data fetch failed");
    return;
  }

  const data = await res.json();

  renderRevenueExpenseChart(data);
  renderProfitTrendChart(data);
  renderPaymentSplitChart(data);
  renderExpenseCategoryChart(data);
}

function renderRevenueExpenseChart(data) {
  const ctx = document.getElementById("revenueExpenseChart");

  if (revenueExpenseChart) revenueExpenseChart.destroy();

  revenueExpenseChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "Revenue",
          data: data.revenue,
          backgroundColor: "#22c55e",
          borderRadius: 8,
        },
        {
          label: "Expenses",
          data: data.expenses,
          backgroundColor: "#ef4444",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top" } },
    },
  });
}

function renderProfitTrendChart(data) {
  const ctx = document.getElementById("profitTrendChart");

  if (profitTrendChart) profitTrendChart.destroy();

  profitTrendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "Net Profit",
          data: data.profit,
          borderColor: "#0f172a",
          backgroundColor: "rgba(15,23,42,0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

function renderPaymentSplitChart(data) {
  const ctx = document.getElementById("paymentSplitChart");

  if (paymentSplitChart) paymentSplitChart.destroy();

  paymentSplitChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(data.paymentSplit),
      datasets: [
        {
          data: Object.values(data.paymentSplit),
          backgroundColor: ["#22c55e", "#3b82f6", "#f59e0b"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

function renderExpenseCategoryChart(data) {
  const ctx = document.getElementById("expenseCategoryChart");

  if (expenseCategoryChart) expenseCategoryChart.destroy();

  expenseCategoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(data.expenseCategory),
      datasets: [
        {
          data: Object.values(data.expenseCategory),
          backgroundColor: ["#ef4444", "#f97316", "#eab308", "#64748b"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

/* =======================
   FINANCE SUMMARY
======================= */

const startInput = document.getElementById("start-date");
const endInput = document.getElementById("end-date");

async function loadFinanceSummary(start, end) {
  try {
    const res = await fetch(
      `/api/admin/finance/summary?start=${start}&end=${end}`
    );
    if (!res.ok) {
      throw new Error("Failed to load finance summary");
    }
    const data = await res.json();
    console.log(data);

    document.getElementById("total-income").textContent =
      `₹${data.totalRevenue.toLocaleString("en-IN")}`;
    document.getElementById("total-collected").textContent =
      data.totalCollected.toLocaleString("en-IN");
    document.getElementById("pending-dues").textContent =
      data.pendingDues.amount.toLocaleString("en-IN");
    document.getElementById("pending-count").textContent =
      data.pendingDues.count;
    document.getElementById("cash-reserved").textContent =
      data.cashReserve.amount.toLocaleString("en-IN");
    document.getElementById("months-runway").textContent =
      data.reserveRunway.months || "0";
  } catch (error) {
    throw new Error(error);
  }
}

/* =======================
   EXPENSES
======================= */

async function loadExpenses(start, end) {
  try {
    const res = await fetch(
      `/api/admin/finance/expenses?start=${start}&end=${end}`
    );
    if (!res.ok) {
      throw new Error("Failed to load expenses");
    }
    const data = await res.json();
    if (!data || !data.data) {
      throw new Error("Invalid expenses data");
    }

    document.getElementById("total-expenses").textContent =
      `₹${data.summary.totalExpenses.toLocaleString("en-IN")}`;

    const tbody = document.getElementById("expenses-body");
    tbody.innerHTML = "";

    data.data.forEach(exp => {
      tbody.innerHTML += `
      <tr class="hover:bg-slate-50/50">
        <td class="px-8 py-5 font-bold">${exp.title}</td>
        <td class="px-6 py-5 text-xs font-bold">${exp.category}</td>
        <td class="px-6 py-5 font-black text-red-500">
          ₹${exp.amount.toLocaleString("en-IN")}
        </td>
        <td class="px-6 py-5 text-xs">${exp.paidVia}</td>
        <td class="px-6 py-5 text-xs">
          ${new Date(exp.expenseDate).toLocaleDateString("en-IN")}
        </td>
        <td class="px-8 py-5 text-right text-xs text-slate-400">
          ${exp.notes || "-"}
        </td>
      </tr>
    `;
    });
  } catch (error) {
    throw new Error(error);
  }
}

/* =======================
   SALARY SUMMARY
======================= */

async function loadSalarySummary() {
  try {
    const res = await fetch("/api/admin/salaries/summary");
    const data = await res.json();

    document.getElementById("salary-total").textContent = `₹${data.total}`;
    document.getElementById("salary-paid").textContent = `₹${data.paid}`;
    document.getElementById("salary-pending").textContent = `₹${data.pending}`;
  } catch (error) {
    throw new Error(error);
  }
}

/* =======================
   STAFF DROPDOWN
======================= */

async function populateSalaryStaff() {
  try {
    const res = await fetch("/api/admin/staff");
    const staff = await res.json();

    const select = document.getElementById("salary-staff");
    select.innerHTML = `<option value="">Select Staff</option>`;

    staff.forEach(s => {
      select.innerHTML += `
      <option value="${s._id}">
        ${s.name} (${s.role})
      </option>
    `;
    });
  } catch (error) {
    throw new Error(error);
  }
}

/* =======================
   SALARY TABLE
======================= */

async function loadSalaryTable() {
  try {
    const [salaryRes, staffRes] = await Promise.all([
      fetch("/api/admin/salaries"),
      fetch("/api/admin/staff"),
    ]);

    const { month, salaries } = await salaryRes.json();
    const staff = await staffRes.json();

    const salaryMap = new Map(salaries.map(s => [s.staff._id, s]));

    const tbody = document.getElementById("salary-body");
    tbody.innerHTML = "";

    staff.forEach(st => {
      const s = salaryMap.get(st._id);

      tbody.innerHTML += `
      <tr class="hover:bg-slate-50">
        <td class="px-8 py-5 font-bold">${st.name}</td>
        <td class="px-6 py-5 text-xs">${st.role}</td>
        <td class="px-6 py-5 text-xs">${formatMonth(month)}</td>
        <td class="px-6 py-5 text-xs">${s?.paymentType || "-"}</td>
        <td class="px-6 py-5 font-black">₹${s?.amount || 0}</td>
        <td class="px-6 py-5">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
            s?.status === "Paid"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-orange-50 text-orange-600"
          }">
            ${s?.status || "Pending"}
          </span>
        </td>
        <td class="px-8 py-5 text-right text-xs">
          ${s?.notes || "-"}
        </td>
      </tr>
    `;
    });
  } catch (error) {
    throw new Error(error);
  }
}

/* =======================
   SALARY MODAL
======================= */

document.getElementById("add-salary-btn").onclick = () => {
  const modal = document.getElementById("salary-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  populateSalaryStaff();
};
document.getElementById("add-expense-btn").onclick = () => {
  const modal = document.getElementById("expense-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
};

const cancelSalaryBtn = document.getElementById("cancel-salary");
if (cancelSalaryBtn) {
  cancelSalaryBtn.onclick = () => {
    document.getElementById("salary-modal").classList.add("hidden");
  };
}

const cancelExpenseBtn = document.getElementById("cancel-expense");
if (cancelExpenseBtn) {
  cancelExpenseBtn.onclick = () => {
    document.getElementById("expense-modal").classList.add("hidden");
  };
}

document.getElementById("salary-modal").addEventListener("click", e => {
  if (e.target.id === "salary-modal") {
    e.target.classList.add("hidden");
  }
});

/* =======================
   SAVE SALARY
======================= */
const saveSalaryBtn = document.getElementById("save-salary-btn");
if (saveSalaryBtn) {
  saveSalaryBtn.onclick = async e => {
    e.preventDefault();
    console.log("Saving salary...");

    const payload = {
      staff: document.getElementById("salary-staff").value,
      amount: Number(document.getElementById("salary-amount").value),
      paymentType: document.getElementById("salary-type").value,
      status: document.getElementById("salary-status").value,
      notes: document.getElementById("salary-notes").value,
    };
    console.log(payload);

    if (!payload.staff || !payload.amount || !payload.paymentType) {
      alert("Please fill all required fields");
      return;
    }

    const res = await fetch("/api/admin/salaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error("Failed to add salary");
    }

    document.getElementById("salary-modal").classList.add("hidden");
    loadSalarySummary();
    loadSalaryTable();
  };
}

const saveExpenseBtn = document.getElementById("save-expense-btn");
if (saveExpenseBtn) {
  saveExpenseBtn.onclick = async e => {
    e.preventDefault();
    console.log("Saving expense...");

    const payload = {
      title: document.getElementById("expense-title").value,
      amount: document.getElementById("expense-amount").value,
      category: document.getElementById("expense-category").value,
      paidVia: document.getElementById("expense-paid-via").value,
      expenseDate: document.getElementById("expense-date").value,
      notes: document.getElementById("expense-notes").value,
    };

    console.log(payload);

    if (!payload.amount || !payload.title || !payload.expenseDate) {
      alert("Please enter all required fields");
      return;
    }

    const res = await fetch("/api/admin/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(res);

    if (!res.ok) {
      throw new Error("Failed to add expense");
    }

    document.getElementById("expense-modal").classList.add("hidden");
    const start = new Date();
    const end = new Date();
    loadExpenses(start, end);
  };
}

function getDateFunction(e) {
  const preset = e.target.getAttribute("data-preset");

  let start;
  let end;

  const now = new Date();

  switch (preset) {
    case "last-7": {
      start = new Date(now);
      end = new Date(now);

      start.setDate(start.getDate() - 7);
      end.setDate(end.getDate() - 1);
      break;
    }

    case "last-30": {
      start = new Date(now);
      end = new Date(now);

      start.setDate(start.getDate() - 30);
      end.setDate(end.getDate() - 1);
      break;
    }

    case "last-quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);

      start = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      end = new Date(now.getFullYear(), currentQuarter * 3, 0);
      break;
    }

    case "last-year": {
      const year = now.getFullYear() - 1;

      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31);
      break;
    }

    default: {
      start = new Date(now);
      end = new Date(now);
    }
  }

  // 🔒 normalize time (VERY IMPORTANT)
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  console.log("Finance Range:", start.toISOString(), end.toISOString());

  return { start, end };
}

/* =======================
   INIT
======================= */

document.addEventListener("DOMContentLoaded", async () => {
  const range = getThisMonthRange();

  const currentPage = window.location.pathname
    .split("/")
    .pop()
    .replace(".html", "");

  document.querySelectorAll(".nav-link").forEach(link => {
    const page = link.dataset.page;

    if (page === currentPage) {
      link.classList.remove("text-slate-500");
      link.classList.add("bg-emerald-500", "text-white", "shadow-lg");
    } else {
      link.classList.remove("bg-emerald-500", "text-white", "shadow-lg");
      link.classList.add("text-slate-500");
    }
  });

  const startInput = document.getElementById("start-date");
  const endInput = document.getElementById("end-date");

  startInput.addEventListener("change", async () => {
    loadFinanceSummary(startInput.value, endInput.value);
    loadExpenses(startInput.value, endInput.value);

    const chartData = await loadCharts(startInput.value, endInput.value);
    renderCharts(chartData);
  });

  const presetButton = document.querySelectorAll(".preset-btn");

  presetButton.forEach(button => {
    button.addEventListener("click", async () => {
      const { start, end } = getDateFunction(event);

      startInput.value = start.toISOString().split("T")[0];
      endInput.value = end.toISOString().split("T")[0];

      loadFinanceSummary(startInput.value, endInput.value);
      loadExpenses(startInput.value, endInput.value);

      const chartData = await loadCharts(startInput.value, endInput.value);
      renderCharts(chartData);
    });
  });

  const quickRange = document.getElementById("quickRange");

  quickRange.addEventListener("change", async () => {
    const range = quickRange.value;

    let start = new Date();
    let end = new Date();

    switch (range) {
      case "today":
        break;

      case "week":
        start.setDate(start.getDate() - 7);
        break;

      case "month":
        start.setMonth(start.getMonth() - 1);
        break;

      case "year":
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    // normalize
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    startInput.value = start.toISOString().split("T")[0];
    endInput.value = end.toISOString().split("T")[0];

    loadFinanceSummary(startInput.value, endInput.value);
    loadExpenses(startInput.value, endInput.value);

    const chartData = await loadCharts(startInput.value, endInput.value);
    renderCharts(chartData);
  });

  endInput.addEventListener("change", async () => {
    loadFinanceSummary(startInput.value, endInput.value);
    loadExpenses(startInput.value, endInput.value);

    const chartData = await loadCharts(startInput.value, endInput.value);
    renderCharts(chartData);
  });

  startInput.value = range.start;
  endInput.value = range.end;

  loadFinanceSummary(range.start, range.end);
  loadExpenses(range.start, range.end);

  loadSalarySummary();
  loadSalaryTable();

  const chartData = await loadCharts(range.start, range.end);
  renderCharts(chartData);
});
