/**
 * Tujuan file/module: Mengatur perilaku dashboard admin baru meliputi fetch summary/anggota, chart, filter-sort tabel, polling live, sidebar responsif dengan drawer mobile yang mudah ditutup, active nav section, dan submit form admin.
 * Dipakai oleh: /web/admin.html setelah /web/js/app.js dan /web/js/api.js dimuat di browser admin.
 * Dependensi utama: postApi(), formatRupiah(), formatDate(), formToObject(), showMessage(), localStorage, dan Chart.js CDN bila tersedia.
 * Fungsi public/utama: initAdminPage(), refreshDashboard(), renderSummary(), renderMemberTable(), renderCharts(), syncSidebarMode(), initSectionObserver(), dan handler submit untuk 4 form admin.
 * Side effect penting: HTTP POST ke /api/dashboard-admin dan /api/admin/*, update DOM dashboard admin, memakai polling interval, membaca/menulis state ringan di localStorage, dan mengubah state drawer/active navigation.
 */
const msg = document.getElementById('admin-message');

const sumTotal = document.getElementById('sum-total-anggota');
const sumAktif = document.getElementById('sum-aktif');
const sumTunggakanBulanan = document.getElementById('sum-tunggakan-bulanan');
const sumTunggakanKas = document.getElementById('sum-tunggakan-kas');
const tableAnggota = document.getElementById('table-anggota');

const formAnggota = document.getElementById('form-anggota');
const formSetting = document.getElementById('form-setting-iuran');
const formBulanan = document.getElementById('form-iuran-bulanan');
const formKas = document.getElementById('form-iuran-kas');
const btnLogout = document.getElementById('btn-logout-admin');

const syncIndicator = document.getElementById('admin-sync-indicator');
const syncText = document.getElementById('admin-sync-text');
const lastUpdatedLabel = document.getElementById('admin-last-updated');
const heroActiveRate = document.getElementById('hero-active-rate');
const heroTotalOutstanding = document.getElementById('hero-total-outstanding');
const heroRefreshState = document.getElementById('hero-refresh-state');
const memberTableCount = document.getElementById('member-table-count');
const memberSearch = document.getElementById('member-search');
const memberStatusFilter = document.getElementById('member-status-filter');
const memberSort = document.getElementById('member-sort');
const sortButtons = Array.from(document.querySelectorAll('[data-sort-key]'));
const refreshButtons = Array.from(document.querySelectorAll('[data-refresh-dashboard]'));
const metricCards = Array.from(document.querySelectorAll('[data-metric-card]'));
const sidebar = document.getElementById('admin-sidebar');
const sidebarBackdrop = document.getElementById('admin-sidebar-backdrop');
const sidebarToggle = document.getElementById('btn-sidebar-toggle');
const sidebarClose = document.getElementById('btn-sidebar-close');
const navLinks = Array.from(document.querySelectorAll('.admin-nav__link-clean[data-target], .admin-nav__subitem[data-target]'));
const navToggles = Array.from(document.querySelectorAll('.admin-nav__group-toggle'));
const viewSections = Array.from(document.querySelectorAll('.view-section'));
const pageLoader = document.getElementById('page-loader');

const chartMemberStatus = document.getElementById('chart-member-status');
const chartFinanceBalance = document.getElementById('chart-finance-balance');
const chartDojoDistribution = document.getElementById('chart-dojo-distribution');
const chartMemberStatusFallback = document.getElementById('chart-member-status-fallback');
const chartFinanceBalanceFallback = document.getElementById('chart-finance-balance-fallback');
const chartDojoDistributionFallback = document.getElementById('chart-dojo-distribution-fallback');

const POLL_INTERVAL_MS = 45000;
const TABLE_COLUMN_COUNT = 7;
const STATUS_SORT_ORDER = {
  Aktif: 0,
  Cuti: 1,
  Nonaktif: 2,
};

