window.onload = function () {
  const expenseList = document.getElementById('expenseList');
  const searchInput = document.getElementById('search');
  const categoryFilter = document.getElementById('categoryFilter');
  const monthFilter = document.getElementById('monthFilter');
  const addBtn = document.getElementById('addBtn');
  const chartCanvas = document.getElementById('comparisonChart');
  const summaryPanel = document.getElementById('summaryPanel');
  const openSummaryBtn = document.getElementById('openSummaryBtn');
  const closeSummaryBtn = document.getElementById('closeSummaryBtn');
  const summaryPanelBody = document.getElementById('summaryPanelBody');
  const summaryAmount = document.getElementById('summaryAmount');
  const modal = document.getElementById('expenseModal');
  const closeModal = document.getElementById('closeModal');
  const form = document.getElementById('expenseForm');
  const saveBtn = document.getElementById('saveBtn');
  const snackbar = document.getElementById('snackbar');
  const undoBtn = document.getElementById('undoButton');
  const categorySelect = document.getElementById('category');
  const amountInput = document.getElementById('amount');
  const noteInput = document.getElementById('note');
  const editIdx = document.getElementById('editIdx');

  let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
  let lastUsedCategory = localStorage.getItem('lastUsedCategory') || '';
  let lastDeleted = null;
  let lastDeletedIndex = null;

  const getMonthStr = (dt = new Date()) =>
    dt.toLocaleString('default', { month: 'long', year: 'numeric' });
  const getDay = (dt = new Date()) => dt.getDate().toString().padStart(2, '0');

  function focusModalInput() {
    setTimeout(() => amountInput.focus(), 230);
  }

  function openModal(isEdit = false, idx = null) {
    modal.classList.add('show');
    form.reset();
    editIdx.value = '';
    categorySelect.value = lastUsedCategory || '';
    saveBtn.disabled = true;
    noteInput.value = '';
    if (isEdit && idx !== null) {
      const e = expenses[idx];
      form.amount.value = e.amount;
      form.note.value = e.note;
      form.category.value = e.category;
      editIdx.value = idx;
      document.getElementById('modalTitle').textContent = 'Edit Expense';
    } else {
      document.getElementById('modalTitle').textContent = 'Add Expense';
    }
    focusModalInput();
  }

  function closeMainModal() {
    modal.classList.remove('show');
  }

  form.addEventListener('input', () => {
    saveBtn.disabled = !(amountInput.value && categorySelect.value && noteInput.value && noteInput.value.length <= 15);
  });

  form.onsubmit = (e) => {
    e.preventDefault();
    const amount = Number(amountInput.value.trim());
    const category = categorySelect.value;
    const note = noteInput.value.trim();

    if (isNaN(amount) || amount === 0 || !category || !note || note.length > 15) return false;

    let edIdx = editIdx.value;
    const dt = new Date(),
      day = getDay(dt),
      month = getMonthStr(dt);

    if (edIdx !== '') {
      edIdx = +edIdx;
      expenses[edIdx] = { ...expenses[edIdx], amount, category, note };
    } else {
      expenses.unshift({ day, category, note, amount, month, date: dt.toISOString() });
    }

    localStorage.setItem('expenses', JSON.stringify(expenses));
    lastUsedCategory = category;
    localStorage.setItem('lastUsedCategory', category);
    closeMainModal();
    renderAll();
  };

  closeModal.onclick = closeMainModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeMainModal();
  };

  addBtn.onclick = () => openModal(false, null);

  window.addEventListener("keydown", (e) => {
    if (modal.classList.contains("show") && e.key === "Escape") closeMainModal();
    if (summaryPanel.classList.contains("open") && e.key === "Escape") closeSummaryPanel();
  });

  function deleteExpense(idx) {
    lastDeleted = expenses[idx];
    lastDeletedIndex = idx;
    expenses.splice(idx, 1);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    renderAll();
    snackbar.style.display = "block";
    setTimeout(() => { snackbar.style.display = "none"; }, 3200);
  }

  undoBtn.onclick = () => {
    if (lastDeleted) {
      expenses.splice(lastDeletedIndex, 0, lastDeleted);
      localStorage.setItem('expenses', JSON.stringify(expenses));
      renderAll();
      lastDeleted = null;
      lastDeletedIndex = null;
      snackbar.style.display = "none";
    }
  };

  searchInput.addEventListener('input', renderAll);
  categoryFilter.addEventListener('change', renderAll);
  monthFilter.addEventListener('change', renderAll);

  openSummaryBtn.onclick = openSummaryPanel;
  closeSummaryBtn.onclick = closeSummaryPanel;

  function openSummaryPanel() {
    renderSummaryPanel();
    summaryPanel.classList.add('open');
  }

  function closeSummaryPanel() {
    summaryPanel.classList.remove('open');
  }

  function renderSummaryPanel() {
    const search = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedMonth = monthFilter.value;
    const filtered = expenses.filter(
      (e) =>
        (selectedCategory === 'all' || e.category === selectedCategory) &&
        (selectedMonth === 'all' || e.month === selectedMonth) &&
        (!search || e.note.toLowerCase().includes(search) || e.amount.toString().includes(search))
    );
    const total = filtered.reduce((acc, e) => acc + Number(e.amount), 0);
    summaryAmount.innerHTML = `
      <div class="summary-inline-amount ${total < 0 ? 'negative' : 'positive'}">₹${total}</div>
    `;
    summaryPanelBody.innerHTML =
      filtered.length === 0
        ? `<div class="summary-total-empty">No expenses found for the selected filter(s).</div>`
        : '';
  }

  function renderAll() {
    let list = expenses.slice();
    const s = searchInput.value.trim().toLowerCase();
    if (s) list = list.filter(e => e.note.toLowerCase().includes(s) || e.amount.toString().includes(s));
    const cat = categoryFilter.value;
    if (cat !== 'all') list = list.filter(e => e.category === cat);
    const mn = monthFilter.value;
    if (mn !== 'all') list = list.filter(e => e.month === mn);

    const monthsObj = {};
    list.forEach((e) => {
      if (!monthsObj[e.month]) monthsObj[e.month] = [];
      monthsObj[e.month].push(e);
    });

    let months = [...new Set(expenses.map((e) => e.month))];
    if (months.length === 0) months = [getMonthStr()];
    monthFilter.innerHTML = '<option value="all">All Months</option>' + months.map(m => `<option>${m}</option>`).join('');

    expenseList.innerHTML = '';
    for (const m of months) {
      if (!monthsObj[m] || monthsObj[m].length === 0) continue;
      const row = document.createElement('div');
      row.className = 'month-row';
      row.innerHTML = `<span class="month-title">${m}</span>`;
      expenseList.appendChild(row);

      monthsObj[m].forEach(e => {
        const iAll = expenses.findIndex(q => q === e);
        const div = document.createElement('div');
        div.className = 'expense-item';
        div.innerHTML = `
          <div class="info">
            <span class="day">${e.day}</span>
            <span class="amount ${e.amount < 0 ? 'negative' : 'positive'}">₹${e.amount}</span>
            <span class="category">${e.category}</span>
            <span class="note">${e.note}</span>
          </div>
          <div class="actions" role="group" aria-label="Edit or delete expense">
            <button class="edit" title="Edit" tabindex="0" aria-label="Edit" data-index="${iAll}">✏</button>
            <button class="delete" title="Delete" tabindex="0" aria-label="Delete" data-index="${iAll}">🗑</button>
          </div>
        `;
        expenseList.appendChild(div);
      });
    }

    expenseList.querySelectorAll('.edit').forEach(btn =>
      btn.onclick = () => openModal(true, parseInt(btn.dataset.index))
    );
    expenseList.querySelectorAll('.delete').forEach(btn =>
      btn.onclick = () => deleteExpense(parseInt(btn.dataset.index))
    );
    renderChart();
    if (summaryPanel.classList.contains('open')) renderSummaryPanel();
  }

  let chart = null;
  function renderChart() {
    let byMonth = {};
    expenses.forEach(e => {
      if (!byMonth[e.month]) byMonth[e.month] = { Transport: 0, Food: 0, Others: 0 };
      byMonth[e.month][e.category] += Number(e.amount) || 0;
    });

    const labels = Object.keys(byMonth).sort().reverse();
    const dataTransport = labels.map(m => byMonth[m]?.Transport || 0);
    const dataFood = labels.map(m => byMonth[m]?.Food || 0);
    const dataOthers = labels.map(m => byMonth[m]?.Others || 0);

    if (chart) chart.destroy();
    chart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Transport', data: dataTransport, backgroundColor: "#0d8a6a" },
          { label: 'Food', data: dataFood, backgroundColor: "#d4a037" },
          { label: 'Others', data: dataOthers, backgroundColor: "#3a7bbd" },
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true, position: 'bottom' },
          tooltip: { enabled: true }
        },
        scales: {
          x: { stacked: true },
          y: {
            grace: '14%',
            ticks: {
              callback: (value) => '₹' + value
            }
          }
        }
      }
    });
  }

  Array.from(document.querySelectorAll("button, [tabindex='0']")).forEach(el => {
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.click();
      }
    });
  });

  renderAll();
};
  
