import express from 'express';
import { createMathChallenge } from '../utils/antibot.js';

const router = express.Router();

/**
 * GET /api/antibot/challenge
 * Lightweight anti-bot challenge for ordering.
 */
router.get('/challenge', (req, res) => {
  const challenge = createMathChallenge({ ttlSeconds: 10 * 60 });
  res.json({ success: true, data: challenge });
});

export default router;