const state = {
  summary: {},
  members: [],
  filteredMembers: [],
  sortKey: 'nama_lengkap',
  sortDirection: 'asc',
  searchTerm: '',
  statusFilter: 'all',
  lastUpdatedAt: null,
  pollTimerId: null,
  isLoading: false,
  charts: {
    memberStatus: null,
    financeBalance: null,
    dojoDistribution: null,
  },
  currentView: 'section-overview'
};

btnLogout?.addEventListener('click', () => {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_profile');
  stopPolling();
  window.location.href = '/';
});

sidebarToggle?.addEventListener('click', () => {
  toggleSidebar();
});

sidebarClose?.addEventListener('click', () => {
  toggleSidebar(false);
});

sidebarBackdrop?.addEventListener('click', () => {
  toggleSidebar(false);
});

navToggles.forEach((btn) => {
  btn.addEventListener('click', () => {
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !isExpanded);
  });
});

navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.dataset.target;
    if (target) {
      switchView(target);
    }
  });
});

async function switchView(targetId) {
  if (state.currentView === targetId && document.getElementById(targetId) && !document.getElementById(targetId).classList.contains('hidden')) return;
  state.currentView = targetId;

  // Map sub-targets that live inside a parent view-section
  const nestedTargets = {
    'section-form-anggota': 'section-operations',
    'section-setting-iuran': 'section-operations',
    'section-iuran-bulanan': 'section-operations',
    'section-iuran-kas': 'section-operations',
  };
  const parentSection = nestedTargets[targetId] || null;
  const resolvedViewId = parentSection || targetId;

  // Set active link
  navLinks.forEach((link) => {
    const isActive = link.dataset.target === targetId;
    link.classList.toggle('is-active', isActive);
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  if (window.innerWidth <= 1080) {
    toggleSidebar(false);
  }

  // Show loader and hide all sections
  viewSections.forEach(sec => sec.classList.add('hidden'));
  if (pageLoader) pageLoader.classList.remove('hidden');

  await new Promise(r => setTimeout(r, 300));
  
  if (pageLoader) pageLoader.classList.add('hidden');
  
  // Show the resolved view section
  const targetSec = document.getElementById(resolvedViewId);
  if (targetSec) targetSec.classList.remove('hidden');
  
  // Also show shared sections (like KPIs) if we are on dashboard sections
  const sharedKpis = document.getElementById('section-kpis');
  if (sharedKpis && (resolvedViewId === 'section-overview' || resolvedViewId === 'section-analytics')) {
    sharedKpis.classList.remove('hidden');
  }

  // Update Breadcrumb Text
  const breadcrumbCurrent = document.getElementById('breadcrumb-current');
  if (breadcrumbCurrent) {
    const activeLink = document.querySelector(`.admin-nav__link-clean[data-target="${targetId}"], .admin-nav__subitem[data-target="${targetId}"]`);
    if (activeLink) {
      breadcrumbCurrent.textContent = activeLink.textContent.trim();
    }
  }

  // Scroll to nested target if applicable
  if (parentSection) {
    const nestedEl = document.getElementById(targetId);
    if (nestedEl) {
      nestedEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// Global search event
const globalSearchInput = document.getElementById('global-search-input');
globalSearchInput?.addEventListener('input', (event) => {
  const term = event.target.value.trim();
  if (memberSearch) memberSearch.value = term;
  state.searchTerm = term;
  
  // If not in anggota list or operations, move there to show results
  if (term && state.currentView !== 'section-anggota' && state.currentView !== 'section-operations') {
    switchView('section-anggota');
  } else {
    renderMemberTable();
  }
});

window.addEventListener('resize', () => {
  syncSidebarMode();
});

refreshButtons.forEach((button) => {
  button.addEventListener('click', () => {
    refreshDashboard({ silent: false, announceSuccess: true });
  });
});

memberSearch?.addEventListener('input', (event) => {
  state.searchTerm = event.target.value || '';
  renderMemberTable();
});

memberStatusFilter?.addEventListener('change', (event) => {
  state.statusFilter = event.target.value || 'all';
  renderMemberTable();
});

memberSort?.addEventListener('change', (event) => {
  const [nextKey = 'nama_lengkap', nextDirection = 'asc'] = String(event.target.value || '').split(':');
  state.sortKey = nextKey;
  state.sortDirection = nextDirection === 'desc' ? 'desc' : 'asc';
  updateSortButtons();
  renderMemberTable();
});

sortButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const nextKey = button.dataset.sortKey || 'nama_lengkap';
    if (state.sortKey === nextKey) {
      state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortKey = nextKey;
      state.sortDirection = nextKey === 'tanggal_bergabung' ? 'desc' : 'asc';
    }

    if (memberSort) {
      memberSort.value = `${state.sortKey}:${state.sortDirection}`;
    }

    updateSortButtons();
    renderMemberTable();
  });
});

formAnggota?.addEventListener('submit', async (event) => {
  event.preventDefault();
  await submitAdminForm({
    form: formAnggota,
    endpoint: '/api/admin/anggota',
    payloadBuilder: (payload) => payload,
  });
});

formSetting?.addEventListener('submit', async (event) => {
  event.preventDefault();
  await submitAdminForm({
    form: formSetting,
    endpoint: '/api/admin/setting-iuran',
    payloadBuilder: (payload) => {
      payload.aktif = String(payload.aktif) === 'true';
      return payload;
    },
  });
});

formBulanan?.addEventListener('submit', async (event) => {
  event.preventDefault();
  await submitAdminForm({
    form: formBulanan,
    endpoint: '/api/admin/iuran-bulanan',
    payloadBuilder: (payload) => payload,
  });
});

formKas?.addEventListener('submit', async (event) => {
  event.preventDefault();
  await submitAdminForm({
    form: formKas,
    endpoint: '/api/admin/iuran-kas',
    payloadBuilder: (payload) => payload,
  });
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    refreshDashboard({ silent: true, announceSuccess: false });
  }
});

