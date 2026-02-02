/**
 * Mollie Payment Service
 * Handles all Mollie API interactions
 */

import { createMollieClient } from '@mollie/api-client';
import { query } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Mollie client
let mollieClient = null;

const getMollieClient = () => {
  if (!mollieClient) {
    const apiKey = process.env.MOLLIE_API_KEY;
    
    // Check if API key is missing, empty, or a placeholder
    if (!apiKey || apiKey.includes('xxxx') || apiKey.length < 30) {
      console.warn('⚠️ MOLLIE_API_KEY not configured - payments will be simulated');
      return null;
    }
    
    try {
      mollieClient = createMollieClient({ apiKey });
    } catch (error) {
      console.warn('⚠️ Failed to create Mollie client - payments will be simulated');
      return null;
    }
  }
  return mollieClient;
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
  customerName
}) => {
  const client = getMollieClient();
  
  // If no Mollie client (test mode), simulate payment
  if (!client) {
    console.log('[Mollie] Simulating payment for order:', orderNumber);
    
    const fakePaymentId = `tr_test_${Date.now()}`;
    
    // Update payment record with fake ID
    await query(
      'UPDATE payments SET mollie_payment_id = ? WHERE order_id = ?',
      [fakePaymentId, orderId]
    );
    
    // Return simulated response
    return {
      id: fakePaymentId,
      checkoutUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order/simulate?order=${orderNumber}&payment=${fakePaymentId}`,
      status: 'open'
    };
  }

  try {
    // Determine redirect URLs
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${baseUrl}/order/success?order=${orderNumber}`;
    const webhookUrl = process.env.MOLLIE_WEBHOOK_URL || `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payments/webhook`;

    // Create payment
    const payment = await client.payments.create({
      amount: {
        currency: 'EUR',
        value: amount.toFixed(2)
      },
      description,
      redirectUrl,
      webhookUrl,
      metadata: {
        order_id: orderId,
        order_number: orderNumber
      },
      // Enable common payment methods in Belgium
      method: ['ideal', 'bancontact', 'creditcard', 'paypal', 'applepay', 'googlepay']
    });

    console.log('[Mollie] Payment created:', payment.id);

    // Update payment record with Mollie ID
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
export const getPayment = async (paymentId) => {
  const client = getMollieClient();
  
  if (!client) {
    // Simulate payment status
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
export const getPaymentMethods = async () => {
  const client = getMollieClient();
  
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
export const createRefund = async (paymentId, amount = null) => {
  const client = getMollieClient();
  
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

export { mollieClient };
