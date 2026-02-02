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
    
    // Update connection status
    document.getElementById('connection-status').style.background = 'var(--success)';
  } catch (error) {
    console.error('Live update error:', error);
    document.getElementById('connection-status').style.background = 'var(--danger)';
  }
}

function handleNewOrders(orders) {
  // Play notification sound
  const soundEnabled = document.getElementById('setting-notification_sound')?.checked !== false;
  if (soundEnabled) {
    document.getElementById('notification-sound')?.play().catch(() => {});
  }
  
  // Show toast
  orders.forEach(order => {
    showToast(`Nieuwe bestelling: ${order.order_number}`, 'success');
  });
  
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
      <span class="popular-name">${escapeHtml(product.product_name)}</span>
      <span class="popular-qty">${product.qty}x</span>
    </div>
  `).join('');
}

// =====================================================
// ORDERS
// =====================================================

async function loadOrders() {
  try {
    const status = document.getElementById('filter-status')?.value || '';
    const delivery = document.getElementById('filter-delivery')?.value || '';
    const date = document.getElementById('filter-date')?.value || '';
    const search = document.getElementById('filter-search')?.value || '';
    
    let query = '?';
    if (status) query += `status=${status}&`;
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
        <small class="text-muted">${escapeHtml(order.customer_phone)}</small><br>
        <small class="text-muted">${escapeHtml(order.customer_email)}</small>
      </td>
      <td><span class="badge ${order.delivery_type === 'delivery' ? 'bg-info' : 'bg-secondary'}">${order.delivery_type === 'delivery' ? 'Bezorgen' : 'Afhalen'}</span></td>
      <td class="fw-semibold">${formatCurrency(order.total)}</td>
      <td><span class="badge badge-status status-${order.payment_status || 'pending'}">${translatePaymentStatus(order.payment_status)}</span></td>
      <td>
        <select class="status-select" onchange="updateOrderStatus(${order.id}, this.value)">
          ${getStatusOptions(order.status)}
        </select>
      </td>
      <td class="text-muted">${formatDateTime(order.created_at)}</td>
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
    
    const modal = document.getElementById('order-modal-content');
    modal.innerHTML = `
      <div class="order-detail-grid">
        <div class="order-detail-section">
          <h6>Klantgegevens</h6>
          <p><strong>${escapeHtml(order.customer_name)}</strong></p>
          <p>${escapeHtml(order.customer_email)}</p>
          <p>${escapeHtml(order.customer_phone)}</p>
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
    
    new bootstrap.Modal(document.getElementById('orderModal')).show();
  } catch (error) {
    console.error('Order detail error:', error);
    showToast('Fout bij laden bestelling', 'error');
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
    await apiRequest(`/admin/orders/${orderId}/print`, { method: 'POST' });
    window.print();
  } catch (error) {
    console.error('Print error:', error);
  }
}

// =====================================================
// PRODUCTS
// =====================================================

async function loadProducts() {
  try {
    const data = await apiRequest('/admin/products');
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
      <td><span class="badge bg-secondary">${escapeHtml(p.category_name || '-')}</span></td>
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
    renderCategoriesTable(data.data);
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
      <td>${c.product_count || 0}</td>
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
    const query = status ? `?status=${status}` : '';
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
    renderUsersTable(data.data);
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
    const data = await apiRequest('/admin/logs');
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
  ['is_open', 'notification_sound', 'auto_accept_orders'].forEach(key => {
    document.getElementById(`setting-${key}`)?.addEventListener('change', (e) => {
      saveSetting(key, e.target.checked);
    });
  });
  
  // Filter listeners
  document.getElementById('filter-status')?.addEventListener('change', loadOrders);
  document.getElementById('filter-delivery')?.addEventListener('change', loadOrders);
  document.getElementById('filter-date')?.addEventListener('change', loadOrders);
  document.getElementById('payment-status-filter')?.addEventListener('change', loadPayments);
});