window.addEventListener('beforeunload', stopPolling);

function setActiveNav(targetHash) {
  navLinks.forEach((link) => {
    const isActive = link.getAttribute('href') === targetHash;
    link.classList.toggle('is-active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
      return;
    }

    link.removeAttribute('aria-current');
  });
}

function toggleSidebar(forceOpen) {
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !document.body.classList.contains('admin-sidebar-open');
  document.body.classList.toggle('admin-sidebar-open', shouldOpen);

  if (sidebarBackdrop) {
    sidebarBackdrop.hidden = !shouldOpen;
  }

  if (sidebar) {
    sidebar.setAttribute('aria-hidden', shouldOpen ? 'false' : String(window.innerWidth <= 1080));
  }

  if (sidebarToggle) {
    sidebarToggle.setAttribute('aria-expanded', String(shouldOpen));
  }
}

function syncSidebarMode() {
  const isMobile = window.innerWidth <= 1080;

  if (!isMobile) {
    document.body.classList.remove('admin-sidebar-open');
    if (sidebarBackdrop) {
      sidebarBackdrop.hidden = true;
    }
    if (sidebar) {
      sidebar.setAttribute('aria-hidden', 'false');
    }
    if (sidebarToggle) {
      sidebarToggle.setAttribute('aria-expanded', 'false');
    }
    return;
  }

  if (sidebar) {
    sidebar.setAttribute('aria-hidden', String(!document.body.classList.contains('admin-sidebar-open')));
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.hidden = !document.body.classList.contains('admin-sidebar-open');
  }

  if (sidebarToggle) {
    sidebarToggle.setAttribute('aria-expanded', String(document.body.classList.contains('admin-sidebar-open')));
  }
}

function initSectionObserver() {
  // Replaced by SPA logic switchView
}

