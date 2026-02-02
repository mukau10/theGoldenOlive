/**
 * Payments Routes - Mollie Integration
 */

import express from 'express';
import { query } from '../config/database.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { getPayment, mollieClient } from '../services/mollie.js';

const router = express.Router();

/**
 * POST /api/payments/webhook
 * Mollie webhook - called when payment status changes
 */
router.post('/webhook', async (req, res, next) => {
  try {
    const { id: molliePaymentId } = req.body;

    if (!molliePaymentId) {
      console.log('[Webhook] No payment ID received');
      return res.status(200).send('OK');
    }

    console.log(`[Webhook] Received webhook for payment: ${molliePaymentId}`);

    // Get payment from Mollie
    const molliePayment = await getPayment(molliePaymentId);
    
    if (!molliePayment) {
      console.log(`[Webhook] Payment not found in Mollie: ${molliePaymentId}`);
      return res.status(200).send('OK');
    }

    console.log(`[Webhook] Mollie payment status: ${molliePayment.status}`);

    // Find our payment record
    const payments = await query(
      'SELECT p.*, o.id as order_id FROM payments p JOIN orders o ON p.order_id = o.id WHERE p.mollie_payment_id = ?',
      [molliePaymentId]
    );

    if (payments.length === 0) {
      console.log(`[Webhook] Payment not found in database: ${molliePaymentId}`);
      return res.status(200).send('OK');
    }

    const payment = payments[0];

    // Map Mollie status to our status
    let newStatus = molliePayment.status;
    let orderStatus = null;

    switch (molliePayment.status) {
      case 'paid':
        newStatus = 'paid';
        orderStatus = 'paid';
        break;
      case 'pending':
        newStatus = 'pending';
        break;
      case 'open':
        newStatus = 'open';
        break;
      case 'canceled':
        newStatus = 'canceled';
        orderStatus = 'cancelled';
        break;
      case 'expired':
        newStatus = 'expired';
        orderStatus = 'cancelled';
        break;
      case 'failed':
        newStatus = 'failed';
        orderStatus = 'cancelled';
        break;
    }

    // Update payment
    await query(`
      UPDATE payments SET 
        status = ?,
        method = ?,
        paid_at = ?,
        metadata = ?
      WHERE id = ?
    `, [
      newStatus,
      molliePayment.method || null,
      molliePayment.paidAt || null,
      JSON.stringify({
        mollieStatus: molliePayment.status,
        amount: molliePayment.amount,
        description: molliePayment.description
      }),
      payment.id
    ]);

    // Update order status if needed
    if (orderStatus) {
      await query('UPDATE orders SET status = ? WHERE id = ?', [orderStatus, payment.order_id]);
    }

    console.log(`[Webhook] Updated payment ${payment.id} to status: ${newStatus}`);

    res.status(200).send('OK');
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    // Always return 200 to Mollie to prevent retries
    res.status(200).send('OK');
  }
});

/**
 * GET /api/payments/:orderId/status
 * Get payment status for order (public)
 */
router.get('/:orderId/status', async (req, res, next) => {
  try {
    const payments = await query(`
      SELECT p.status, p.method, p.paid_at, o.order_number, o.status as order_status
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE o.id = ? OR o.order_number = ?
    `, [req.params.orderId, req.params.orderId]);

    if (payments.length === 0) {
      throw new AppError('Betaling niet gevonden', 404);
    }

    res.json({
      success: true,
      data: payments[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/:orderId/retry
 * Create new payment for failed/expired order
 */
router.post('/:orderId/retry', async (req, res, next) => {
  try {
    const orders = await query(`
      SELECT o.*, p.status as payment_status
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.id = ? OR o.order_number = ?
    `, [req.params.orderId, req.params.orderId]);

    if (orders.length === 0) {
      throw new AppError('Bestelling niet gevonden', 404);
    }

    const order = orders[0];

    // Check if retry is allowed
    const retryableStatuses = ['failed', 'canceled', 'expired'];
    if (!retryableStatuses.includes(order.payment_status)) {
      throw new AppError('Betaling kan niet opnieuw worden gestart', 400);
    }

    // Import createPayment
    const { createPayment } = await import('../services/mollie.js');

    // Create new Mollie payment
    const payment = await createPayment({
      orderId: order.id,
      orderNumber: order.order_number,
      amount: order.total,
      description: `The Golden Olive - Bestelling ${order.order_number}`,
      customerEmail: order.customer_email,
      customerName: order.customer_name
    });

    res.json({
      success: true,
      data: {
        payment_url: payment.checkoutUrl
      },
      message: 'Nieuwe betaling aangemaakt'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments (Admin only)
 * Get all payments
 */
router.get('/', authenticate, isAdmin, async (req, res, next) => {
  try {
    const payments = await query(`
      SELECT p.*, o.order_number, o.customer_name, o.customer_email
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      ORDER BY p.created_at DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    next(error);
  }
});

export default router;
