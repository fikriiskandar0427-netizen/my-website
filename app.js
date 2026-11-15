(() => {
  "use strict";
  const STORAGE_KEY = "arus_finance_transactions_v1";
  const $ = (id) => document.getElementById(id);
  const categories = {
    income: ["Modal / Omzet"],
    expense: ["Operasional", "Delivery / Logistik", "Gaji Karyawan"],
    allocation: ["Dana Darurat"],
    withdrawal: ["Dana Darurat"]
  };
  const typeLabels = { income:"Pemasukan", expense:"Pengeluaran", allocation:"Alokasi dana darurat", withdrawal:"Penarikan dana darurat" };
  const categoryColors = { "Operasional":"#248d76", "Delivery / Logistik":"#e4a35d", "Gaji Karyawan":"#6d83b5" };
  let transactions = loadTransactions();
  let expenseChart = null, monthlyChart = null;
  let modal, toast;
  let amountRaw = "";

  function loadTransactions() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data.filter(validTransaction) : [];
    } catch (error) { console.warn("Data lokal tidak dapat dibaca:", error); return []; }
  }
  function validTransaction(t) {
    return t && typeof t.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
      ["income","expense","allocation","withdrawal"].includes(t.type) &&
      typeof t.category === "string" && Number.isFinite(Number(t.amount)) &&
      Number(t.amount) > 0 && typeof t.note === "string";
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }
    catch (error) { showToast("Penyimpanan penuh atau diblokir browser."); }
  }
  function rupiah(value) {
    return new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", maximumFractionDigits:0 }).format(value || 0);
  }
  function numberFormat(value) { return new Intl.NumberFormat("id-ID").format(value || 0); }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }
  function dateLabel(value) {
    return new Intl.DateTimeFormat("id-ID", { day:"2-digit", month:"short", year:"numeric" }).format(new Date(value + "T00:00:00"));
  }
  function totals() {
    let income = 0, expense = 0, emergency = 0;
    transactions.forEach(t => {
      const n = Number(t.amount);
      if (t.type === "income") income += n;
      if (t.type === "expense") expense += n;
      if (t.type === "allocation") emergency += n;
      if (t.type === "withdrawal") emergency -= n;
    });
    emergency = Math.max(0, emergency);
    return { income, expense, emergency, balance:income-expense, operational:income-expense-emergency };
  }
  function renderSummary() {
    const t = totals();
    $("totalBalance").textContent = rupiah(t.balance);
    $("totalIncome").textContent = rupiah(t.income);
    $("totalExpense").textContent = rupiah(t.expense);
    $("emergencyBalance").textContent = rupiah(t.emergency);
    $("operationalBalance").textContent = rupiah(t.operational);
    $("transactionCount").textContent = `${transactions.length} transaksi`;
  }
  function renderTable() {
    const q = $("searchInput").value.trim().toLowerCase();
    const category = $("categoryFilter").value;
    const month = $("monthFilter").value;
    const filtered = transactions.filter(t => {
      const matchesText = !q || `${t.note} ${t.category} ${typeLabels[t.type]}`.toLowerCase().includes(q);
      const matchesCategory = !category || t.category === category;
      const matchesMonth = !month || t.date.startsWith(month);
      return matchesText && matchesCategory && matchesMonth;
    }).sort((a,b) => b.date.localeCompare(a.date) || b.createdAt-a.createdAt);
    const body = $("transactionBody");
    if (!filtered.length) {
      body.innerHTML = `<tr><td colspan="6" class="empty-state">${transactions.length ? "Tidak ada transaksi yang cocok dengan filter." : "Belum ada transaksi. Tambahkan transaksi pertamamu."}</td></tr>`;
    } else {
      body.innerHTML = filtered.map(t => {
        const typeClass = t.type;
        const amountClass = t.type === "income" ? "amount-income" : t.type === "expense" ? "amount-expense" : "amount-neutral";
        const sign = t.type === "income" || t.type === "withdrawal" ? "+" : "−";
        return `<tr>
          <td>${dateLabel(t.date)}</td>
          <td><div class="desc-main">${escapeHTML(t.note)}</div><div class="desc-sub">${escapeHTML(typeLabels[t.type])}</div></td>
          <td><span class="category-pill">${escapeHTML(t.category)}</span></td>
          <td><span class="type-pill ${typeClass}">${escapeHTML(typeLabels[t.type])}</span></td>
          <td class="text-end ${amountClass}">${sign} ${rupiah(t.amount)}</td>
          <td><div class="action-buttons"><button class="icon-btn" title="Edit transaksi" aria-label="Edit transaksi" data-edit="${t.id}">✎</button><button class="icon-btn delete" title="Hapus transaksi" aria-label="Hapus transaksi" data-delete="${t.id}">×</button></div></td>
        </tr>`;
      }).join("");
    }
    $("tableCount").textContent = `Menampilkan ${filtered.length} dari ${transactions.length} transaksi`;
  }
  function updateCategoryOptions(selected) {
    const type = $("transactionType").value;
    $("transactionCategory").innerHTML = categories[type].map(c => `<option value="${c}">${c}</option>`).join("");
    if (selected && categories[type].includes(selected)) $("transactionCategory").value = selected;
    const hints = {
      income:"Catat omzet penjualan atau tambahan modal usaha.",
      expense:"Pengeluaran rutin usaha, biaya pengiriman, atau gaji.",
      allocation:"Memindahkan uang dari kas operasional ke dana cadangan.",
      withdrawal:"Mengambil dana cadangan untuk dikembalikan ke kas operasional."
    };
    $("categoryHelp").textContent = hints[type];
  }
  function renderCharts() {
    const year = Number($("chartYear").value || new Date().getFullYear());
    const expenseByCategory = { "Operasional":0, "Delivery / Logistik":0, "Gaji Karyawan":0 };
    const monthlyIncome = Array(12).fill(0), monthlyExpense = Array(12).fill(0);
    transactions.forEach(t => {
      const d = new Date(t.date + "T00:00:00");
      if (d.getFullYear() !== year) return;
      const month = d.getMonth();
      if (t.type === "income") monthlyIncome[month] += Number(t.amount);
      if (t.type === "expense") {
        monthlyExpense[month] += Number(t.amount);
        if (Object.prototype.hasOwnProperty.call(expenseByCategory, t.category)) expenseByCategory[t.category] += Number(t.amount);
      }
    });
    const labels = Object.keys(expenseByCategory);
    const values = labels.map(k => expenseByCategory[k]);
    const sumExpense = values.reduce((a,b)=>a+b,0);
    $("donutTotal").textContent = rupiah(sumExpense);
    $("expenseLegend").innerHTML = labels.map((label,i) => `<span class="legend-item"><i class="legend-swatch" style="background:${categoryColors[label]}"></i>${label}</span>`).join("");
    if (expenseChart) expenseChart.destroy();
    expenseChart = new Chart($("expenseChart"), {
      type:"doughnut",
      data:{ labels, datasets:[{ data:values, backgroundColor:labels.map(k=>categoryColors[k]), borderWidth:0, hoverOffset:5 }] },
      options:{ responsive:true, maintainAspectRatio:false, cutout:"74%", plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:ctx=>`${ctx.label}: ${rupiah(ctx.raw)}` } } } }
    });
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart($("monthlyChart"), {
      type:"bar",
      data:{ labels:["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"], datasets:[
        { label:"Pemasukan", data:monthlyIncome, backgroundColor:"#249b7c", borderRadius:5, maxBarThickness:19 },
        { label:"Pengeluaran", data:monthlyExpense, backgroundColor:"#e5a65d", borderRadius:5, maxBarThickness:19 }
      ]},
      options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:"index",intersect:false}, plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${rupiah(ctx.raw)}`}}}, scales:{
        x:{grid:{display:false},ticks:{font:{family:"DM Sans",size:9},color:"#8b999c"}},
        y:{beginAtZero:true,grid:{color:"#eef2f1"},ticks:{font:{family:"DM Sans",size:9},color:"#8b999c",callback:v=>v>=1000000?`${(v/1000000).toLocaleString("id-ID")} jt`:v>=1000?`${(v/1000).toLocaleString("id-ID")} rb`:v}}
      }}
    });
  }
  function renderAll() { renderSummary(); renderTable(); renderCharts(); }
  function showToast(message) {
    $("toastMessage").textContent = message;
    if (toast) toast.show();
  }
  function openCreate() {
    $("transactionForm").reset();
    $("editId").value = "";
    $("modalTitle").textContent = "Tambah transaksi";
    $("saveTransactionBtn").textContent = "Simpan transaksi";
    $("transactionDate").value = new Date().toLocaleDateString("en-CA");
    $("transactionType").value = "income";
    $("transactionAmount").value = "";
    updateCategoryOptions();
    modal.show();
  }
  function openEdit(id) {
    const t = transactions.find(x => x.id === id);
    if (!t) return;
    $("editId").value = t.id;
    $("modalTitle").textContent = "Edit transaksi";
    $("saveTransactionBtn").textContent = "Simpan perubahan";
    $("transactionDate").value = t.date;
    $("transactionType").value = t.type;
    updateCategoryOptions(t.category);
    $("transactionAmount").value = numberFormat(t.amount);
    $("transactionNote").value = t.note;
    modal.show();
  }
  function parseAmount() {
    const raw = $("transactionAmount").value.replace(/\D/g,"");
    return raw ? Number(raw) : 0;
  }
  function saveTransaction(event) {
    event.preventDefault();
    const id = $("editId").value;
    const type = $("transactionType").value;
    const amount = parseAmount();
    const date = $("transactionDate").value;
    const note = $("transactionNote").value.trim();
    if (!date || !amount || !Number.isSafeInteger(amount) || !note) { showToast("Lengkapi data dan pastikan nominal valid."); return; }
    const old = id ? transactions.find(t=>t.id===id) : null;
    if (type === "withdrawal") {
      const current = totals().emergency;
      const available = current + (old?.type === "allocation" ? -Number(old.amount) : old?.type === "withdrawal" ? Number(old.amount) : 0);
      if (amount > available) { showToast("Penarikan melebihi saldo dana darurat."); return; }
    }
    if (type === "allocation") {
      const available = totals().operational + (old?.type === "allocation" ? Number(old.amount) : old?.type === "withdrawal" ? -Number(old.amount) : 0);
      if (amount > available) { showToast("Alokasi melebihi kas operasional tersedia."); return; }
    }
    const record = { id:id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`), date, type, category:$("transactionCategory").value, amount, note, createdAt:Date.now() };
    if (id) {
      const index = transactions.findIndex(t=>t.id===id);
      if (index >= 0) { record.createdAt = transactions[index].createdAt; transactions[index] = record; }
      showToast("Transaksi berhasil diperbarui.");
    } else {
      transactions.push(record);
      showToast("Transaksi berhasil ditambahkan.");
    }
    persist(); renderAll(); modal.hide();
  }
  function deleteTransaction(id) {
    const t = transactions.find(x=>x.id===id);
    if (!t) return;
    if (!confirm(`Hapus transaksi "${t.note}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    transactions = transactions.filter(x=>x.id!==id);
    persist(); renderAll(); showToast("Transaksi berhasil dihapus.");
  }
  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], {type:mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportCSV() {
    const header = ["Tanggal","Jenis","Kategori","Nominal","Catatan"];
    const rows = transactions.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(t=>[t.date,typeLabels[t.type],t.category,t.amount,t.note]);
    const csv = [header,...rows].map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\r\n");
    downloadFile("\uFEFF"+csv,`laporan-keuangan-${new Date().toLocaleDateString("en-CA")}.csv`,"text/csv;charset=utf-8;");
    showToast("Laporan CSV berhasil dibuat.");
  }
  function backupJSON() {
    const payload = { app:"Arus Finance", version:1, exportedAt:new Date().toISOString(), transactions };
    downloadFile(JSON.stringify(payload,null,2),`backup-arus-${new Date().toLocaleDateString("en-CA")}.json`,"application/json");
    showToast("Backup JSON berhasil diunduh.");
  }
  function restoreJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const incoming = Array.isArray(parsed) ? parsed : parsed.transactions;
        if (!Array.isArray(incoming) || !incoming.every(validTransaction)) throw new Error("Format tidak valid");
        if (!confirm(`Pulihkan ${incoming.length} transaksi? Data saat ini akan diganti.`)) return;
        transactions = incoming;
        persist(); renderAll(); showToast("Data berhasil dipulihkan.");
      } catch (e) { alert("File backup tidak valid atau formatnya tidak didukung."); }
      $("restoreInput").value = "";
    };
    reader.onerror = () => alert("File tidak dapat dibaca.");
    reader.readAsText(file);
  }
  function initYearSelect() {
    const current = new Date().getFullYear();
    const years = new Set([current]);
    transactions.forEach(t=>years.add(Number(t.date.slice(0,4))));
    $("chartYear").innerHTML = [...years].sort((a,b)=>b-a).map(y=>`<option value="${y}">${y}</option>`).join("");
  }
  function init() {
    modal = new bootstrap.Modal($("transactionModal"));
    toast = new bootstrap.Toast($("appToast"), {delay:2600});
    $("todayLabel").textContent = new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
    initYearSelect(); renderAll();
    $("transactionType").addEventListener("change",()=>updateCategoryOptions());
    $("transactionAmount").addEventListener("input",e=>{
      const digits=e.target.value.replace(/\D/g,"");
      e.target.value=digits?numberFormat(Number(digits)):"";
    });
    $("transactionForm").addEventListener("submit",saveTransaction);
    $("addTransactionBtn").addEventListener("click",openCreate);
    $("topAddBtn").addEventListener("click",openCreate);
    $("transactionBody").addEventListener("click",e=>{
      const edit=e.target.closest("[data-edit]"), del=e.target.closest("[data-delete]");
      if(edit) openEdit(edit.dataset.edit);
      if(del) deleteTransaction(del.dataset.delete);
    });
    ["searchInput","categoryFilter","monthFilter"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",renderTable));
    $("resetFilters").addEventListener("click",()=>{$("searchInput").value="";$("categoryFilter").value="";$("monthFilter").value="";renderTable();});
    $("chartYear").addEventListener("change",renderCharts);
    $("sidebarExport").addEventListener("click",exportCSV);
    $("sidebarBackup").addEventListener("click",backupJSON);
    $("restoreInput").addEventListener("change",e=>restoreJSON(e.target.files[0]));
    $("menuToggle").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
    document.querySelectorAll(".sidebar .nav-link[href]").forEach(link=>link.addEventListener("click",()=>$("sidebar").classList.remove("open")));
    // Backup dan restore disediakan melalui tombol tambahan di footer data pada layar kecil dan menu samping.
    const backupBtn=document.createElement("button");
    backupBtn.className="btn btn-light-outline"; backupBtn.textContent="Backup JSON";
    backupBtn.addEventListener("click",backupJSON);
    const restoreBtn=document.createElement("button");
    restoreBtn.className="btn btn-light-outline"; restoreBtn.textContent="Restore JSON";
    restoreBtn.addEventListener("click",()=>$("restoreInput").click());
    const exportBtn=document.createElement("button");
    exportBtn.className="btn btn-light-outline"; exportBtn.textContent="Export CSV";
    exportBtn.addEventListener("click",exportCSV);
    const tools=document.createElement("div");
    tools.style.cssText="display:flex;gap:7px;flex-wrap:wrap;padding:12px 17px;border-top:1px solid #edf0f0";
    tools.append(exportBtn,backupBtn,restoreBtn);
    document.querySelector(".table-panel").append(tools);
  }
  document.addEventListener("DOMContentLoaded",init);
})();