function setMessage(text, isError = false) {
  showMessage(msg, text, isError);
  if (!msg) {
    return;
  }

  if (!text) {
    delete msg.dataset.state;
    return;
  }

  msg.dataset.state = isError ? 'error' : 'success';
}

function setSyncState(syncState, text) {
  if (syncIndicator) {
    syncIndicator.dataset.state = syncState;
  }

  if (syncText) {
    syncText.textContent = text;
  }
}

function setMetricLoading(isLoading) {
  metricCards.forEach((card) => {
    card.classList.toggle('is-loading', isLoading);
  });
}

function updateLastUpdatedLabel() {
  if (!state.lastUpdatedAt) {
    if (lastUpdatedLabel) {
      lastUpdatedLabel.textContent = 'Belum tersedia';
    }
    return;
  }

  const label = state.lastUpdatedAt.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  if (lastUpdatedLabel) {
    lastUpdatedLabel.textContent = label;
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char] || char;
  });
}

function normalizeValue(value) {
  return String(value || '').trim();
}

function getComparableValue(member, key) {
  if (key === 'tanggal_bergabung') {
    const timestamp = Date.parse(member.tanggal_bergabung || '');
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  if (key === 'status_anggota') {
    return STATUS_SORT_ORDER[normalizeValue(member.status_anggota)] ?? 99;
  }

  return normalizeValue(member[key]).toLocaleLowerCase('id-ID');
}

function sortMembers(members) {
  const sortedRows = [...members].sort((left, right) => {
    const leftValue = getComparableValue(left, state.sortKey);
    const rightValue = getComparableValue(right, state.sortKey);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return leftValue - rightValue;
    }

    return String(leftValue).localeCompare(String(rightValue), 'id-ID', { numeric: true, sensitivity: 'base' });
  });

  if (state.sortDirection === 'desc') {
    sortedRows.reverse();
  }

  return sortedRows;
}

function filterMembers() {
  const query = normalizeValue(state.searchTerm).toLocaleLowerCase('id-ID');
  const activeStatus = state.statusFilter;

  return state.members.filter((member) => {
    const statusMatches = activeStatus === 'all' || normalizeValue(member.status_anggota) === activeStatus;
    if (!statusMatches) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      member.nomor_anggota,
      member.nama_lengkap,
      member.dojo_cabang,
      member.tingkatan_sabuk,
      member.peringkat,
      member.status_anggota,
      member.tanggal_bergabung,
    ]
      .map((item) => normalizeValue(item).toLocaleLowerCase('id-ID'))
      .join(' ');

    return haystack.includes(query);
  });
}

function updateSortButtons() {
  sortButtons.forEach((button) => {
    if (button.dataset.sortKey === state.sortKey) {
      button.dataset.direction = state.sortDirection;
      button.setAttribute('aria-pressed', 'true');
      return;
    }

    button.dataset.direction = 'none';
    button.setAttribute('aria-pressed', 'false');
  });
}

function renderTableSkeleton(rowCount = 6) {
  if (!tableAnggota) {
    return;
  }

  const skeletonRow = Array.from({ length: rowCount }, () => {
    return `<tr>
      <td><span class="admin-skeleton-line"></span></td>
      <td><span class="admin-skeleton-line"></span></td>
      <td><span class="admin-skeleton-line"></span></td>
      <td><span class="admin-skeleton-line"></span></td>
      <td><span class="admin-skeleton-line"></span></td>
      <td><span class="admin-skeleton-line"></span></td>
      <td><span class="admin-skeleton-line"></span></td>
    </tr>`;
  }).join('');

  tableAnggota.innerHTML = skeletonRow;
  if (memberTableCount) {
    memberTableCount.textContent = 'Memuat data anggota...';
  }
}

function renderEmptyTable(messageText) {
  if (!tableAnggota) {
    return;
  }

  tableAnggota.innerHTML = `<tr class="admin-empty-row"><td colspan="${TABLE_COLUMN_COUNT}"><div class="admin-empty-state">${escapeHtml(
    messageText,
  )}</div></td></tr>`;
}

