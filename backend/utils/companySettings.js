/**
 * Per-tenant company settings repository
 */

import { query } from '../config/database.js';
import { encryptSecret, decryptSecret, isEncryptedValue } from './cryptoSettings.js';
import { isSensitiveSettingKey } from './secrets.js';

export async function getCompanySetting(companyId, key, fallback = null) {
  const [row] = await query(
    `SELECT * FROM company_settings WHERE company_id = ? AND setting_key = ? LIMIT 1`,
    [companyId, key]
  );
  if (!row) return fallback;
  let value = row.setting_value;
  if (row.is_encrypted || isEncryptedValue(value)) {
    value = decryptSecret(value);
  }
  if (row.setting_type === 'boolean') return value === 'true' || value === true;
  if (row.setting_type === 'number') return Number(value);
  if (row.setting_type === 'json') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value;
}

export async function listCompanySettings(companyId) {
  return query(
    `SELECT * FROM company_settings WHERE company_id = ? ORDER BY setting_key`,
    [companyId]
  );
}

export async function upsertCompanySetting(companyId, key, value, type = 'string', description = null) {
  let storeValue = value;
  let settingType = type;
  let isEncrypted = 0;

  if (typeof value === 'boolean') {
    settingType = 'boolean';
    storeValue = value ? 'true' : 'false';
  } else if (typeof value === 'number') {
    settingType = 'number';
    storeValue = String(value);
  } else if (typeof value === 'object' && value !== null) {
    settingType = 'json';
    storeValue = JSON.stringify(value);
  } else {
    storeValue = value == null ? '' : String(value);
  }

  if (isSensitiveSettingKey(key) && storeValue && !String(storeValue).includes('********')) {
    storeValue = encryptSecret(storeValue);
    isEncrypted = 1;
  }

  await query(
    `INSERT INTO company_settings (company_id, setting_key, setting_value, setting_type, description, is_encrypted)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       setting_type = VALUES(setting_type),
       description = COALESCE(VALUES(description), description),
       is_encrypted = VALUES(is_encrypted)`,
    [companyId, key, storeValue, settingType, description, isEncrypted]
  );
}

export async function getIntegrationSettingsForCompany(companyId, prefix = '') {
  const rows = await query(
    `SELECT setting_key, setting_value, setting_type, is_encrypted
     FROM company_settings
     WHERE company_id = ? AND setting_key LIKE ?`,
    [companyId, `${prefix}%`]
  );
  const out = {};
  for (const row of rows) {
    let value = row.setting_value;
    if (row.is_encrypted || isEncryptedValue(value)) {
      value = decryptSecret(value);
    }
    if (row.setting_type === 'boolean') value = value === 'true';
    else if (row.setting_type === 'number') value = Number(value);
    else if (row.setting_type === 'json') {
      try { value = JSON.parse(value); } catch { /* keep string */ }
    }
    out[row.setting_key] = value;
  }
  return out;
}

export async function seedDefaultCompanySettings(companyId, extras = {}) {
  const defaults = {
    is_open: { value: 'true', type: 'boolean' },
    notification_sound: { value: 'true', type: 'boolean' },
    auto_accept_orders: { value: 'false', type: 'boolean' },
    print_auto: { value: 'false', type: 'boolean' },
    print_bridge_enabled: { value: 'true', type: 'boolean' },
    delivery_fee: { value: '3.50', type: 'number' },
    minimum_order: { value: '15.00', type: 'number' },
    onboarding_complete: { value: 'false', type: 'boolean' },
    ...extras
  };
  for (const [key, meta] of Object.entries(defaults)) {
    await upsertCompanySetting(companyId, key, meta.value, meta.type);
  }
}
