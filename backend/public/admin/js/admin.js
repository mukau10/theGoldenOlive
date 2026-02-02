/**
 * The Golden Olive - Admin Panel JavaScript
 */

const API_BASE = '/api';
let authToken = localStorage.getItem('admin_token');
let currentUser = null;

// ============================================
// API HELPERS
// ============================================

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Er is een fout opgetreden');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ============================================
// AUTHENTICATION
// ============================================

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
  } catch (error) {
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
  loadDashboard();
}

// ============================================
// NAVIGATION
// ============================================

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
  
  document.getElementById(`page-${pageId}`).classList.add('active');
  document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

  // Load page data
  switch (pageId) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'orders':
      loadOrders();
      break;
    case 'products':
      loadProducts();
      break;
    case 'categories':
      loadCategories();
      break;
    case 'settings':
      loadSettings();
      break;
  }

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
  try {
    const data = await apiRequest('/admin/dashboard');
    const stats = data.data;

    document.getElementById('stat-today-orders').textContent = stats.today.orders;
    document.getElementById('stat-today-revenue').textContent = `€${stats.today.revenue.toFixed(2)}`;
    document.getElementById('stat-pending').textContent = stats.pending_orders;
    document.getElementById('stat-month-revenue').textContent = `€${stats.month.revenue.toFixed(2)}`;

    // Recent orders
    const ordersHtml = stats.recent_orders.map(order => `
      <tr>
        <td><span class="text-golden">${order.order_number}</span></td>
        <td>${order.customer_name}</td>
        <td>€${parseFloat(order.total).toFixed(2)}</td>
        <td><span class="badge badge-status status-${order.status}">${translateStatus(order.status)}</span></td>
        <td>${formatDate(order.created_at)}</td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="text-center">Geen bestellingen</td></tr>';
    
    document.getElementById('recent-orders-table').innerHTML = ordersHtml;

    // Popular products
    const productsHtml = stats.popular_products.map(p => `
      <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
        <span>${p.product_name}</span>
        <span class="text-golden">${p.total_quantity}x</span>
      </div>
    `).join('') || '<p class="text-muted">Geen data</p>';
    
    document.getElementById('popular-products').innerHTML = productsHtml;

  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

// ============================================
// ORDERS
// ============================================

async function loadOrders() {
  try {
    const status = document.getElementById('orders-status-filter').value;
    const query = status ? `?status=${status}` : '';
    const data = await apiRequest(`/orders${query}`);
    
    const ordersHtml = data.data.orders.map(order => `
      <tr>
        <td><span class="text-golden">${order.order_number}</span></td>
        <td>
          <div>${order.customer_name}</div>
          <small class="text-muted">${order.customer_email}</small>
        </td>
        <td><span class="badge ${order.delivery_type === 'delivery' ? 'bg-info' : 'bg-secondary'}">${order.delivery_type === 'delivery' ? 'Bezorgen' : 'Afhalen'}</span></td>
        <td>€${parseFloat(order.total).toFixed(2)}</td>
        <td>
          <select class="form-select form-select-sm" onchange="updateOrderStatus(${order.id}, this.value)" style="width: auto;">
            ${getStatusOptions(order.status)}
          </select>
        </td>
        <td><span class="badge badge-status status-${order.payment_status || 'pending'}">${translatePaymentStatus(order.payment_status)}</span></td>
        <td>${formatDate(order.created_at)}</td>
        <td>
          <button class="btn btn-sm btn-outline-golden" onclick="showOrderDetails(${order.id})">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="8" class="text-center">Geen bestellingen</td></tr>';
    
    document.getElementById('orders-table').innerHTML = ordersHtml;

  } catch (error) {
    console.error('Error loading orders:', error);
    document.getElementById('orders-table').innerHTML = '<tr><td colspan="8" class="text-center text-danger">Fout bij laden</td></tr>';
  }
}

