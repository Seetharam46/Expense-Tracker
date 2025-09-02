window.onload = function () {
  const expenseList = document.getElementById('expenseList');
  const searchInput = document.getElementById('search');
  const categoryFilter = document.getElementById('categoryFilter');
  const monthFilter = document.getElementById('monthFilter');
  const addBtn = document.getElementById('addBtn');
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
  // Delete modal
  const confirmModal = document.getElementById('confirmModal');
  const confirmMessage = document.getElementById('confirmMessage');
  const cancelDeleteBtn = document.getElementById('cancelDelete');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
  let lastUsedCategory = localStorage.getItem('lastUsedCategory') || '';
  let lastDeleted = null;
  let lastDeletedIndex = null;
  let deleteIndexPending = null;
  const getMonthStr = (dt = new Date()) =>
    dt.toLocaleString('default', { month: 'long', year: 'numeric' });
  const getDay = (dt = new Date()) => dt.getDate().toString().padStart(2, '0');

  function openModal(isEdit = false, idx = null) {
    modal.classList.add('show');
    form.reset();
    editIdx.value = '';
    categorySelect.value = lastUsedCategory || '';
    saveBtn.disabled = true;
    if (isEdit) {
      const e = expenses[idx];
      amountInput.value = e.amount;
      noteInput.value = e.note;
      categorySelect.value = e.category;
      editIdx.value = idx;
      document.getElementById('modalTitle').textContent = 'Edit Expense';
    } else {
      document.getElementById('modalTitle').textContent = 'Add Expense';
    }
    setTimeout(() => amountInput.focus(), 150);
  }

  function closeMainModal() { modal.classList.remove('show'); }

  form.addEventListener('input', () => {
    const amtVal = amountInput.value.trim();
    saveBtn.disabled = !(amtVal && Number(amtVal) !== 0 && categorySelect.value && noteInput.value);
  });

  form.onsubmit = (e) => {
    e.preventDefault();
    const amount = Number(amountInput.value.trim());
    const category = categorySelect.value;
    const note = noteInput.value.trim();
    if (isNaN(amount) || amount === 0 || !category || !note) return false;
    const now = new Date();
    if (editIdx.value) {
      const idx = +editIdx.value;
      expenses[idx] = { ...expenses[idx], amount, category, note };
    } else {
      expenses.unshift({
        day: getDay(now),
        category,
        note,
        amount,
        month: getMonthStr(now),
        date: now.toISOString()
      });
    }
    localStorage.setItem('expenses', JSON.stringify(expenses));
    lastUsedCategory = category;
    localStorage.setItem('lastUsedCategory', category);
    closeMainModal();
    renderAll();
  };

  closeModal.onclick = closeMainModal;
  addBtn.onclick = () => openModal(false);

  function renderSummaryPanel() {
    const search = searchInput.value.toLowerCase();
    const cat = categoryFilter.value;
    const mn = monthFilter.value;
    const filtered = expenses.filter(e =>
      (cat === 'all' || e.category === cat) &&
      (mn === 'all' || e.month === mn) &&
      (!search || e.note.toLowerCase().includes(search) || e.amount.toString().includes(search))
    );
    const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);
    summaryAmount.innerHTML =
      `<div class="summary-inline-amount ${total < 0 ? 'negative' : 'positive'}">₹ ${total}</div>`;
    summaryPanelBody.innerHTML = filtered.length === 0 ? `<div>No expenses found.</div>` : '';
  }

  function openSummaryPanel() { renderSummaryPanel(); summaryPanel.classList.add('open'); }
  function closeSummaryPanel() { summaryPanel.classList.remove('open'); }
  openSummaryBtn.onclick = openSummaryPanel;
  closeSummaryBtn.onclick = closeSummaryPanel;
  searchInput.addEventListener('input', renderAll);
  categoryFilter.addEventListener('change', renderAll);
  monthFilter.addEventListener('change', renderAll);

  // Delete modal
  function openDeleteModal(idx) {
    deleteIndexPending = idx;
    const e = expenses[idx];
    confirmMessage.textContent = `Delete "${e.note}" of ₹ ${e.amount}?`;
    confirmModal.classList.add('show');
  }

  function closeDeleteModal() {
    confirmModal.classList.remove('show');
    deleteIndexPending = null;
  }

  cancelDeleteBtn.onclick = closeDeleteModal;

  confirmDeleteBtn.onclick = () => {
    if (deleteIndexPending !== null) {
      lastDeleted = expenses[deleteIndexPending];
      lastDeletedIndex = deleteIndexPending;
      expenses.splice(deleteIndexPending, 1);
      localStorage.setItem('expenses', JSON.stringify(expenses));
      renderAll();
      snackbar.style.display = "block";
      setTimeout(() => { snackbar.style.display = "none"; }, 3000);
    }
    closeDeleteModal();
  };

  confirmModal.onclick = (e) => { if (e.target.id === 'confirmModal') closeDeleteModal(); };
  undoBtn.onclick = () => {
    if (lastDeleted) {
      expenses.splice(lastDeletedIndex, 0, lastDeleted);
      localStorage.setItem('expenses', JSON.stringify(expenses));
      renderAll();
      lastDeleted = null;
      snackbar.style.display = "none";
    }
  };

  function renderAll() {
    let list = [...expenses];
    const s = searchInput.value.toLowerCase();
    if (s) list = list.filter(e => e.note.toLowerCase().includes(s) || e.amount.toString().includes(s));
    if (categoryFilter.value !== 'all') list = list.filter(e => e.category === categoryFilter.value);

    // Preserve selected month filter value before repopulating options
    const currentMonth = monthFilter.value;

    // Populate months from filtered list only
    let months = [...new Set(list.map(e => e.month))];
    if (!months.length) months = [getMonthStr()];
    monthFilter.innerHTML =
      '<option value="all">All Months</option>' +
      months.map(m => `<option>${m}</option>`).join('');

    // Restore previous selected month if still available, else 'all'
    if (months.includes(currentMonth)) {
      monthFilter.value = currentMonth;
    } else {
      monthFilter.value = 'all';
    }

    // Filter by selected month after updating options
    if (monthFilter.value !== 'all') list = list.filter(e => e.month === monthFilter.value);

    expenseList.innerHTML = '';
    const grouped = {};
    list.forEach(e => {
      if (!grouped[e.month]) grouped[e.month] = [];
      grouped[e.month].push(e);
    });
    months.forEach(m => {
      if (!grouped[m]) return;
      expenseList.innerHTML += `<div class="month-row">${m}</div>`;
      grouped[m].forEach(e => {
        const idx = expenses.findIndex(x => x === e);
        expenseList.innerHTML += `
          <div class="expense-item">
            <div class="info">
              <span class="day">${e.day}</span>
              <span class="amount ${e.amount < 0 ? 'negative' : 'positive'}">₹ ${e.amount}</span>
              <span class="category">${e.category}</span>
              <span class="note">${e.note}</span>
            </div>
            <div class="actions">
              <button class="edit" data-index="${idx}">✏</button>
              <button class="delete" data-index="${idx}">🗑</button>
            </div>
          </div>
        `;
      });
    });

    document.querySelectorAll('.edit').forEach(b => b.onclick = () => openModal(true, parseInt(b.dataset.index)));
    document.querySelectorAll('.delete').forEach(b => b.onclick = () => openDeleteModal(parseInt(b.dataset.index)));

    if (summaryPanel.classList.contains('open')) renderSummaryPanel();
  }

  renderAll();
};
