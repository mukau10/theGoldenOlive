/**
 * Payments Routes - Mollie Integration
 */

import express from 'express';
import { query } from '../config/database.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { getPayment } from '../services/mollie.js';
import { attachTenant, companyIdFrom, getPublicCompanyId } from '../middleware/tenant.js';
import { getCompanySetting } from '../utils/companySettings.js';

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

    // Resolve tenant from our DB first (needed for per-tenant Mollie key)
    const payments = await query(
      'SELECT p.*, o.id as order_id, o.company_id FROM payments p JOIN orders o ON p.order_id = o.id WHERE p.mollie_payment_id = ?',
      [molliePaymentId]
    );

    if (payments.length === 0) {
      console.log(`[Webhook] Payment not found in database: ${molliePaymentId}`);
      return res.status(200).send('OK');
    }

    const payment = payments[0];
    const orderCompanyId = Number(payment.company_id || getPublicCompanyId());

    const molliePayment = await getPayment(molliePaymentId, orderCompanyId);

    if (!molliePayment) {
      console.log(`[Webhook] Payment not found in Mollie: ${molliePaymentId}`);
      return res.status(200).send('OK');
    }

    console.log(`[Webhook] Mollie payment status: ${molliePayment.status}`);

    // Map Mollie status to our status
    let newStatus = molliePayment.status;
    let orderStatus = null;
    let autoAccept = false;

    // Read setting: auto_accept_orders (per-tenant)
    try {
      autoAccept = await getCompanySetting(orderCompanyId, 'auto_accept_orders', false);
      autoAccept =
        autoAccept === true ||
        autoAccept === 'true' ||
        autoAccept === 1 ||
        autoAccept === '1';
    } catch {
      autoAccept = false;
    }

    switch (molliePayment.status) {
      case 'paid':
        newStatus = 'paid';
        orderStatus = autoAccept ? 'preparing' : 'paid';
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
      WHERE id = ? AND company_id = ?
    `, [
      newStatus,
      molliePayment.method || null,
      molliePayment.paidAt || null,
      JSON.stringify({
        mollieStatus: molliePayment.status,
        amount: molliePayment.amount,
        description: molliePayment.description
      }),
      payment.id,
      orderCompanyId
    ]);

    // Update order status if needed
    if (orderStatus) {
      // Track history
      try {
        const [current] = await query(
          'SELECT status FROM orders WHERE id = ? AND company_id = ?',
          [payment.order_id, orderCompanyId]
        );
        const prevStatus = current?.status || null;
        await query(
          'UPDATE orders SET status = ? WHERE id = ? AND company_id = ?',
          [orderStatus, payment.order_id, orderCompanyId]
        );
        // Record status change (changed_by NULL = system)
        await query(
          'INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes) VALUES (?, ?, ?, NULL, ?)',
          [payment.order_id, prevStatus, orderStatus, autoAccept ? 'Auto-accept enabled' : 'Payment update']
        );
      } catch {
        // Fallback to status update only
        await query(
          'UPDATE orders SET status = ? WHERE id = ? AND company_id = ?',
          [orderStatus, payment.order_id, orderCompanyId]
        );
      }
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
    const publicCid = getPublicCompanyId();
    const payments = await query(`
      SELECT p.status, p.method, p.paid_at, o.order_number, o.status as order_status
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE o.company_id = ? AND (o.id = ? OR o.order_number = ?)
    `, [publicCid, req.params.orderId, req.params.orderId]);

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
    const publicCid = getPublicCompanyId();
    const orders = await query(`
      SELECT o.*, p.status as payment_status
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.company_id = ? AND (o.id = ? OR o.order_number = ?)
    `, [publicCid, req.params.orderId, req.params.orderId]);

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
      customerName: order.customer_name,
      companyId: publicCid
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
router.get('/', authenticate, attachTenant, isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const payments = await query(`
      SELECT p.*, o.order_number, o.customer_name, o.customer_email
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.company_id = ?
      ORDER BY p.created_at DESC
      LIMIT 100
    `, [cid]);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    next(error);
  }
});

export default router;