async function showOrderDetails(orderId) {
  try {
    const data = await apiRequest(`/orders/${orderId}`);
    const order = data.data;

    const itemsHtml = order.items.map(item => `
      <div class="order-item d-flex justify-content-between">
        <div>
          <strong>${item.quantity}x</strong> ${item.product_name}
          ${item.notes ? `<br><small class="text-muted">${item.notes}</small>` : ''}
        </div>
        <div>€${parseFloat(item.subtotal).toFixed(2)}</div>
      </div>
    `).join('');

    document.getElementById('order-modal-content').innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <h6 class="text-golden">Klantgegevens</h6>
          <p>
            <strong>${order.customer_name}</strong><br>
            ${order.customer_email}<br>
            ${order.customer_phone}
          </p>
          ${order.delivery_type === 'delivery' ? `
            <h6 class="text-golden mt-3">Bezorgadres</h6>
            <p>
              ${order.street} ${order.house_number}${order.bus ? ' ' + order.bus : ''}<br>
              ${order.postal_code} ${order.city}
            </p>
          ` : '<p class="text-info">Afhalen</p>'}
          ${order.notes ? `
            <h6 class="text-golden mt-3">Opmerking</h6>
            <p>${order.notes}</p>
          ` : ''}
        </div>
        <div class="col-md-6">
          <h6 class="text-golden">Bestelling #${order.order_number}</h6>
          <div class="mb-3">
            ${itemsHtml}
          </div>
          <hr class="border-secondary">
          <div class="d-flex justify-content-between">
            <span>Subtotaal</span>
            <span>€${parseFloat(order.subtotal).toFixed(2)}</span>
          </div>
          ${order.delivery_fee > 0 ? `
            <div class="d-flex justify-content-between">
              <span>Bezorgkosten</span>
              <span>€${parseFloat(order.delivery_fee).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="d-flex justify-content-between mt-2">
            <strong class="text-golden">Totaal</strong>
            <strong class="text-golden">€${parseFloat(order.total).toFixed(2)}</strong>
          </div>
          <hr class="border-secondary">
          <p>
            <strong>Status:</strong> <span class="badge badge-status status-${order.status}">${translateStatus(order.status)}</span><br>
            <strong>Betaling:</strong> <span class="badge badge-status status-${order.payment_status}">${translatePaymentStatus(order.payment_status)}</span>
            ${order.payment_method ? `(${order.payment_method})` : ''}
          </p>
        </div>
      </div>
    `;

    new bootstrap.Modal(document.getElementById('orderModal')).show();

  } catch (error) {
    console.error('Error loading order details:', error);
    alert('Fout bij laden van besteldetails');
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    await apiRequest(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    // Reload orders to show updated status
  } catch (error) {
    console.error('Error updating status:', error);
    alert('Fout bij bijwerken status: ' + error.message);
    loadOrders();
  }
}

// ============================================
// PRODUCTS
// ============================================

let categoriesCache = [];

async function loadProducts() {
  try {
    const data = await apiRequest('/products?available=all');
    const products = data.data;

    const productsHtml = products.map(p => `
      <tr>
        <td>${p.name}</td>
        <td><span class="badge bg-secondary">${p.category_name}</span></td>
        <td>€${parseFloat(p.price).toFixed(2)}</td>
        <td>
          <span class="badge ${p.is_available ? 'bg-success' : 'bg-danger'}">
            ${p.is_available ? 'Ja' : 'Nee'}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-golden me-1" onclick="editProduct(${p.id})">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${p.id}, '${p.name}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="text-center">Geen producten</td></tr>';
    
    document.getElementById('products-table').innerHTML = productsHtml;

  } catch (error) {
    console.error('Error loading products:', error);
  }
}

async function loadCategoriesForSelect() {
  try {
    const data = await apiRequest('/categories?active=all');
    categoriesCache = data.data;
    
    const select = document.getElementById('product-category');
    select.innerHTML = categoriesCache.map(c => 
      `<option value="${c.id}">${c.name}</option>`
    ).join('');
  } catch (error) {
    console.error('Error loading categories:', error);
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
  document.getElementById('product-available').checked = product?.is_available !== false;

  new bootstrap.Modal(document.getElementById('productModal')).show();
}

async function editProduct(productId) {
  try {
    const data = await apiRequest(`/products/${productId}`);
    showProductModal(data.data);
  } catch (error) {
    console.error('Error loading product:', error);
  }
}

async function saveProduct(e) {
  e.preventDefault();
  
  const id = document.getElementById('product-id').value;
  const product = {
    name: document.getElementById('product-name').value,
    category_id: parseInt(document.getElementById('product-category').value),
    price: parseFloat(document.getElementById('product-price').value),
    description: document.getElementById('product-description').value,
    is_available: document.getElementById('product-available').checked
  };

  try {
    if (id) {
      await apiRequest(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(product)
      });
    } else {
      await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(product)
      });
    }

    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    loadProducts();
  } catch (error) {
    alert('Fout: ' + error.message);
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Weet je zeker dat je "${name}" wilt verwijderen?`)) return;

  try {
    await apiRequest(`/products/${id}`, { method: 'DELETE' });
    loadProducts();
  } catch (error) {
    alert('Fout: ' + error.message);
  }
}

// ============================================
// CATEGORIES
// ============================================

async function loadCategories() {
  try {
    const data = await apiRequest('/categories?active=all');
    
    // Get product counts
    const products = await apiRequest('/products?available=all');
    const counts = {};
    products.data.forEach(p => {
      counts[p.category_id] = (counts[p.category_id] || 0) + 1;
    });

    const categoriesHtml = data.data.map(c => `
      <tr>
        <td>${c.name}</td>
        <td><code>${c.slug}</code></td>
        <td>${counts[c.id] || 0}</td>
        <td>
          <span class="badge ${c.is_active ? 'bg-success' : 'bg-danger'}">
            ${c.is_active ? 'Ja' : 'Nee'}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-golden me-1" onclick="editCategory(${c.id})">
            <i class="bi bi-pencil"></i>
          </button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="text-center">Geen categorieën</td></tr>';
    
    document.getElementById('categories-table').innerHTML = categoriesHtml;

  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// ============================================
// SETTINGS
// ============================================

async function loadSettings() {
  try {
    const data = await apiRequest('/admin/settings');
    
    data.data.forEach(s => {
      const el = document.getElementById(`setting-${s.setting_key}`);
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = s.setting_value === true || s.setting_value === 'true';
        } else {
          el.value = s.setting_value;
        }
      }
    });

  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function saveSettings(e) {
  e.preventDefault();
  
  const settings = [
    { key: 'delivery_fee', value: document.getElementById('setting-delivery_fee').value },
    { key: 'minimum_order', value: document.getElementById('setting-minimum_order').value },
    { key: 'delivery_time', value: document.getElementById('setting-delivery_time').value },
    { key: 'pickup_time', value: document.getElementById('setting-pickup_time').value },
    { key: 'is_open', value: document.getElementById('setting-is_open').checked }
  ];

  try {
    for (const s of settings) {
      await apiRequest(`/admin/settings/${s.key}`, {
        method: 'PUT',
        body: JSON.stringify({ value: s.value })
      });
    }
    alert('Instellingen opgeslagen!');
  } catch (error) {
    alert('Fout: ' + error.message);
  }
}

// ============================================
// HELPERS
// ============================================

function translateStatus(status) {
  const translations = {
    'pending': 'In afwachting',
    'paid': 'Betaald',
    'preparing': 'In bereiding',
    'ready': 'Klaar',
    'delivering': 'Onderweg',
    'delivered': 'Geleverd',
    'cancelled': 'Geannuleerd'
  };
  return translations[status] || status;
}

function translatePaymentStatus(status) {
  const translations = {
    'open': 'Open',
    'pending': 'In behandeling',
    'paid': 'Betaald',
    'failed': 'Mislukt',
    'canceled': 'Geannuleerd',
    'expired': 'Verlopen'
  };
  return translations[status] || status || 'Onbekend';
}

function getStatusOptions(current) {
  const statuses = ['pending', 'paid', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'];
  return statuses.map(s => 
    `<option value="${s}" ${s === current ? 'selected' : ''}>${translateStatus(s)}</option>`
  ).join('');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('nl-BE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
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
  document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  // Navigation
  document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showPage(link.dataset.page);
    });
  });

  // Mobile menu toggle
  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Orders filter
  document.getElementById('orders-status-filter').addEventListener('change', loadOrders);

  // Product form
  document.getElementById('product-form').addEventListener('submit', saveProduct);

  // Settings form
  document.getElementById('settings-form').addEventListener('submit', saveSettings);
});
