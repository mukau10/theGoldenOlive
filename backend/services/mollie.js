/**
 * Mollie Payment Service
 * Handles all Mollie API interactions
 *
 * API key resolution order:
 * 1. Explicit apiKey argument
 * 2. company_settings.mollie_api_key for companyId (encrypted-at-rest)
 * 3. process.env.MOLLIE_API_KEY
 */

import { createMollieClient } from '@mollie/api-client';
import { query } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import dotenv from 'dotenv';

dotenv.config();

const clientCache = new Map();

function isUsableApiKey(apiKey) {
  return Boolean(apiKey) && !String(apiKey).includes('xxxx') && String(apiKey).length >= 30;
}

async function resolveApiKey(companyId = null, explicitKey = null) {
  if (isUsableApiKey(explicitKey)) return String(explicitKey);

  if (companyId) {
    try {
      const { getCompanySetting } = await import('../utils/companySettings.js');
      const tenantKey = await getCompanySetting(companyId, 'mollie_api_key', null);
      if (isUsableApiKey(tenantKey)) return String(tenantKey);
    } catch {
      // fall through to env
    }
  }

  const envKey = process.env.MOLLIE_API_KEY;
  if (isUsableApiKey(envKey)) return String(envKey);
  return null;
}

const getMollieClient = async (companyId = null, explicitKey = null) => {
  const apiKey = await resolveApiKey(companyId, explicitKey);
  if (!apiKey) {
    console.warn('⚠️ MOLLIE_API_KEY not configured - payments will be simulated');
    return null;
  }

  const cacheKey = `${companyId || 'env'}:${apiKey.slice(-8)}`;
  if (clientCache.has(cacheKey)) return clientCache.get(cacheKey);

  try {
    const client = createMollieClient({ apiKey });
    clientCache.set(cacheKey, client);
    return client;
  } catch (error) {
    console.warn('⚠️ Failed to create Mollie client - payments will be simulated');
    return null;
  }
};

/**
 * Create a new Mollie payment
 */
export const createPayment = async ({
  orderId,
  orderNumber,
  amount,
  description,
  customerEmail,
  customerName,
  companyId = null
}) => {
  const client = await getMollieClient(companyId);

  // If no Mollie client (test mode), simulate payment
  if (!client) {
    console.log('[Mollie] Simulating payment for order:', orderNumber);

    const fakePaymentId = `tr_test_${Date.now()}`;

    await query(
      'UPDATE payments SET mollie_payment_id = ? WHERE order_id = ?',
      [fakePaymentId, orderId]
    );

    return {
      id: fakePaymentId,
      checkoutUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order/simulate?order=${orderNumber}&payment=${fakePaymentId}`,
      status: 'open'
    };
  }

  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${baseUrl}/order/success?order=${orderNumber}`;
    const webhookUrl = process.env.MOLLIE_WEBHOOK_URL || `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payments/webhook`;

    const payment = await client.payments.create({
      amount: {
        currency: 'EUR',
        value: amount.toFixed(2)
      },
      description: description || `Order ${orderNumber}`,
      redirectUrl,
      webhookUrl,
      metadata: {
        orderId: String(orderId),
        orderNumber,
        companyId: companyId != null ? String(companyId) : undefined
      },
      ...(customerEmail ? { billingEmail: customerEmail } : {})
    });

    await query(
      'UPDATE payments SET mollie_payment_id = ? WHERE order_id = ?',
      [payment.id, orderId]
    );

    return {
      id: payment.id,
      checkoutUrl: payment.getCheckoutUrl(),
      status: payment.status
    };
  } catch (error) {
    console.error('[Mollie] Error creating payment:', error);
    throw new AppError('Fout bij het aanmaken van de betaling: ' + error.message, 500);
  }
};

/**
 * Get payment details from Mollie
 */
export const getPayment = async (paymentId, companyId = null) => {
  const client = await getMollieClient(companyId);

  if (!client) {
    return {
      id: paymentId,
      status: 'paid',
      method: 'ideal',
      paidAt: new Date().toISOString()
    };
  }

  try {
    const payment = await client.payments.get(paymentId);

    return {
      id: payment.id,
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      description: payment.description,
      paidAt: payment.paidAt,
      metadata: payment.metadata
    };
  } catch (error) {
    console.error('[Mollie] Error getting payment:', error);
    return null;
  }
};

/**
 * Get available payment methods
 */
export const getPaymentMethods = async (companyId = null) => {
  const client = await getMollieClient(companyId);

  if (!client) {
    return [
      { id: 'ideal', description: 'iDEAL' },
      { id: 'bancontact', description: 'Bancontact' },
      { id: 'creditcard', description: 'Credit card' }
    ];
  }

  try {
    const methods = await client.methods.all();
    return methods.map(m => ({
      id: m.id,
      description: m.description,
      image: m.image
    }));
  } catch (error) {
    console.error('[Mollie] Error getting methods:', error);
    return [];
  }
};

/**
 * Create refund for payment
 */
export const createRefund = async (paymentId, amount = null, companyId = null) => {
  const client = await getMollieClient(companyId);

  if (!client) {
    console.log('[Mollie] Simulating refund for payment:', paymentId);
    return { id: `rf_test_${Date.now()}`, status: 'pending' };
  }

  try {
    const refundParams = { paymentId };

    if (amount) {
      refundParams.amount = {
        currency: 'EUR',
        value: amount.toFixed(2)
      };
    }

    const refund = await client.paymentRefunds.create(refundParams);

    return {
      id: refund.id,
      status: refund.status,
      amount: refund.amount
    };
  } catch (error) {
    console.error('[Mollie] Error creating refund:', error);
    throw new AppError('Fout bij het aanmaken van de terugbetaling: ' + error.message, 500);
  }
};

/** @deprecated sync export kept for compatibility; prefer getMollieClient() */
export const mollieClient = null;