function renderMemberTable() {
  if (!tableAnggota) {
    return;
  }

  const filteredRows = sortMembers(filterMembers());
  state.filteredMembers = filteredRows;

  if (!filteredRows.length) {
    renderEmptyTable(
      state.members.length
        ? 'Tidak ada anggota yang cocok dengan filter saat ini. Ubah kata kunci atau status untuk melihat hasil lain.'
        : 'Belum ada data anggota yang tampil. Tambahkan anggota baru melalui form di bawah.',
    );
    if (memberTableCount) {
      memberTableCount.textContent = `0 dari ${state.members.length} anggota`;
    }
    return;
  }

  tableAnggota.innerHTML = filteredRows
    .map((member) => {
      const status = normalizeValue(member.status_anggota) || '-';
      return `<tr>
        <td>${escapeHtml(member.nomor_anggota || '-')}</td>
        <td>
          <div class="admin-member__name">
            <span class="admin-member__primary">${escapeHtml(member.nama_lengkap || '-')}</span>
            <span class="admin-member__secondary">${escapeHtml(member.member_id || 'Tanpa member_id')}</span>
          </div>
        </td>
        <td>${escapeHtml(member.dojo_cabang || '-')}</td>
        <td>${escapeHtml(member.tingkatan_sabuk || '-')}</td>
        <td>${escapeHtml(member.peringkat || '-')}</td>
        <td>${escapeHtml(formatDate(member.tanggal_bergabung))}</td>
        <td><span class="admin-status-pill" data-status="${escapeHtml(status)}">${escapeHtml(status)}</span></td>
      </tr>`;
    })
    .join('');

  if (memberTableCount) {
    memberTableCount.textContent = `${filteredRows.length} dari ${state.members.length} anggota`;
  }
}

function renderSummary() {
  const total = Number(state.summary.total_anggota || 0);
  const aktif = Number(state.summary.total_anggota_aktif || 0);
  const nonaktif = Number(state.summary.total_anggota_nonaktif || 0);
  const cuti = Number(state.summary.total_anggota_cuti || 0);
  const outstandingBulanan = Number(state.summary.total_tunggakan_bulanan || 0);
  const outstandingKas = Number(state.summary.total_tunggakan_kas || 0);
  const activeRate = total > 0 ? Math.round((aktif / total) * 100) : 0;

  if (sumTotal) {
    sumTotal.textContent = String(total);
  }
  if (sumAktif) {
    sumAktif.textContent = String(aktif);
  }
  if (sumTunggakanBulanan) {
    sumTunggakanBulanan.textContent = formatRupiah(outstandingBulanan);
  }
  if (sumTunggakanKas) {
    sumTunggakanKas.textContent = formatRupiah(outstandingKas);
  }

  if (heroActiveRate) {
    heroActiveRate.textContent = `${activeRate}%`;
  }

  if (heroTotalOutstanding) {
    heroTotalOutstanding.textContent = formatRupiah(outstandingBulanan + outstandingKas);
  }

  if (heroRefreshState) {
    heroRefreshState.textContent = `${POLL_INTERVAL_MS / 1000} detik • ${aktif} aktif / ${nonaktif} nonaktif / ${cuti} cuti`;
  }
}

function destroyChart(chartKey) {
  if (state.charts[chartKey]) {
    state.charts[chartKey].destroy();
    state.charts[chartKey] = null;
  }
}

function showChartFallback(canvas, fallbackElement, messageText) {
  if (canvas) {
    canvas.classList.add('hidden');
  }
  if (fallbackElement) {
    fallbackElement.textContent = messageText;
    fallbackElement.classList.remove('hidden');
  }
}

function hideChartFallback(canvas, fallbackElement) {
  if (canvas) {
    canvas.classList.remove('hidden');
  }
  if (fallbackElement) {
    fallbackElement.classList.add('hidden');
    fallbackElement.textContent = '';
  }
}

