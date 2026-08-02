/**
 * Platform integration readiness / certification gates
 */

import { getIntegrationSettingsForCompany } from '../../utils/companySettings.js';

const PLATFORMS = {
  uber_eats: {
    label: 'Uber Eats',
    required: ['uber_eats_webhook_secret', 'uber_eats_store_id', 'uber_eats_client_id', 'uber_eats_client_secret'],
    enabledKey: 'uber_eats_enabled'
  },
  takeaway: {
    label: 'Takeaway.com',
    required: ['takeaway_webhook_secret', 'takeaway_api_key', 'takeaway_restaurant_id'],
    enabledKey: 'takeaway_enabled'
  },
  deliveroo: {
    label: 'Deliveroo',
    required: ['deliveroo_webhook_secret', 'deliveroo_client_id', 'deliveroo_client_secret', 'deliveroo_site_id'],
    enabledKey: 'deliveroo_enabled'
  }
};

function present(value) {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  return String(value).trim().length > 0 && !String(value).includes('********');
}

export async function getPlatformReadiness(companyId) {
    const results = [];
    for (const [key, cfg] of Object.entries(PLATFORMS)) {
      const all = await getIntegrationSettingsForCompany(companyId, '');
      const enabled = all[cfg.enabledKey] === true || all[cfg.enabledKey] === 'true';
      const missing = cfg.required.filter((k) => !present(all[k]));
      const ready = !enabled || missing.length === 0;
      results.push({
        platform: key,
        label: cfg.label,
        enabled,
        ready,
        missing,
        status: !enabled ? 'disabled' : ready ? 'ready' : 'incomplete'
      });
    }
    return results;
}

export async function assertPlatformReadyOrThrow(companyId, platformKey) {
  const list = await getPlatformReadiness(companyId);
  const item = list.find((p) => p.platform === platformKey);
  if (!item) return;
  if (item.enabled && !item.ready) {
    const err = new Error(`${item.label} is enabled maar mist: ${item.missing.join(', ')}`);
    err.statusCode = 401;
    throw err;
  }
}

export { PLATFORMS as READINESS_PLATFORMS };
