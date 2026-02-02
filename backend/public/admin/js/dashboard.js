/**
 * The Golden Olive - Admin Dashboard JavaScript
 * Complete dashboard functionality with live updates
 */

const API_BASE = '/api';
let authToken = localStorage.getItem('admin_token');
let currentUser = null;
let currentPage = 'dashboard';
let liveUpdateInterval = null;
let lastUpdateTime = null;
let categoriesCache = [];
let orderDetailMap = null;
let lastOrderDetail = null;
let revenueChart = null;

// =====================================================
// NEW ORDER NOTIFICATIONS (show once)
// =====================================================
const SEEN_ORDERS_KEY = 'tgo_admin_seen_order_ids_v1';
const SEEN_ORDERS_MAX = 300;
let seenOrderIds = loadSeenOrderIds();
let newOrderQueue = [];
let isNewOrderOverlayOpen = false;
let currentOverlayOrderId = null;

function loadSeenOrderIds() {
  try {
    const raw = localStorage.getItem(SEEN_ORDERS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === 'number'));
  } catch {
    return new Set();
  }
}

function saveSeenOrderIds() {
  try {
    const arr = Array.from(seenOrderIds).slice(-SEEN_ORDERS_MAX);
    localStorage.setItem(SEEN_ORDERS_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

function markOrderSeen(orderId) {
  if (typeof orderId !== 'number') return;
  seenOrderIds.add(orderId);
  saveSeenOrderIds();
}

function isOrderQueued(orderId) {
  return newOrderQueue.some((o) => o?.id === orderId) || currentOverlayOrderId === orderId;
}

function getNewOrderOverlayEl() {
  return document.getElementById('new-order-overlay');
}

function setupNewOrderOverlay() {
  const overlay = getNewOrderOverlayEl();
  if (!overlay) return;

  const closeBtn = document.getElementById('new-order-close');
  const seenBtn = document.getElementById('new-order-seen');
  const viewBtn = document.getElementById('new-order-view');

  const close = () => hideNewOrderOverlay({ markSeen: true });

  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', (e) => {
    if (!isNewOrderOverlayOpen) return;
    if (e.key === 'Escape') close();
  });

  seenBtn?.addEventListener('click', () => hideNewOrderOverlay({ markSeen: true }));
  viewBtn?.addEventListener('click', () => {
    if (typeof currentOverlayOrderId === 'number') {
      // Mark as seen once user opens details
      markOrderSeen(currentOverlayOrderId);
      hideNewOrderOverlay({ markSeen: false });
      showOrderDetail(currentOverlayOrderId);
      showPage('orders');
    }
  });
}

function showNewOrderOverlay(order) {
  const overlay = getNewOrderOverlayEl();
  if (!overlay) return;

  currentOverlayOrderId = order?.id ?? null;
  isNewOrderOverlayOpen = true;

  const numberEl = document.getElementById('new-order-number');
  const customerEl = document.getElementById('new-order-customer');
  const totalEl = document.getElementById('new-order-total');
  const typeEl = document.getElementById('new-order-type');
  const subtitleEl = document.getElementById('new-order-subtitle');
  const queueEl = document.getElementById('new-order-queue');

  const orderNumber = order?.order_number || `#${order?.id || ''}`;
  const customer = order?.customer_name || '—';
  const total = typeof order?.total !== 'undefined' ? formatCurrency(order.total) : '—';
  const type = order?.delivery_type === 'delivery' ? 'Bezorgen' : 'Afhalen';

  if (numberEl) numberEl.textContent = orderNumber;
  if (customerEl) customerEl.textContent = customer;
  if (totalEl) totalEl.textContent = total;
  if (typeEl) typeEl.textContent = type;
  if (subtitleEl) subtitleEl.textContent = 'Er is een nieuwe bestelling binnengekomen.';

  if (queueEl) {
    const remaining = newOrderQueue.length;
    queueEl.textContent = remaining > 0 ? `Nog ${remaining} nieuwe bestelling(en) in wachtrij` : '';
  }

  overlay.classList.remove('d-none');
  overlay.setAttribute('aria-hidden', 'false');
}

function hideNewOrderOverlay({ markSeen }) {
  const overlay = getNewOrderOverlayEl();
  if (!overlay) return;

  if (markSeen && typeof currentOverlayOrderId === 'number') {
    markOrderSeen(currentOverlayOrderId);
  }

  overlay.classList.add('d-none');
  overlay.setAttribute('aria-hidden', 'true');
  isNewOrderOverlayOpen = false;
  currentOverlayOrderId = null;

  // Show next queued order (if any)
  if (newOrderQueue.length > 0) {
    const next = newOrderQueue.shift();
    if (next) {
      showNewOrderOverlay(next);
    }
  }
}

// =====================================================
// API HELPERS
// =====================================================

async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      logout();
    }
    throw new Error(data.error?.message || 'Er is een fout opgetreden');
  }

  return data;
}

// =====================================================
// AUTHENTICATION
// =====================================================

async function login(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  authToken = data.data.token;
  currentUser = data.data.user;
  localStorage.setItem('admin_token', authToken);
  return data;
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('admin_token');
  stopLiveUpdates();
  showLoginPage();
}

async function checkAuth() {
  if (!authToken) {
    showLoginPage();
    return false;
  }

  try {
    const data = await apiRequest('/auth/me');
    currentUser = data.data.user;
    showApp();
    return true;
  } catch {
    logout();
    return false;
  }
}

function showLoginPage() {
  document.getElementById('login-page').classList.remove('d-none');
  document.getElementById('app').classList.add('d-none');
}

function showApp() {
  document.getElementById('login-page').classList.add('d-none');
  document.getElementById('app').classList.remove('d-none');
  setupNewOrderOverlay();
  
  // Update user info
  document.getElementById('user-name').textContent = currentUser.name;
  document.getElementById('user-role').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Medewerker';
  
  // Hide elements based on role
  if (currentUser.role !== 'admin') {
    document.querySelectorAll('[data-permission="admin"]').forEach(el => el.style.display = 'none');
  }
  
  // Load initial data
  loadDashboard();
  startLiveUpdates();
}

// =====================================================
// NAVIGATION
// =====================================================

function showPage(pageId) {
  currentPage = pageId;
  
  // Update nav
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
  
  // Update pages
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById(`page-${pageId}`)?.classList.add('active');
  
  // Update title
  const titles = {
    dashboard: 'Dashboard',
    reports: 'Rapporten',
    orders: 'Bestellingen',
    products: 'Producten',
    categories: 'Categorieën',
    payments: 'Betalingen',
    settings: 'Instellingen',
    users: 'Gebruikers',
    logs: 'Activiteitenlog'
  };
  document.getElementById('page-title').textContent = titles[pageId] || pageId;
  
  // Close sidebar on mobile
  closeSidebar();
  
  // Load page data
  loadPageData(pageId);
}

function loadPageData(pageId) {
  switch (pageId) {
    case 'dashboard': loadDashboard(); break;
    case 'reports': loadReports(); break;
    case 'orders': loadOrders(); break;
    case 'products': loadProducts(); break;
    case 'categories': loadCategories(); break;
    case 'payments': loadPayments(); break;
    case 'settings': loadSettings(); break;
    case 'users': loadUsers(); break;
    case 'logs': loadLogs(); break;
  }
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  getOrCreateBackdrop().classList.add('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  getOrCreateBackdrop().classList.remove('show');
}

function getOrCreateBackdrop() {
  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    backdrop.onclick = closeSidebar;
    document.body.appendChild(backdrop);
  }
  return backdrop;
}

// =====================================================
// LIVE UPDATES
// =====================================================

function startLiveUpdates() {
  lastUpdateTime = new Date().toISOString();
  liveUpdateInterval = setInterval(checkForUpdates, 10000); // Every 10 seconds
}

function stopLiveUpdates() {
  if (liveUpdateInterval) {
    clearInterval(liveUpdateInterval);
    liveUpdateInterval = null;
  }
}