function renderCharts() {
  const hasChartLibrary = typeof window.Chart !== 'undefined';
  if (!hasChartLibrary) {
    destroyChart('memberStatus');
    destroyChart('financeBalance');
    destroyChart('dojoDistribution');
    showChartFallback(chartMemberStatus, chartMemberStatusFallback, 'Chart.js tidak termuat, jadi visual grafik tidak bisa ditampilkan sekarang.');
    showChartFallback(chartFinanceBalance, chartFinanceBalanceFallback, 'Chart.js tidak termuat, sehingga grafik outstanding iuran menggunakan fallback teks.');
    showChartFallback(chartDojoDistribution, chartDojoDistributionFallback, 'Chart.js tidak termuat, sehingga sebaran dojo tidak divisualisasikan.');
    return;
  }

  hideChartFallback(chartMemberStatus, chartMemberStatusFallback);
  hideChartFallback(chartFinanceBalance, chartFinanceBalanceFallback);
  hideChartFallback(chartDojoDistribution, chartDojoDistributionFallback);

  const totalAktif = Number(state.summary.total_anggota_aktif || 0);
  const totalCuti = Number(state.summary.total_anggota_cuti || 0);
  const totalNonaktif = Number(state.summary.total_anggota_nonaktif || 0);
  const tunggakanBulanan = Number(state.summary.total_tunggakan_bulanan || 0);
  const tunggakanKas = Number(state.summary.total_tunggakan_kas || 0);

  const dojoCounts = state.members.reduce((accumulator, member) => {
    const dojoName = normalizeValue(member.dojo_cabang) || 'Belum diisi';
    accumulator[dojoName] = (accumulator[dojoName] || 0) + 1;
    return accumulator;
  }, {});

  const dojoEntries = Object.entries(dojoCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6);

  destroyChart('memberStatus');
  state.charts.memberStatus = new window.Chart(chartMemberStatus, {
    type: 'doughnut',
    data: {
      labels: ['Aktif', 'Cuti', 'Nonaktif'],
      datasets: [
        {
          data: [totalAktif, totalCuti, totalNonaktif],
          backgroundColor: ['#2563eb', '#f59e0b', '#94a3b8'],
          borderColor: '#ffffff',
          borderWidth: 4,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '66%',
      plugins: {
        legend: {
          position: 'bottom',
        },
      },
    },
  });

  destroyChart('financeBalance');
  state.charts.financeBalance = new window.Chart(chartFinanceBalance, {
    type: 'bar',
    data: {
      labels: ['Bulanan', 'Kas'],
      datasets: [
        {
          label: 'Nilai tunggakan',
          data: [tunggakanBulanan, tunggakanKas],
          backgroundColor: ['rgba(37, 99, 235, 0.88)', 'rgba(245, 158, 11, 0.88)'],
          borderRadius: 12,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback(value) {
              return formatRupiah(value);
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });

  destroyChart('dojoDistribution');
  state.charts.dojoDistribution = new window.Chart(chartDojoDistribution, {
    type: 'bar',
    data: {
      labels: dojoEntries.length ? dojoEntries.map((entry) => entry[0]) : ['Belum ada data'],
      datasets: [
        {
          label: 'Jumlah anggota',
          data: dojoEntries.length ? dojoEntries.map((entry) => entry[1]) : [0],
          backgroundColor: 'rgba(14, 165, 233, 0.86)',
          borderRadius: 12,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    },
  });
}

async function submitAdminForm({ form, endpoint, payloadBuilder }) {
  const submitButton = form?.querySelector('button[type="submit"]');
  const originalLabel = submitButton?.textContent || 'Simpan';

  try {
    setFormBusy(form, true, 'Menyimpan...');
    const payload = payloadBuilder(formToObject(form));
    const response = await postApi(endpoint, payload, true);
    setMessage(response.message || 'Perubahan berhasil disimpan.');
    form.reset();
    await refreshDashboard({ silent: true, announceSuccess: false });
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    setFormBusy(form, false, originalLabel);
  }
}

function setFormBusy(form, isBusy, labelText) {
  if (!form) {
    return;
  }

  form.setAttribute('aria-busy', String(isBusy));

  Array.from(form.elements).forEach((field) => {
    if (!(field instanceof HTMLElement)) {
      return;
    }

    if (isBusy) {
      field.dataset.wasDisabled = String(field.disabled);
      field.disabled = true;
      return;
    }

    field.disabled = field.dataset.wasDisabled === 'true';
    delete field.dataset.wasDisabled;
  });

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = labelText;
  }
}

function startPolling() {
  stopPolling();
  state.pollTimerId = window.setInterval(() => {
    if (document.hidden) {
      return;
    }

    refreshDashboard({ silent: true, announceSuccess: false });
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (state.pollTimerId) {
    window.clearInterval(state.pollTimerId);
    state.pollTimerId = null;
  }
}

async function refreshDashboard({ silent = false, announceSuccess = false } = {}) {
  if (state.isLoading) {
    return;
  }

  state.isLoading = true;
  setSyncState('loading', silent ? 'Menyinkronkan pembaruan otomatis...' : 'Memuat dashboard admin...');

  if (!silent) {
    setMetricLoading(true);
    renderTableSkeleton();
  }

  try {
    const [summaryResponse, membersResponse] = await Promise.all([
      postApi('/api/dashboard-admin', {}, true),
      postApi('/api/admin/anggota', { mode: 'list' }, true),
    ]);

    state.summary = summaryResponse.data || {};
    state.members = Array.isArray(membersResponse.data?.data) ? membersResponse.data.data : (Array.isArray(membersResponse.data) ? membersResponse.data : []);
    state.lastUpdatedAt = new Date();

    renderSummary();
    renderMemberTable();
    renderCharts();
    updateLastUpdatedLabel();
    setSyncState('live', 'Dashboard tersinkron dengan data terbaru.');

    if (announceSuccess) {
      setMessage('Dashboard admin berhasil diperbarui.');
    }
  } catch (error) {
    if (!state.members.length) {
      renderEmptyTable('Gagal memuat data anggota. Periksa koneksi atau endpoint admin lalu coba refresh ulang.');
    }
    setSyncState('error', 'Sinkronisasi gagal. Coba refresh ulang.');
    setMessage(error.message, true);
  } finally {
    state.isLoading = false;
    setMetricLoading(false);
  }
}

async function initAdminPage() {
  const adminToken = localStorage.getItem('admin_token');
  if (!adminToken) {
    window.location.href = '/';
    return;
  }

  // RBAC Permission Check
  let role = 'admin';
  try {
    const adminProfileStr = localStorage.getItem('admin_profile');
    if (adminProfileStr) {
      const profileInfo = JSON.parse(adminProfileStr);
      role = profileInfo.role || 'admin';
    }
  } catch (e) {}

  if (role !== 'superadmin') {
    const navVisualisasi = document.querySelector('[data-target="section-analytics"]');
    const navSetting = document.querySelector('[data-target="section-operations"]');
    const navEditPassword = document.querySelector('.admin-nav__subitem[href="#"][data-target="section-overview"]:nth-child(2)'); // Ganti Password
    if (navVisualisasi) navVisualisasi.style.display = 'none';
    if (navSetting) navSetting.style.display = 'none';
    if (navEditPassword) navEditPassword.style.display = 'none';
  }

  if (memberSort) {
    memberSort.value = `${state.sortKey}:${state.sortDirection}`;
  }

  syncSidebarMode();
  initSectionObserver();
  updateSortButtons();
  renderTableSkeleton();

  await refreshDashboard({ silent: false, announceSuccess: false });
  startPolling();
  setActiveNav('#section-overview');
}

initAdminPage();

