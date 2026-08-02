/**
 * Secret / sensitive settings helpers
 */

const SENSITIVE_KEY_RE = /(secret|password|api_key|client_secret|webhook_secret|access_token|private_key|admin_pin)/i;

export function isSensitiveSettingKey(key) {
  return SENSITIVE_KEY_RE.test(String(key || ''));
}

export function maskSecretValue(value) {
  if (value == null || value === '') return '';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  if (!str || str === '********') return str;
  if (str.length <= 8) return '********';
  return `${str.slice(0, 4)}…********`;
}

/**
 * Operational settings staff may read (non-secret).
 * Everything else is admin-only or masked.
 */
export const STAFF_ALLOWED_SETTING_KEYS = new Set([
  'is_open',
  'notification_sound',
  'auto_accept_orders',
  'print_auto',
  'printer_enabled',
  'printer_ip',
  'printer_port',
  'restaurant_name',
  'restaurant_address',
  'restaurant_phone',
  'restaurant_email',
  'delivery_fee',
  'minimum_order',
  'delivery_time',
  'pickup_time',
  'tax_rate',
  'delivery_radius',
  'print_bridge_enabled',
  'print_bridge_auto_dispatch',
  'default_company_id',
  'pin_protected_categories'
]);

export function sanitizeSettingsForUser(settings, user) {
  const isAdminUser = user?.role === 'admin';
  return settings
    .filter((s) => {
      if (isAdminUser) return true;
      return STAFF_ALLOWED_SETTING_KEYS.has(s.setting_key);
    })
    .map((s) => {
      if (!isSensitiveSettingKey(s.setting_key)) return s;
      return {
        ...s,
        setting_value: s.setting_value ? maskSecretValue(s.setting_value) : '',
        is_secret: true
      };
    });
}