async function checkForUpdates() {
  try {
    const data = await apiRequest(`/admin/dashboard/live?since=${lastUpdateTime}`);
    lastUpdateTime = data.data.timestamp;
    
    // Update pending badge
    const badge = document.getElementById('pending-badge');
    if (data.data.pendingCount > 0) {
      badge.textContent = data.data.pendingCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
    
    // Handle new orders
    if (data.data.newOrders.length > 0) {
      handleNewOrders(data.data.newOrders);
    }

    // Refresh notifications indicator (bell dot)
    refreshNotificationsIndicator().catch(() => {});
    
    // Update connection status
    document.getElementById('connection-status').style.background = 'var(--success)';
  } catch (error) {
    console.error('Live update error:', error);
    document.getElementById('connection-status').style.background = 'var(--danger)';
  }
}

async function refreshNotificationsIndicator() {
  const dot = document.querySelector('.notification-dot');
  if (!dot) return;
  try {
    const data = await apiRequest('/admin/notifications');
    const unread = Number(data?.data?.unreadCount || 0);
    if (unread > 0) dot.classList.remove('d-none');
    else dot.classList.add('d-none');
  } catch {
    // ignore
  }
}

function parseNotificationLink(link) {
  // Supported:
  // - order:<id>
  // - /admin/... (ignored)
  const raw = String(link || '');
  if (raw.startsWith('order:')) {
    const id = Number(raw.slice('order:'.length));
    if (!Number.isNaN(id) && id > 0) return { type: 'order', id };
  }
  return null;
}

async function openNotificationsModal() {
  const modalEl = document.getElementById('notificationsModal');
  const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modal.show();
  await loadNotifications();
}

async function loadNotifications() {
  const list = document.getElementById('notifications-list');
  const subtitle = document.getElementById('notifications-subtitle');
  if (list) list.innerHTML = '<div class="text-center py-4 text-muted">Laden...</div>';
  if (subtitle) subtitle.textContent = 'Laden...';

  const data = await apiRequest('/admin/notifications');
  const notifications = Array.isArray(data?.data?.notifications) ? data.data.notifications : [];
  const unreadCount = Number(data?.data?.unreadCount || 0);

  if (subtitle) subtitle.textContent = unreadCount > 0 ? `${unreadCount} ongelezen` : 'Alles gelezen';

  const dot = document.querySelector('.notification-dot');
  if (dot) {
    if (unreadCount > 0) dot.classList.remove('d-none');
    else dot.classList.add('d-none');
  }

  if (!list) return;
  if (notifications.length === 0) {
    list.innerHTML = '<div class="text-center py-4 text-muted">Geen notificaties</div>';
    return;
  }

  list.innerHTML = notifications.map((n) => {
    const isUnread = !n.is_read;
    const title = escapeHtml(n.title || '');
    const msg = escapeHtml(n.message || '');
    const when = n.created_at ? formatDateTime(n.created_at) : '';
    return `
      <button type="button" class="list-group-item list-group-item-action ${isUnread ? 'unread' : ''}" data-link="${escapeHtml(n.link || '')}">
        <div class="d-flex w-100 justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${title}</div>
            ${msg ? `<div class="small text-muted">${msg}</div>` : ''}
          </div>
          <div class="small text-muted">${escapeHtml(when)}</div>
        </div>
      </button>
    `;
  }).join('');

  // Click handler: open order details if link is order:<id>
  list.querySelectorAll('[data-link]').forEach((el) => {
    el.addEventListener('click', async () => {
      const link = el.getAttribute('data-link');
      const parsed = parseNotificationLink(link);
      if (parsed?.type === 'order') {
        // mark all read for simplicity
        try { await apiRequest('/admin/notifications/read', { method: 'POST' }); } catch {}
        bootstrap.Modal.getInstance(document.getElementById('notificationsModal'))?.hide();
        showPage('orders');
        showOrderDetail(parsed.id);
        refreshNotificationsIndicator().catch(() => {});
      }
    });
  });
}

function handleNewOrders(orders) {
  // Only notify once per order (persisted). Queue unseen orders and show big overlay.
  const incoming = Array.isArray(orders) ? orders : [];
  const unseen = incoming
    .filter((o) => typeof o?.id === 'number')
    .filter((o) => !seenOrderIds.has(o.id))
    .filter((o) => !isOrderQueued(o.id));

  if (unseen.length === 0) {
    // Still refresh lists below
  } else {
    // Keep newest first in overlay
    unseen
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach((o) => newOrderQueue.push(o));

    // Play sound once per batch (not for every poll)
    const soundEnabled = document.getElementById('setting-notification_sound')?.checked !== false;
    if (soundEnabled) {
      document.getElementById('notification-sound')?.play().catch(() => {});
    }

    // Show overlay if not currently open
    if (!isNewOrderOverlayOpen) {
      const next = newOrderQueue.shift();
      if (next) showNewOrderOverlay(next);
    } else {
      const queueEl = document.getElementById('new-order-queue');
      if (queueEl) queueEl.textContent = `Nog ${newOrderQueue.length} nieuwe bestelling(en) in wachtrij`;
    }

    // Auto-print (optional)
    const printAutoEnabled = document.getElementById('setting-print_auto')?.checked === true;
    if (printAutoEnabled) {
      // Try to print the newest order only once (browser may block popups)
      const newest = unseen[0];
      if (newest?.id) {
        printOrder(newest.id);
      }
    }
  }
  
  // Refresh dashboard if on that page
  if (currentPage === 'dashboard') {
    loadDashboard();
  } else if (currentPage === 'orders') {
    loadOrders();
  }
}

// =====================================================
// DASHBOARD
// =====================================================

async function loadDashboard() {
  try {
    const data = await apiRequest('/admin/dashboard');
    const stats = data.data;
    
    // Update stat cards
    document.getElementById('stat-today-orders').textContent = stats.today.orders;
    document.getElementById('stat-today-revenue').textContent = formatCurrency(stats.today.revenue);
    document.getElementById('stat-pending').textContent = stats.today.pending;
    document.getElementById('stat-week-revenue').textContent = formatCurrency(stats.week.revenue);
    
    // Update pending badge
    const badge = document.getElementById('pending-badge');
    const totalPending = stats.statusCounts.filter(s => ['pending', 'paid', 'preparing'].includes(s.status))
      .reduce((sum, s) => sum + Number(s.count), 0);
    if (totalPending > 0) {
      badge.textContent = totalPending;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
    
    // Render recent orders
    renderRecentOrders(stats.recentOrders);
    
    // Render status distribution
    renderStatusDistribution(stats.statusCounts);
    
    // Render popular products
    renderPopularProducts(stats.popularProducts);
    
  } catch (error) {
    console.error('Dashboard error:', error);
    showToast('Fout bij laden dashboard', 'error');
  }
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById('recent-orders-table');
  
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Geen bestellingen</td></tr>';
    return;
  }
  
  tbody.innerHTML = orders.map(order => `
    <tr class="${isNewOrder(order.created_at) ? 'new-order' : ''}">
      <td><span class="text-primary fw-semibold">${order.order_number}</span></td>
      <td>${escapeHtml(order.customer_name)}</td>
      <td><span class="badge ${order.delivery_type === 'delivery' ? 'bg-info' : 'bg-secondary'}">${order.delivery_type === 'delivery' ? 'Bezorgen' : 'Afhalen'}</span></td>
      <td>${formatCurrency(order.total)}</td>
      <td><span class="badge badge-status status-${order.status}">${translateStatus(order.status)}</span></td>
      <td class="text-muted">${formatTime(order.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary btn-icon" onclick="showOrderDetail(${order.id})" title="Details">
          <i class="bi bi-eye"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function renderStatusDistribution(statusCounts) {
  const container = document.getElementById('status-distribution');
  const total = statusCounts.reduce((sum, s) => sum + Number(s.count), 0) || 1;
  
  const statusColors = {
    pending: '#9ca3af',
    paid: '#10b981',
    preparing: '#3b82f6',
    ready: '#f59e0b',
    delivering: '#8b5cf6',
    delivered: '#10b981',
    cancelled: '#ef4444'
  };
  
  const allStatuses = ['pending', 'paid', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'];
  
  container.innerHTML = allStatuses.map(status => {
    const data = statusCounts.find(s => s.status === status);
    const count = data ? Number(data.count) : 0;
    const percentage = (count / total) * 100;
    
    return `
      <div class="status-bar">
        <span class="status-bar-label">${translateStatus(status)}</span>
        <div class="status-bar-track">
          <div class="status-bar-fill" style="width: ${percentage}%; background: ${statusColors[status]}"></div>
        </div>
        <span class="status-bar-value">${count}</span>
      </div>
    `;
  }).join('');
}

function renderPopularProducts(products) {
  const container = document.getElementById('popular-products');
  
  if (products.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">Geen data beschikbaar</p>';
    return;
  }
  
  container.innerHTML = products.map((product, index) => `
    <div class="popular-item">
      <span class="popular-rank">${index + 1}</span>
      <button type="button" class="btn btn-link p-0 popular-name" onclick='openProductsSearch(${JSON.stringify(product.product_name || "")})'>
        ${escapeHtml(product.product_name)}
      </button>
      <span class="popular-qty">${product.qty}x</span>
    </div>
  `).join('');
}

function openProductsSearch(term) {
  try {
    const input = document.getElementById('product-filter-search');
    if (input) input.value = term || '';
    showPage('products');
  } catch {
    // ignore
  }
}

// =====================================================
// ORDERS
// =====================================================

async function loadOrders() {
  try {
    const status = document.getElementById('filter-status')?.value || '';
    const paymentStatus = document.getElementById('filter-payment')?.value || '';
    const delivery = document.getElementById('filter-delivery')?.value || '';
    const date = document.getElementById('filter-date')?.value || '';
    const search = document.getElementById('filter-search')?.value || '';
    
    let query = '?';
    if (status) query += `status=${status}&`;
    if (paymentStatus) query += `payment_status=${paymentStatus}&`;
    if (delivery) query += `delivery_type=${delivery}&`;
    if (date) query += `date_from=${date}&date_to=${date}&`;
    if (search) query += `search=${encodeURIComponent(search)}&`;
    
    const data = await apiRequest(`/admin/orders${query}`);
    renderOrdersTable(data.data.orders);
    renderPagination(data.data.pagination);
    
  } catch (error) {
    console.error('Orders error:', error);
    showToast('Fout bij laden bestellingen', 'error');
  }
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('orders-table');
  
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">Geen bestellingen gevonden</td></tr>';
    return;
  }
  
  tbody.innerHTML = orders.map(order => `
    <tr class="${isNewOrder(order.created_at) ? 'new-order' : ''}">
      <td><span class="text-primary fw-semibold">${order.order_number}</span></td>
      <td>${escapeHtml(order.customer_name)}</td>
      <td>
        ${order.delivery_type === 'delivery' ? `
          <small class="text-muted">
            ${escapeHtml(order.street || '')} ${escapeHtml(order.house_number || '')}${order.bus ? ' ' + escapeHtml(order.bus) : ''}
          </small><br>
          <small class="text-muted">${escapeHtml(order.postal_code || '')} ${escapeHtml(order.city || '')}</small>
        ` : `<small class="text-muted">—</small>`}
      </td>
      <td><span class="badge ${order.delivery_type === 'delivery' ? 'bg-info' : 'bg-secondary'}">${order.delivery_type === 'delivery' ? 'Bezorgen' : 'Afhalen'}</span></td>
      <td class="fw-semibold">${formatCurrency(order.total)}</td>
      <td><span class="badge badge-status status-${order.payment_status || 'pending'}">${translatePaymentStatus(order.payment_status)}</span></td>
      <td>
        <select class="status-select" onchange="updateOrderStatus(${order.id}, this.value)">
          ${getStatusOptions(order.status)}
        </select>
      </td>
      <td>
        <small class="text-muted">${escapeHtml(order.customer_phone)}</small><br>
        <small class="text-muted">${escapeHtml(order.customer_email)}</small>
      </td>
      <td>
        <button class="btn btn-sm btn-outline-primary btn-icon" onclick="showOrderDetail(${order.id})" title="Details">
          <i class="bi bi-eye"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function renderPagination(pagination) {
  const container = document.getElementById('orders-pagination');
  if (!pagination || pagination.pages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let html = '';
  
  // Previous
  html += `<button class="pagination-btn" onclick="goToPage(${pagination.page - 1})" ${pagination.page === 1 ? 'disabled' : ''}>
    <i class="bi bi-chevron-left"></i>
  </button>`;
  
  // Page numbers
  for (let i = 1; i <= pagination.pages; i++) {
    if (i === 1 || i === pagination.pages || (i >= pagination.page - 1 && i <= pagination.page + 1)) {
      html += `<button class="pagination-btn ${i === pagination.page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === pagination.page - 2 || i === pagination.page + 2) {
      html += '<span class="text-muted px-2">...</span>';
    }
  }
  
  // Next
  html += `<button class="pagination-btn" onclick="goToPage(${pagination.page + 1})" ${pagination.page === pagination.pages ? 'disabled' : ''}>
    <i class="bi bi-chevron-right"></i>
  </button>`;
  
  container.innerHTML = html;
}

async function showOrderDetail(orderId) {
  try {
    const data = await apiRequest(`/admin/orders/${orderId}`);
    const order = data.data;
    lastOrderDetail = order;
    
    const modal = document.getElementById('order-modal-content');
    modal.innerHTML = `
      <div class="order-detail-grid">
        <div class="order-detail-section">
          <h6>Klantgegevens</h6>
          <p><strong>${escapeHtml(order.customer_name)}</strong></p>
          <p>${escapeHtml(order.customer_email)}</p>
          <p>${escapeHtml(order.customer_phone)}</p>
          <p><small class="text-muted">BTW-nummer:</small> <span class="fw-semibold">${escapeHtml(order.customer_vat_number || '—')}</span></p>
        </div>
        <div class="order-detail-section">
          <h6>${order.delivery_type === 'delivery' ? 'Bezorgadres' : 'Afhalen'}</h6>
          ${order.delivery_type === 'delivery' && order.street ? `
            <p>${escapeHtml(order.street)} ${escapeHtml(order.house_number)}${order.bus ? ' ' + escapeHtml(order.bus) : ''}</p>
            <p>${escapeHtml(order.postal_code)} ${escapeHtml(order.city)}</p>
          ` : `
            <p class="text-muted">Afhalen bij restaurant</p>
          `}
        </div>
      </div>

      ${order.delivery_type === 'delivery' ? `
        <div class="order-detail-section mt-3">
          <h6>Kaart</h6>
          <div id="order-map" class="order-map"></div>
          <div id="order-map-hint" class="text-muted small mt-2"></div>
        </div>
      ` : ''}
      
      ${order.notes ? `
        <div class="order-detail-section mt-3">
          <h6>Opmerkingen</h6>
          <p>${escapeHtml(order.notes)}</p>
        </div>
      ` : ''}
      
      <div class="order-items-list">
        <div class="p-3 border-bottom" style="border-color: var(--border) !important;">
          <h6 class="mb-0" style="color: var(--primary);">Bestelling #${order.order_number}</h6>
        </div>
        ${order.items.map(item => `
          <div class="order-item">
            <div>
              <span class="order-item-qty">${item.quantity}x</span>
              <span>${escapeHtml(item.product_name)}</span>
              ${item.notes ? `<br><small class="text-muted">${escapeHtml(item.notes)}</small>` : ''}
            </div>
            <span>${formatCurrency(item.subtotal)}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="order-totals">
        <div class="order-total-row">
          <span>Subtotaal</span>
          <span>${formatCurrency(order.subtotal)}</span>
        </div>
        ${parseFloat(order.delivery_fee) > 0 ? `
          <div class="order-total-row">
            <span>Bezorgkosten</span>
            <span>${formatCurrency(order.delivery_fee)}</span>
          </div>
        ` : ''}
        <div class="order-total-row total">
          <span>Totaal</span>
          <span>${formatCurrency(order.total)}</span>
        </div>
      </div>
      
      <div class="row mt-3">
        <div class="col-6">
          <div class="order-detail-section">
            <h6>Status</h6>
            <span class="badge badge-status status-${order.status}">${translateStatus(order.status)}</span>
          </div>
        </div>
        <div class="col-6">
          <div class="order-detail-section">
            <h6>Betaling</h6>
            <span class="badge badge-status status-${order.payment_status}">${translatePaymentStatus(order.payment_status)}</span>
            ${order.payment_method ? `<br><small class="text-muted">${order.payment_method}</small>` : ''}
          </div>
        </div>
      </div>
      
      ${order.statusHistory && order.statusHistory.length > 0 ? `
        <div class="order-detail-section mt-3">
          <h6>Status Geschiedenis</h6>
          <div class="small">
            ${order.statusHistory.map(h => `
              <div class="d-flex justify-content-between py-1 border-bottom" style="border-color: var(--border) !important;">
                <span>${h.previous_status ? translateStatus(h.previous_status) + ' → ' : ''}${translateStatus(h.new_status)}</span>
                <span class="text-muted">${formatDateTime(h.created_at)}${h.changed_by_name ? ' - ' + h.changed_by_name : ''}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
    
    // Store order ID for print
    document.getElementById('btn-print-order').onclick = () => printOrder(orderId);
    document.getElementById('btn-invoice-order').onclick = () => printInvoice(orderId);
    
    new bootstrap.Modal(document.getElementById('orderModal')).show();

    // Render map only for delivery orders
    if (order.delivery_type === 'delivery') {
      // Leaflet needs dimensions, so wait until modal is visible
      setTimeout(() => renderOrderDetailMap(order), 150);
    } else {
      cleanupOrderDetailMap();
    }
  } catch (error) {
    console.error('Order detail error:', error);
    showToast('Fout bij laden bestelling', 'error');
  }
}

async function printInvoice(orderId) {
  try {
    // Use latest loaded order or refetch
    let order = lastOrderDetail && Number(lastOrderDetail.id) === Number(orderId) ? lastOrderDetail : null;
    if (!order) {
      const data = await apiRequest(`/admin/orders/${orderId}`);
      order = data.data;
      lastOrderDetail = order;
    }

    // Ensure VAT number exists
    let vat = (order.customer_vat_number || '').toString().trim();
    if (!vat) {
      vat = window.prompt('Geef het BTW-nummer van de klant (vereist voor factuur):', '')?.trim() || '';
      if (!vat) {
        showToast('Factuur geannuleerd: BTW-nummer ontbreekt', 'warning');
        return;
      }
      await apiRequest(`/admin/orders/${orderId}/vat-number`, {
        method: 'PATCH',
        body: JSON.stringify({ vat_number: vat })
      });
      order.customer_vat_number = vat;
      lastOrderDetail = order;
    }

    // Get settings (tax + restaurant info)
    const settingsRes = await apiRequest('/admin/settings');
    const settingsMap = {};
    settingsRes.data.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
    const taxRate = parseFloat(settingsMap.tax_rate || 21);
    const restaurantName = settingsMap.restaurant_name || order.restaurant?.name || 'The Golden Olive';
    const restaurantAddress = settingsMap.restaurant_address || order.restaurant?.address || '';
    const restaurantPhone = settingsMap.restaurant_phone || '';
    const restaurantEmail = settingsMap.restaurant_email || '';

    const total = parseFloat(order.total || 0);
    const net = taxRate > 0 ? total / (1 + taxRate / 100) : total;
    const vatAmount = total - net;

    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=900');
    if (!w) {
      showToast('Popup blocked: kan factuur niet openen', 'error');
      return;
    }

    const issueDate = new Date().toLocaleDateString('nl-BE');

    w.document.open();
    w.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Factuur ${escapeHtml(order.order_number)}</title>
  <style>
    body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:32px;color:#111}
    h1{margin:0 0 6px;font-size:22px}
    .muted{color:#555}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}
    .card{border:1px solid #ddd;border-radius:12px;padding:14px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{padding:10px;border-bottom:1px solid #eee;text-align:left;font-size:14px}
    th{background:#fafafa}
    .right{text-align:right}
    .totals{margin-top:10px;max-width:360px;margin-left:auto}
    .totals .row{display:flex;justify-content:space-between;padding:6px 0}
    .totals .total{font-weight:800;font-size:16px;border-top:2px solid #111;padding-top:10px;margin-top:8px}
    @media print{body{margin:0;padding:0}}
  </style>
</head>
<body>
  <h1>Factuur</h1>
  <div class="muted">Factuurdatum: ${issueDate} • Order: ${escapeHtml(order.order_number)}</div>

  <div class="grid">
    <div class="card">
      <div style="font-weight:800;margin-bottom:6px">Van</div>
      <div>${escapeHtml(restaurantName)}</div>
      <div class="muted">${escapeHtml(restaurantAddress)}</div>
      ${restaurantPhone ? `<div class="muted">${escapeHtml(restaurantPhone)}</div>` : ''}
      ${restaurantEmail ? `<div class="muted">${escapeHtml(restaurantEmail)}</div>` : ''}
    </div>
    <div class="card">
      <div style="font-weight:800;margin-bottom:6px">Aan</div>
      <div>${escapeHtml(order.customer_name)}</div>
      <div class="muted">${escapeHtml(order.customer_email)}</div>
      <div class="muted">${escapeHtml(order.customer_phone)}</div>
      <div style="margin-top:6px"><span class="muted">BTW-nummer klant:</span> <strong>${escapeHtml(vat)}</strong></div>
      ${order.delivery_type === 'delivery' && order.street ? `
        <div style="margin-top:8px" class="muted">
          ${escapeHtml(order.street)} ${escapeHtml(order.house_number)}${order.bus ? ' ' + escapeHtml(order.bus) : ''}<br/>
          ${escapeHtml(order.postal_code)} ${escapeHtml(order.city)}
        </div>
      ` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Omschrijving</th>
        <th class="right">Aantal</th>
        <th class="right">Prijs</th>
        <th class="right">Subtotaal</th>
      </tr>
    </thead>
    <tbody>
      ${(order.items || []).map(it => `
        <tr>
          <td>${escapeHtml(it.product_name)}</td>
          <td class="right">${Number(it.quantity)}</td>
          <td class="right">€${parseFloat(it.product_price).toFixed(2)}</td>
          <td class="right">€${parseFloat(it.subtotal).toFixed(2)}</td>
        </tr>
      `).join('')}
      ${parseFloat(order.delivery_fee || 0) > 0 ? `
        <tr>
          <td>Bezorgkosten</td>
          <td class="right">1</td>
          <td class="right">€${parseFloat(order.delivery_fee).toFixed(2)}</td>
          <td class="right">€${parseFloat(order.delivery_fee).toFixed(2)}</td>
        </tr>
      ` : ''}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span class="muted">Excl. BTW</span><span>€${net.toFixed(2)}</span></div>
    <div class="row"><span class="muted">BTW (${taxRate}%)</span><span>€${vatAmount.toFixed(2)}</span></div>
    <div class="row total"><span>Totaal</span><span>€${total.toFixed(2)}</span></div>
  </div>

  <script>window.focus(); setTimeout(()=>window.print(), 250);</script>
</body>
</html>
    `);
    w.document.close();
  } catch (error) {
    console.error('Invoice error:', error);
    showToast('Fout bij maken factuur: ' + (error?.message || error), 'error');
  }
}

async function printDailyReport() {
  try {
    const data = await apiRequest('/admin/reports/daily');
    const r = data.data.restaurant;
    const t = data.data.totals;
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=900');
    if (!w) return;
    w.document.open();
    w.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dagrapport ${escapeHtml(data.data.date)}</title>
  <style>
    body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:32px;color:#111}
    h1{margin:0 0 6px;font-size:22px}
    .muted{color:#555}
    .card{border:1px solid #ddd;border-radius:12px;padding:14px;margin-top:16px}
    .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
    .row:last-child{border-bottom:none}
    .total{font-weight:800}
    @media print{body{margin:0;padding:0}}
  </style>
</head>
<body>
  <h1>Dagrapport</h1>
  <div class="muted">${escapeHtml(r.name)} • ${escapeHtml(data.data.date)}</div>
  <div class="muted">${escapeHtml(r.address || '')}</div>

  <div class="card">
    <div class="row"><span>Aantal bestellingen</span><span class="total">${t.orders}</span></div>
    <div class="row"><span>Delivery</span><span>${t.delivery_orders}</span></div>
    <div class="row"><span>Pickup</span><span>${t.pickup_orders}</span></div>
    <div class="row"><span>Omzet (incl. BTW)</span><span class="total">€${t.revenue.toFixed(2)}</span></div>
    <div class="row"><span>Excl. BTW</span><span>€${t.net_amount.toFixed(2)}</span></div>
    <div class="row"><span>BTW (${t.tax_rate}%)</span><span>€${t.vat_amount.toFixed(2)}</span></div>
    <div class="row"><span>Bezorgkosten</span><span>€${t.delivery_fees.toFixed(2)}</span></div>
  </div>

  <script>window.focus(); setTimeout(()=>window.print(), 250);</script>
</body>
</html>
    `);
    w.document.close();
  } catch (e) {
    showToast('Fout bij rapport: ' + (e?.message || e), 'error');
  }
}

// =====================================================
// REPORTS (PDF download + email)
// =====================================================

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

async function loadReports() {
  // Set defaults once
  const dailyDate = document.getElementById('report-daily-date');
  if (dailyDate && !dailyDate.value) dailyDate.value = todayISODate();

  const rangeFrom = document.getElementById('report-range-from');
  const rangeTo = document.getElementById('report-range-to');
  if (rangeTo && !rangeTo.value) rangeTo.value = todayISODate();
  if (rangeFrom && !rangeFrom.value) {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    rangeFrom.value = d.toISOString().slice(0, 10);
  }

  await Promise.allSettled([previewDailyReport(), previewRangeReport()]);
}

async function previewDailyReport() {
  const date = document.getElementById('report-daily-date')?.value || '';
  const box = document.getElementById('report-daily-preview');
  if (!box) return;
  if (!date) {
    box.textContent = 'Kies een datum om te previewen.';
    return;
  }
  try {
    box.textContent = 'Laden...';
    const data = await apiRequest(`/admin/reports/daily?date=${encodeURIComponent(date)}`);
    const t = data.data.totals;
    box.innerHTML = `
      <div><strong>Bestellingen:</strong> ${t.orders} (${t.delivery_orders} bezorgen, ${t.pickup_orders} afhalen)</div>
      <div><strong>Omzet:</strong> ${formatCurrency(t.revenue)} • <span class="text-muted">Netto</span> ${formatCurrency(t.net_amount)} • <span class="text-muted">BTW</span> ${formatCurrency(t.vat_amount)}</div>
    `;
  } catch (e) {
    box.textContent = 'Fout bij laden preview.';
  }
}

async function previewRangeReport() {
  const from = document.getElementById('report-range-from')?.value || '';
  const to = document.getElementById('report-range-to')?.value || '';
  const box = document.getElementById('report-range-preview');
  if (!box) return;
  if (!from || !to) {
    box.textContent = 'Kies een periode om te previewen.';
    return;
  }
  try {
    box.textContent = 'Laden...';
    const data = await apiRequest(`/admin/reports/range?date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}`);
    const t = data.data.totals;
    box.innerHTML = `
      <div><strong>Periode:</strong> ${escapeHtml(data.data.date_from)} → ${escapeHtml(data.data.date_to)}</div>
      <div><strong>Bestellingen:</strong> ${t.orders} (${t.delivery_orders} bezorgen, ${t.pickup_orders} afhalen)</div>
      <div><strong>Omzet:</strong> ${formatCurrency(t.revenue)} • <span class="text-muted">Netto</span> ${formatCurrency(t.net_amount)} • <span class="text-muted">BTW</span> ${formatCurrency(t.vat_amount)}</div>
    `;
  } catch (e) {
    box.textContent = 'Fout bij laden preview.';
  }
}

async function downloadReportPdf(type, params) {
  const qs = new URLSearchParams({ type, ...params }).toString();
  const resp = await fetch(`/api/admin/reports/pdf?${qs}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
  });
  if (!resp.ok) {
    let msg = 'Fout bij genereren PDF';
    try { const j = await resp.json(); msg = j?.error?.message || msg; } catch {}
    throw new Error(msg);
  }
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport-${type}-${todayISODate()}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function emailReportPdf(type, params, toEmail) {
  const resp = await apiRequest('/admin/reports/email', {
    method: 'POST',
    body: JSON.stringify({ type, ...params, to: toEmail })
  });
  return resp;
}

function cleanupOrderDetailMap() {
  try {
    if (orderDetailMap) {
      orderDetailMap.remove();
      orderDetailMap = null;
    }
  } catch {}
}

function renderOrderDetailMap(order) {
  const container = document.getElementById('order-map');
  const hint = document.getElementById('order-map-hint');
  if (!container) return;

  // Clean old map instance (if any)
  cleanupOrderDetailMap();

  if (!window.L) {
    if (hint) hint.textContent = 'Kaart library (Leaflet) is niet geladen.';
    return;
  }

  const restaurant = order.restaurant;
  const rLat = restaurant?.latitude;
  const rLng = restaurant?.longitude;

  const dLat = order.latitude ?? null;
  const dLng = order.longitude ?? null;

  // If we don't have restaurant coords, don't render map
  if (!Number.isFinite(rLat) || !Number.isFinite(rLng)) {
    if (hint) hint.textContent = 'Restaurant locatie ontbreekt.';
    return;
  }

  // Init map
  orderDetailMap = window.L.map(container, {
    zoomControl: true,
    scrollWheelZoom: true
  });

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(orderDetailMap);

  const icon = (label, variant) =>
    window.L.divIcon({
      className: '',
      html: `<div class="order-map-marker ${variant || ''}">${label}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

  const rMarker = window.L.marker([rLat, rLng], { icon: icon('R', 'restaurant') }).addTo(orderDetailMap);
  rMarker.bindPopup(`<strong>${escapeHtml(restaurant.name || 'Restaurant')}</strong><div>${escapeHtml(restaurant.address || '')}</div>`);

  // Delivery: show destination + route
  if (order.delivery_type === 'delivery') {
    if (!Number.isFinite(dLat) || !Number.isFinite(dLng)) {
      if (hint) hint.textContent = 'Geen coördinaten voor dit adres (wordt automatisch ingevuld bij nieuwe orders).';
      orderDetailMap.setView([rLat, rLng], 14);
      return;
    }

    const dMarker = window.L.marker([dLat, dLng], { icon: icon('1', '') }).addTo(orderDetailMap);
    dMarker.bindPopup(
      `<strong>${escapeHtml(order.customer_name || 'Klant')}</strong>` +
      `<div>${escapeHtml(order.street || '')} ${escapeHtml(order.house_number || '')}${order.bus ? ' ' + escapeHtml(order.bus) : ''}</div>` +
      `<div>${escapeHtml(order.postal_code || '')} ${escapeHtml(order.city || '')}</div>`
    );

    const line = window.L.polyline([[rLat, rLng], [dLat, dLng]], { color: '#ffc107', weight: 5, opacity: 0.85 }).addTo(orderDetailMap);
    const bounds = window.L.latLngBounds(line.getLatLngs());
    orderDetailMap.fitBounds(bounds, { padding: [30, 30] });
    if (hint) hint.textContent = '';
  } else {
    // Pickup is intentionally not shown (caller should not render map section)
    cleanupOrderDetailMap();
    return;
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    await apiRequest(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    showToast(`Status bijgewerkt naar: ${translateStatus(status)}`, 'success');
  } catch (error) {
    showToast('Fout bij bijwerken status: ' + error.message, 'error');
    loadOrders();
  }
}

async function printOrder(orderId) {
  try {
    // Fetch full order detail to print a proper receipt
    const data = await apiRequest(`/admin/orders/${orderId}`);
    const order = data.data;

    // Mark printed in backend (best effort)
    try {
      await apiRequest(`/admin/orders/${orderId}/print`, { method: 'POST' });
    } catch {}

    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=900');
    if (!w) {
      showToast('Popup blocked: kan niet printen', 'error');
      return;
    }

    const issueDate = new Date().toLocaleString('nl-BE');

    w.document.open();
    w.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Order ${escapeHtml(order.order_number)}</title>
  <style>
    body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:18px;color:#111}
    h1{margin:0 0 6px;font-size:18px}
    .muted{color:#555}
    .card{border:1px solid #ddd;border-radius:10px;padding:10px;margin-top:10px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{padding:8px;border-bottom:1px solid #eee;text-align:left;font-size:13px}
    th{background:#fafafa}
    .right{text-align:right}
    .totals{margin-top:8px}
    .totals .row{display:flex;justify-content:space-between;padding:4px 0}
    .total{font-weight:800;border-top:2px solid #111;padding-top:8px;margin-top:8px}
    @media print{body{margin:0}}
  </style>
</head>
<body>
  <h1>Bestelling ${escapeHtml(order.order_number)}</h1>
  <div class="muted">${issueDate} • ${escapeHtml(order.delivery_type)}</div>

  <div class="card">
    <div><strong>${escapeHtml(order.customer_name)}</strong></div>
    <div class="muted">${escapeHtml(order.customer_phone || '')}</div>
    <div class="muted">${escapeHtml(order.customer_email || '')}</div>
    ${order.delivery_type === 'delivery' && order.street ? `
      <div style="margin-top:6px" class="muted">
        ${escapeHtml(order.street)} ${escapeHtml(order.house_number)}${order.bus ? ' ' + escapeHtml(order.bus) : ''}<br/>
        ${escapeHtml(order.postal_code)} ${escapeHtml(order.city)}
      </div>
    ` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="right">Aantal</th>
        <th class="right">Prijs</th>
        <th class="right">Subtotaal</th>
      </tr>
    </thead>
    <tbody>
      ${(order.items || []).map(it => `
        <tr>
          <td>${escapeHtml(it.product_name)}</td>
          <td class="right">${Number(it.quantity)}</td>
          <td class="right">€${parseFloat(it.product_price).toFixed(2)}</td>
          <td class="right">€${parseFloat(it.subtotal).toFixed(2)}</td>
        </tr>
      `).join('')}
      ${parseFloat(order.delivery_fee || 0) > 0 ? `
        <tr>
          <td>Bezorgkosten</td>
          <td class="right">1</td>
          <td class="right">€${parseFloat(order.delivery_fee).toFixed(2)}</td>
          <td class="right">€${parseFloat(order.delivery_fee).toFixed(2)}</td>
        </tr>
      ` : ''}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span class="muted">Subtotaal</span><span>€${parseFloat(order.subtotal || 0).toFixed(2)}</span></div>
    ${parseFloat(order.delivery_fee || 0) > 0 ? `<div class="row"><span class="muted">Bezorgkosten</span><span>€${parseFloat(order.delivery_fee).toFixed(2)}</span></div>` : ''}
    <div class="row total"><span>Totaal</span><span>€${parseFloat(order.total || 0).toFixed(2)}</span></div>
  </div>

  <script>window.focus(); setTimeout(()=>window.print(), 250);</script>
</body>
</html>
    `);
    w.document.close();
  } catch (error) {
    console.error('Print error:', error);
    showToast('Fout bij printen: ' + (error?.message || error), 'error');
  }
}

// =====================================================
// PRODUCTS
// =====================================================

async function loadProducts() {
  try {
    await ensureCategoriesForFilters();
    populateProductCategoryFilter();

    const category = document.getElementById('product-filter-category')?.value || '';
    const available = document.getElementById('product-filter-available')?.value || '';
    const search = document.getElementById('product-filter-search')?.value || '';

    let query = '?';
    if (category) query += `category=${encodeURIComponent(category)}&`;
    if (available) query += `available=${encodeURIComponent(available)}&`;
    if (search) query += `search=${encodeURIComponent(search)}&`;

    const data = await apiRequest(`/admin/products${query}`);
    renderProductsTable(data.data);
  } catch (error) {
    console.error('Products error:', error);
    showToast('Fout bij laden producten', 'error');
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('products-table');
  
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Geen producten</td></tr>';
    return;
  }
  
  tbody.innerHTML = products.map(p => `
    <tr>
      <td>
        ${p.image_url && !p.image_url.includes('favicon') ? 
          `<img src="${p.image_url}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:6px;">` : 
          `<div style="width:40px;height:40px;background:var(--dark);border-radius:6px;display:flex;align-items:center;justify-content:center;"><i class="bi bi-image text-muted"></i></div>`
        }
      </td>
      <td>
        <span class="fw-semibold">${escapeHtml(p.name)}</span>
        ${p.description ? `<br><small class="text-muted">${escapeHtml(p.description.substring(0, 50))}${p.description.length > 50 ? '...' : ''}</small>` : ''}
      </td>
      <td>
        ${p.category_id ? `
          <button type="button" class="btn btn-link p-0 text-decoration-none" onclick="showCategoryProducts(${p.category_id})">
            <span class="badge bg-secondary">${escapeHtml(p.category_name || '-')}</span>
          </button>
        ` : `<span class="badge bg-secondary">${escapeHtml(p.category_name || '-')}</span>`}
      </td>
      <td class="fw-semibold">${formatCurrency(p.price)}</td>
      <td>
        <button class="btn btn-sm ${p.is_available ? 'btn-success' : 'btn-outline-secondary'}" onclick="toggleProduct(${p.id})">
          ${p.is_available ? '<i class="bi bi-check"></i> Ja' : '<i class="bi bi-x"></i> Nee'}
        </button>
      </td>
      <td>
        <button class="btn btn-sm btn-outline-primary btn-icon me-1" onclick="editProduct(${p.id})" title="Bewerken">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger btn-icon" onclick="deleteProduct(${p.id}, '${escapeHtml(p.name)}')" title="Verwijderen">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

async function ensureCategoriesForFilters() {
  // We need categories to fill product category filter and for category-product modal titles.
  if (Array.isArray(categoriesCache) && categoriesCache.length > 0) return;
  try {
    const data = await apiRequest('/admin/categories');
    categoriesCache = Array.isArray(data.data) ? data.data : [];
  } catch {
    // ignore
  }
}

function populateProductCategoryFilter() {
  const select = document.getElementById('product-filter-category');
  if (!select) return;
  const current = select.value || '';
  const options = [`<option value="">Alle categorieën</option>`].concat(
    (categoriesCache || []).map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
  );
  select.innerHTML = options.join('');
  select.value = current;
}

function setProductFilters({ categoryId = '', available = '', search = '' } = {}) {
  const catEl = document.getElementById('product-filter-category');
  const availEl = document.getElementById('product-filter-available');
  const searchEl = document.getElementById('product-filter-search');
  if (catEl) catEl.value = categoryId ? String(categoryId) : '';
  if (availEl) availEl.value = available || '';
  if (searchEl) searchEl.value = search || '';
}

async function loadCategoriesForSelect() {
  try {
    const data = await apiRequest('/admin/categories');
    categoriesCache = data.data;
    
    const select = document.getElementById('product-category');
    select.innerHTML = categoriesCache.map(c => 
      `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join('');
  } catch (error) {
    console.error('Categories error:', error);
  }
}

function showProductModal(product = null) {
  loadCategoriesForSelect();
  
  document.getElementById('product-modal-title').textContent = product ? 'Product Bewerken' : 'Nieuw Product';
  document.getElementById('product-id').value = product?.id || '';
  document.getElementById('product-name').value = product?.name || '';
  document.getElementById('product-category').value = product?.category_id || '';
  document.getElementById('product-price').value = product?.price || '';
  document.getElementById('product-description').value = product?.description || '';
  document.getElementById('product-image').value = product?.image_url || '';
  document.getElementById('product-available').checked = product?.is_available !== false;
  document.getElementById('product-featured').checked = product?.is_featured === true;
  
  new bootstrap.Modal(document.getElementById('productModal')).show();
}

async function editProduct(productId) {
  try {
    const data = await apiRequest(`/products/${productId}`);
    showProductModal(data.data);
  } catch (error) {
    showToast('Fout bij laden product', 'error');
  }
}

async function saveProduct(e) {
  e.preventDefault();
  
  const id = document.getElementById('product-id').value;
  const product = {
    name: document.getElementById('product-name').value,
    category_id: parseInt(document.getElementById('product-category').value),
    price: parseFloat(document.getElementById('product-price').value),
    description: document.getElementById('product-description').value || null,
    image_url: document.getElementById('product-image').value || null,
    is_available: document.getElementById('product-available').checked,
    is_featured: document.getElementById('product-featured').checked
  };
  
  try {
    if (id) {
      await apiRequest(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(product) });
      showToast('Product bijgewerkt', 'success');
    } else {
      await apiRequest('/admin/products', { method: 'POST', body: JSON.stringify(product) });
      showToast('Product aangemaakt', 'success');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    loadProducts();
  } catch (error) {
    showToast('Fout: ' + error.message, 'error');
  }
}

async function toggleProduct(productId) {
  try {
    await apiRequest(`/admin/products/${productId}/toggle`, { method: 'PATCH' });
    loadProducts();
  } catch (error) {
    showToast('Fout: ' + error.message, 'error');
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Weet je zeker dat je "${name}" wilt verwijderen?`)) return;
  
  try {
    await apiRequest(`/admin/products/${id}`, { method: 'DELETE' });
    showToast('Product verwijderd', 'success');
    loadProducts();
  } catch (error) {
    showToast('Fout: ' + error.message, 'error');
  }
}

// =====================================================
// CATEGORIES
// =====================================================

async function loadCategories() {
  try {
    const data = await apiRequest('/admin/categories');
    // Keep cache in sync so editCategory works reliably
    categoriesCache = Array.isArray(data.data) ? data.data : [];

    const search = document.getElementById('category-filter-search')?.value?.trim().toLowerCase() || '';
    const active = document.getElementById('category-filter-active')?.value || '';

    let filtered = categoriesCache;
    if (active) {
      const wantActive = active === 'true';
      filtered = filtered.filter((c) => Boolean(c.is_active) === wantActive);
    }
    if (search) {
      filtered = filtered.filter((c) => {
        const name = String(c.name || '').toLowerCase();
        const slug = String(c.slug || '').toLowerCase();
        return name.includes(search) || slug.includes(search);
      });
    }

    renderCategoriesTable(filtered);
  } catch (error) {
    console.error('Categories error:', error);
    showToast('Fout bij laden categorieën', 'error');
  }
}

function renderCategoriesTable(categories) {
  const tbody = document.getElementById('categories-table');
  
  tbody.innerHTML = categories.map(c => `
    <tr>
      <td class="fw-semibold">${escapeHtml(c.name)}</td>
      <td><code class="text-muted">${escapeHtml(c.slug)}</code></td>
      <td>
        <button type="button" class="btn btn-link p-0 text-decoration-none" onclick="showCategoryProducts(${c.id})" title="Toon producten in deze categorie">
          <span class="fw-semibold text-primary">${c.product_count || 0}</span>
        </button>
      </td>
      <td>${c.sort_order}</td>
      <td>
        <span class="badge ${c.is_active ? 'bg-success' : 'bg-secondary'}">${c.is_active ? 'Actief' : 'Inactief'}</span>
      </td>
      <td>
        <button class="btn btn-sm btn-outline-primary btn-icon me-1" onclick="editCategory(${c.id})" title="Bewerken">
          <i class="bi bi-pencil"></i>
        </button>
        ${c.product_count === 0 ? `
          <button class="btn btn-sm btn-outline-danger btn-icon" onclick="deleteCategory(${c.id})" title="Verwijderen">
            <i class="bi bi-trash"></i>
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

async function showCategoryProducts(categoryId) {
  try {
    await ensureCategoriesForFilters();
    const category = (categoriesCache || []).find((c) => c.id === categoryId) || { id: categoryId, name: `Categorie #${categoryId}` };

    const titleEl = document.getElementById('category-products-title');
    const subEl = document.getElementById('category-products-subtitle');
    const tbody = document.getElementById('category-products-table');
    if (titleEl) titleEl.textContent = `Producten: ${category.name}`;
    if (subEl) subEl.textContent = 'Klik op een actie om snel aan te passen.';
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Laden...</td></tr>';

    const btnOpen = document.getElementById('btn-open-products-filtered');
    if (btnOpen) {
      btnOpen.onclick = () => {
        setProductFilters({ categoryId: String(categoryId) });
        showPage('products');
        bootstrap.Modal.getInstance(document.getElementById('categoryProductsModal'))?.hide();
      };
    }

    const modalEl = document.getElementById('categoryProductsModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();

    const data = await apiRequest(`/admin/products?category=${encodeURIComponent(categoryId)}`);
    const products = Array.isArray(data.data) ? data.data : [];

    if (!tbody) return;
    if (products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Geen producten in deze categorie</td></tr>';
      return;
    }

    tbody.innerHTML = products.map((p) => `
      <tr>
        <td class="fw-semibold">${escapeHtml(p.name)}</td>
        <td class="fw-semibold">${formatCurrency(p.price)}</td>
        <td>
          <span class="badge ${p.is_available ? 'bg-success' : 'bg-secondary'}">
            ${p.is_available ? 'Ja' : 'Nee'}
          </span>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary btn-icon me-1" onclick="editProduct(${p.id}); bootstrap.Modal.getInstance(document.getElementById('categoryProductsModal'))?.hide();" title="Bewerken">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm ${p.is_available ? 'btn-outline-secondary' : 'btn-success'}" onclick="toggleProduct(${p.id}); showCategoryProducts(${categoryId});" title="Toggle beschikbaar">
            ${p.is_available ? '<i class="bi bi-x"></i>' : '<i class="bi bi-check"></i>'}
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Category products error:', error);
    showToast('Fout bij laden producten in categorie', 'error');
  }
}

function showCategoryModal(category = null) {
  document.getElementById('category-modal-title').textContent = category ? 'Categorie Bewerken' : 'Nieuwe Categorie';
  document.getElementById('category-id').value = category?.id || '';
  document.getElementById('category-name').value = category?.name || '';
  document.getElementById('category-description').value = category?.description || '';
  document.getElementById('category-sort').value = category?.sort_order || 0;
  document.getElementById('category-active').checked = category?.is_active !== false;
  
  new bootstrap.Modal(document.getElementById('categoryModal')).show();
}

async function editCategory(categoryId) {
  const category = categoriesCache.find(c => c.id === categoryId);
  if (category) {
    showCategoryModal(category);
  }
}

async function saveCategory(e) {
  e.preventDefault();
  
  const id = document.getElementById('category-id').value;
  const category = {
    name: document.getElementById('category-name').value,
    description: document.getElementById('category-description').value || null,
    sort_order: parseInt(document.getElementById('category-sort').value) || 0,
    is_active: document.getElementById('category-active').checked
  };
  
  try {
    if (id) {
      await apiRequest(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(category) });
      showToast('Categorie bijgewerkt', 'success');
    } else {
      await apiRequest('/admin/categories', { method: 'POST', body: JSON.stringify(category) });
      showToast('Categorie aangemaakt', 'success');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
    loadCategories();
  } catch (error) {
    showToast('Fout: ' + error.message, 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm('Weet je zeker dat je deze categorie wilt verwijderen?')) return;
  
  try {
    await apiRequest(`/admin/categories/${id}`, { method: 'DELETE' });
    showToast('Categorie verwijderd', 'success');
    loadCategories();
  } catch (error) {
    showToast('Fout: ' + error.message, 'error');
  }
}

// =====================================================
// PAYMENTS
// =====================================================

async function loadPayments() {
  try {
    const status = document.getElementById('payment-status-filter')?.value || '';
    const dateFrom = document.getElementById('payment-date-from')?.value || '';
    const dateTo = document.getElementById('payment-date-to')?.value || '';

    let query = '?';
    if (status) query += `status=${encodeURIComponent(status)}&`;
    if (dateFrom) query += `date_from=${encodeURIComponent(dateFrom)}&`;
    if (dateTo) query += `date_to=${encodeURIComponent(dateTo)}&`;

    const data = await apiRequest(`/admin/payments${query}`);
    renderPaymentsTable(data.data);
  } catch (error) {
    console.error('Payments error:', error);
    showToast('Fout bij laden betalingen', 'error');
  }
}

function renderPaymentsTable(payments) {
  const tbody = document.getElementById('payments-table');
  
  if (payments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Geen betalingen</td></tr>';
    return;
  }
  
  tbody.innerHTML = payments.map(p => `
    <tr>
      <td><code class="text-muted small">${escapeHtml(p.mollie_payment_id || '-')}</code></td>
      <td><span class="text-primary">${escapeHtml(p.order_number)}</span></td>
      <td>${escapeHtml(p.customer_name)}</td>
      <td class="fw-semibold">${formatCurrency(p.amount)}</td>
      <td>${p.method || '-'}</td>
      <td><span class="badge badge-status status-${p.status}">${translatePaymentStatus(p.status)}</span></td>
      <td class="text-muted">${formatDateTime(p.created_at)}</td>
    </tr>
  `).join('');
}

// =====================================================
// SETTINGS
// =====================================================

async function loadSettings() {
  try {
    const data = await apiRequest('/admin/settings');
    
    data.data.forEach(setting => {
      const el = document.getElementById(`setting-${setting.setting_key}`);
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = setting.setting_value === true;
        } else {
          el.value = setting.setting_value;
        }
      }
    });
  } catch (error) {
    console.error('Settings error:', error);
    showToast('Fout bij laden instellingen', 'error');
  }
}

async function saveSetting(key, value) {
  try {
    await apiRequest(`/admin/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value })
    });
    return true;
  } catch (error) {
    showToast('Fout bij opslaan: ' + error.message, 'error');
    return false;
  }
}

async function saveSettingsForm(formId, settingKeys) {
  let success = true;
  
  for (const key of settingKeys) {
    const el = document.getElementById(`setting-${key}`);
    if (el) {
      const value = el.type === 'checkbox' ? el.checked : el.value;
      if (!await saveSetting(key, value)) {
        success = false;
      }
    }
  }
  
  if (success) {
    showToast('Instellingen opgeslagen', 'success');
  }
}

// =====================================================
// USERS
// =====================================================

async function loadUsers() {
  try {
    const data = await apiRequest('/admin/users');
    const search = document.getElementById('user-filter-search')?.value?.trim().toLowerCase() || '';
    const role = document.getElementById('user-filter-role')?.value || '';
    const active = document.getElementById('user-filter-active')?.value || '';

    let users = Array.isArray(data.data) ? data.data : [];
    if (role) users = users.filter((u) => u.role === role);
    if (active) {
      const want = active === 'true';
      users = users.filter((u) => Boolean(u.is_active) === want);
    }
    if (search) {
      users = users.filter((u) => {
        const name = String(u.name || '').toLowerCase();
        const email = String(u.email || '').toLowerCase();
        return name.includes(search) || email.includes(search);
      });
    }

    renderUsersTable(users);
  } catch (error) {
    console.error('Users error:', error);
    showToast('Fout bij laden gebruikers', 'error');
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table');
  
  tbody.innerHTML = users.map(u => `
    <tr>
      <td class="fw-semibold">${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td><span class="badge ${u.role === 'admin' ? 'bg-primary' : 'bg-secondary'}">${u.role === 'admin' ? 'Administrator' : 'Medewerker'}</span></td>
      <td class="text-muted">${u.last_login ? formatDateTime(u.last_login) : 'Nooit'}</td>
      <td><span class="badge ${u.is_active ? 'bg-success' : 'bg-danger'}">${u.is_active ? 'Actief' : 'Inactief'}</span></td>
      <td></td>
    </tr>
  `).join('');
}

function showUserModal() {
  document.getElementById('user-form').reset();
  new bootstrap.Modal(document.getElementById('userModal')).show();
}

async function saveUser(e) {
  e.preventDefault();
  
  const user = {
    name: document.getElementById('user-name').value,
    email: document.getElementById('user-email').value,
    password: document.getElementById('user-password').value,
    role: document.getElementById('user-role').value
  };
  
  try {
    await apiRequest('/admin/users', { method: 'POST', body: JSON.stringify(user) });
    showToast('Gebruiker aangemaakt', 'success');
    bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
    loadUsers();
  } catch (error) {
    showToast('Fout: ' + error.message, 'error');
  }
}

// =====================================================
// LOGS
// =====================================================

async function loadLogs() {
  try {
    const action = document.getElementById('logs-filter-action')?.value?.trim() || '';
    const dateFrom = document.getElementById('logs-filter-date-from')?.value || '';
    const limit = document.getElementById('logs-filter-limit')?.value || '100';

    let query = '?';
    if (action) query += `action=${encodeURIComponent(action)}&`;
    if (dateFrom) query += `date_from=${encodeURIComponent(dateFrom)}&`;
    if (limit) query += `limit=${encodeURIComponent(limit)}&`;

    const data = await apiRequest(`/admin/logs${query}`);
    renderLogsTable(data.data);
  } catch (error) {
    console.error('Logs error:', error);
    showToast('Fout bij laden logs', 'error');
  }
}

function renderLogsTable(logs) {
  const tbody = document.getElementById('logs-table');
  
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Geen activiteiten</td></tr>';
    return;
  }
  
  tbody.innerHTML = logs.map(log => `
    <tr>
      <td class="text-muted">${formatDateTime(log.created_at)}</td>
      <td>${escapeHtml(log.user_name || 'Systeem')}</td>
      <td><code>${escapeHtml(log.action)}</code></td>
      <td class="small text-muted">${log.entity_type ? `${log.entity_type} #${log.entity_id}` : '-'}</td>
      <td class="small text-muted">${log.ip_address || '-'}</td>
    </tr>
  `).join('');
}

// =====================================================
// HELPERS
// =====================================================

function formatCurrency(value) {
  return '€' + parseFloat(value || 0).toFixed(2);
}

function openRevenueModal(period) {
  const modalEl = document.getElementById('revenueModal');
  const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modal.show();
  loadRevenueModal(period);
}

async function loadRevenueModal(period) {
  const titleEl = document.getElementById('revenue-modal-title');
  const subtitleEl = document.getElementById('revenue-modal-subtitle');
  const summaryEl = document.getElementById('revenue-summary');
  const ordersTbody = document.getElementById('revenue-orders-table');

  if (subtitleEl) subtitleEl.textContent = 'Laden...';
  if (summaryEl) summaryEl.textContent = 'Laden...';
  if (ordersTbody) ordersTbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Laden...</td></tr>';

  const rev = await apiRequest(`/admin/revenue?period=${encodeURIComponent(period)}`);
  const data = rev.data;
  if (titleEl) titleEl.innerHTML = `<i class="bi bi-currency-euro me-2"></i>${escapeHtml(data.title || 'Omzet details')}`;

  const t = data.totals;
  if (subtitleEl) subtitleEl.textContent = `${t.orders} bestellingen • ${formatCurrency(t.revenue)} omzet`;
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="d-flex justify-content-between"><span>Omzet (incl. BTW)</span><strong>${formatCurrency(t.revenue)}</strong></div>
      <div class="d-flex justify-content-between"><span>Netto</span><span>${formatCurrency(t.net_amount)}</span></div>
      <div class="d-flex justify-content-between"><span>BTW (${t.tax_rate}%)</span><span>${formatCurrency(t.vat_amount)}</span></div>
      <div class="d-flex justify-content-between mt-2 pt-2 border-top"><span>Bestellingen</span><span>${t.orders}</span></div>
      <div class="d-flex justify-content-between"><span>Bezorgen</span><span>${t.delivery_orders}</span></div>
      <div class="d-flex justify-content-between"><span>Afhalen</span><span>${t.pickup_orders}</span></div>
    `;
  }

  // Orders list for details (reuse existing /admin/orders)
  let date_from = '';
  let date_to = '';
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const iso = (d) => d.toISOString().slice(0, 10);
  if (period === 'today') {
    date_from = iso(today);
    date_to = iso(today);
  } else if (period === 'week') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    date_from = iso(from);
    date_to = iso(today);
  } else if (period === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    date_from = iso(from);
    date_to = iso(to);
  }

  const ordersResp = await apiRequest(`/admin/orders?date_from=${encodeURIComponent(date_from)}&date_to=${encodeURIComponent(date_to)}&limit=200`);
  const orders = ordersResp.data.orders || [];

  if (ordersTbody) {
    if (!orders.length) {
      ordersTbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Geen bestellingen</td></tr>';
    } else {
      ordersTbody.innerHTML = orders.map((o) => `
        <tr>
          <td><span class="text-primary fw-semibold">${escapeHtml(o.order_number)}</span></td>
          <td>${escapeHtml(o.customer_name)}</td>
          <td><span class="badge ${o.delivery_type === 'delivery' ? 'bg-info' : 'bg-secondary'}">${o.delivery_type === 'delivery' ? 'Bezorgen' : 'Afhalen'}</span></td>
          <td><span class="badge badge-status status-${o.status}">${translateStatus(o.status)}</span></td>
          <td><span class="badge badge-status status-${o.payment_status || 'pending'}">${translatePaymentStatus(o.payment_status)}</span></td>
          <td class="text-end fw-semibold">${formatCurrency(o.total)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary btn-icon" onclick="showOrderDetail(${o.id})" title="Details">
              <i class="bi bi-eye"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }
  }

  // Chart.js
  const ctx = document.getElementById('revenueChart');
  if (ctx && window.Chart) {
    if (revenueChart) {
      try { revenueChart.destroy(); } catch {}
      revenueChart = null;
    }
    const labels = (data.points || []).map((p) => p.label);
    const revenues = (data.points || []).map((p) => Number(p.revenue || 0));
    const counts = (data.points || []).map((p) => Number(p.orders || 0));

    revenueChart = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Omzet (€)',
            data: revenues,
            backgroundColor: 'rgba(255,193,7,0.35)',
            borderColor: 'rgba(255,193,7,0.9)',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Bestellingen',
            data: counts,
            type: 'line',
            borderColor: 'rgba(59,130,246,0.9)',
            backgroundColor: 'rgba(59,130,246,0.15)',
            tension: 0.25,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: 'rgba(255,255,255,0.85)' } },
          tooltip: { enabled: true }
        },
        scales: {
          x: { ticks: { color: 'rgba(255,255,255,0.75)' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: 'rgba(255,255,255,0.75)' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y1: { position: 'right', ticks: { color: 'rgba(255,255,255,0.75)' }, grid: { drawOnChartArea: false } }
        }
      }
    });
  }
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('nl-BE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
}

function translateStatus(status) {
  const translations = {
    pending: 'Nieuw',
    paid: 'Betaald',
    preparing: 'In bereiding',
    ready: 'Klaar',
    delivering: 'Onderweg',
    delivered: 'Geleverd',
    cancelled: 'Geannuleerd'
  };
  return translations[status] || status;
}

function translatePaymentStatus(status) {
  const translations = {
    open: 'Open',
    pending: 'In behandeling',
    paid: 'Betaald',
    failed: 'Mislukt',
    canceled: 'Geannuleerd',
    expired: 'Verlopen'
  };
  return translations[status] || status || 'Onbekend';
}

function getStatusOptions(current) {
  const statuses = ['pending', 'paid', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'];
  return statuses.map(s => 
    `<option value="${s}" ${s === current ? 'selected' : ''}>${translateStatus(s)}</option>`
  ).join('');
}

function isNewOrder(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  return (now - created) < 5 * 60 * 1000; // 5 minutes
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} show`;
  toast.innerHTML = `
    <div class="toast-body d-flex align-items-center">
      <i class="bi ${type === 'success' ? 'bi-check-circle text-success' : type === 'error' ? 'bi-x-circle text-danger' : 'bi-info-circle text-info'} me-2"></i>
      ${escapeHtml(message)}
    </div>
  `;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function goToPage(page) {
  // Implement pagination for orders
  console.log('Go to page:', page);
}

// =====================================================
// EVENT LISTENERS
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
  // Check auth
  checkAuth();
  
  // Login form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    try {
      errorEl.classList.add('d-none');
      await login(email, password);
      showApp();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('d-none');
    }
  });
  
  // Logout
  document.getElementById('logout-btn').addEventListener('click', logout);
  
  // Navigation
  document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showPage(link.dataset.page);
    });
  });
  
  // Sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', openSidebar);
  document.getElementById('sidebar-close')?.addEventListener('click', closeSidebar);
  
  // Refresh
  document.getElementById('refresh-btn')?.addEventListener('click', () => loadPageData(currentPage));
  document.getElementById('report-btn')?.addEventListener('click', () => showPage('reports'));
  document.getElementById('notifications-btn')?.addEventListener('click', openNotificationsModal);
  document.getElementById('btn-notifications-readall')?.addEventListener('click', async () => {
    try {
      await apiRequest('/admin/notifications/read', { method: 'POST' });
      await loadNotifications();
      showToast('Notificaties gemarkeerd als gelezen', 'success');
    } catch (e) {
      showToast('Fout: ' + (e?.message || e), 'error');
    }
  });
  
  // Forms
  document.getElementById('product-form')?.addEventListener('submit', saveProduct);
  document.getElementById('category-form')?.addEventListener('submit', saveCategory);
  document.getElementById('user-form')?.addEventListener('submit', saveUser);
  
  // Settings forms
  document.getElementById('settings-info-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettingsForm('settings-info-form', ['restaurant_name', 'restaurant_address', 'restaurant_phone', 'restaurant_email']);
  });
  
  document.getElementById('settings-delivery-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettingsForm('settings-delivery-form', ['delivery_fee', 'minimum_order', 'delivery_time', 'pickup_time', 'tax_rate']);
  });
  
  // Settings toggles (auto-save)
  ['is_open', 'notification_sound', 'auto_accept_orders', 'print_auto'].forEach(key => {
    document.getElementById(`setting-${key}`)?.addEventListener('change', (e) => {
      saveSetting(key, e.target.checked);
    });
  });
  
  // Filter listeners
  document.getElementById('filter-status')?.addEventListener('change', loadOrders);
  document.getElementById('filter-payment')?.addEventListener('change', loadOrders);
  document.getElementById('filter-delivery')?.addEventListener('change', loadOrders);
  document.getElementById('filter-date')?.addEventListener('change', loadOrders);
  document.getElementById('filter-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadOrders();
  });

  document.getElementById('product-filter-category')?.addEventListener('change', loadProducts);
  document.getElementById('product-filter-available')?.addEventListener('change', loadProducts);
  document.getElementById('product-filter-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadProducts();
  });

  document.getElementById('category-filter-active')?.addEventListener('change', loadCategories);
  document.getElementById('category-filter-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadCategories();
  });

  document.getElementById('payment-status-filter')?.addEventListener('change', loadPayments);
  document.getElementById('payment-date-from')?.addEventListener('change', loadPayments);
  document.getElementById('payment-date-to')?.addEventListener('change', loadPayments);

  document.getElementById('user-filter-role')?.addEventListener('change', loadUsers);
  document.getElementById('user-filter-active')?.addEventListener('change', loadUsers);
  document.getElementById('user-filter-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadUsers();
  });

  document.getElementById('logs-filter-action')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadLogs();
  });
  document.getElementById('logs-filter-date-from')?.addEventListener('change', loadLogs);
  document.getElementById('logs-filter-limit')?.addEventListener('change', loadLogs);

  // Revenue stat cards -> modal with charts/details
  document.querySelectorAll('.stat-card-clickable[data-revenue-period]').forEach((el) => {
    el.addEventListener('click', () => {
      const period = el.getAttribute('data-revenue-period') || 'today';
      openRevenueModal(period);
    });
  });

  // Reports listeners
  document.getElementById('report-daily-date')?.addEventListener('change', previewDailyReport);
  document.getElementById('report-range-from')?.addEventListener('change', previewRangeReport);
  document.getElementById('report-range-to')?.addEventListener('change', previewRangeReport);

  document.getElementById('btn-daily-download')?.addEventListener('click', async () => {
    try {
      const date = document.getElementById('report-daily-date')?.value || '';
      if (!date) throw new Error('Kies een datum');
      await downloadReportPdf('daily', { date });
      showToast('PDF gedownload', 'success');
    } catch (e) {
      showToast('Fout: ' + (e?.message || e), 'error');
    }
  });
  document.getElementById('btn-range-download')?.addEventListener('click', async () => {
    try {
      const date_from = document.getElementById('report-range-from')?.value || '';
      const date_to = document.getElementById('report-range-to')?.value || '';
      if (!date_from || !date_to) throw new Error('Kies een periode');
      await downloadReportPdf('range', { date_from, date_to });
      showToast('PDF gedownload', 'success');
    } catch (e) {
      showToast('Fout: ' + (e?.message || e), 'error');
    }
  });
  document.getElementById('btn-daily-email')?.addEventListener('click', async () => {
    try {
      const date = document.getElementById('report-daily-date')?.value || '';
      const to = document.getElementById('report-daily-email')?.value || '';
      if (!date) throw new Error('Kies een datum');
      if (!to) throw new Error('Vul een e-mailadres in');
      await emailReportPdf('daily', { date }, to);
      showToast('Rapport verzonden', 'success');
    } catch (e) {
      showToast('Fout: ' + (e?.message || e), 'error');
    }
  });
  document.getElementById('btn-range-email')?.addEventListener('click', async () => {
    try {
      const date_from = document.getElementById('report-range-from')?.value || '';
      const date_to = document.getElementById('report-range-to')?.value || '';
      const to = document.getElementById('report-range-email')?.value || '';
      if (!date_from || !date_to) throw new Error('Kies een periode');
      if (!to) throw new Error('Vul een e-mailadres in');
      await emailReportPdf('range', { date_from, date_to }, to);
      showToast('Rapport verzonden', 'success');
    } catch (e) {
      showToast('Fout: ' + (e?.message || e), 'error');
    }
  });
});
