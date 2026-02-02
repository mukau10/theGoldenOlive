/**
 * Validation Middleware using express-validator
 */

import { validationResult, body, param, query as queryValidator } from 'express-validator';
import { AppError } from './errorHandler.js';
import dns from 'dns/promises';
import { verifyMathChallenge } from '../utils/antibot.js';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'trashmail.com',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'temp-mail.org',
  'minuteinbox.com',
]);

const withTimeout = (p, ms) =>
  Promise.race([
    p,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

async function hasMailDns(domain) {
  // Best-effort: accept on DNS timeout to avoid blocking real customers.
  try {
    const mx = await withTimeout(dns.resolveMx(domain), 1200);
    if (Array.isArray(mx) && mx.length > 0) return true;
  } catch (e) {
    if (e?.code && ['ENOTFOUND', 'ENODATA', 'EINVAL'].includes(e.code)) return false;
    if (String(e?.message || '').includes('timeout')) return true;
  }

  try {
    const a = await withTimeout(dns.resolve4(domain), 1200);
    if (Array.isArray(a) && a.length > 0) return true;
  } catch (e) {
    if (e?.code && ['ENOTFOUND', 'ENODATA', 'EINVAL'].includes(e.code)) return false;
    if (String(e?.message || '').includes('timeout')) return true;
  }

  try {
    const aaaa = await withTimeout(dns.resolve6(domain), 1200);
    if (Array.isArray(aaaa) && aaaa.length > 0) return true;
  } catch (e) {
    if (e?.code && ['ENOTFOUND', 'ENODATA', 'EINVAL'].includes(e.code)) return false;
    if (String(e?.message || '').includes('timeout')) return true;
  }

  return false;
}

function getEmailDomain(email) {
  const at = String(email || '').lastIndexOf('@');
  if (at <= 0) return null;
  return String(email).slice(at + 1).toLowerCase();
}

/**
 * Handle validation errors
 */
export const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    return next(new AppError(errorMessages, 400));
  }
  
  next();
};

/**
 * Order validation rules
 */
export const validateOrder = [
  body('customer_name')
    .trim()
    .notEmpty().withMessage('Naam is verplicht')
    .isLength({ min: 2, max: 100 }).withMessage('Naam moet tussen 2 en 100 tekens zijn'),
  
  body('customer_email')
    .trim()
    .notEmpty().withMessage('E-mail is verplicht')
    .isEmail({ allow_utf8_local_part: false }).withMessage('Ongeldig e-mailadres')
    .custom(async (value) => {
      const email = String(value || '').trim();
      if (email.length > 254) throw new Error('E-mail is te lang');
      const domain = getEmailDomain(email);
      if (!domain) throw new Error('Ongeldig e-mailadres');
      if (DISPOSABLE_DOMAINS.has(domain)) throw new Error('Tijdelijk e-mailadres is niet toegestaan');
      // Basic TLD sanity (avoid domains without a real TLD)
      const parts = domain.split('.');
      const tld = parts[parts.length - 1] || '';
      if (tld.length < 2) throw new Error('Ongeldig domein');
      // MX/A/AAAA best-effort validation
      const ok = await hasMailDns(domain);
      if (!ok) throw new Error('E-mail domein lijkt ongeldig (geen mailserver gevonden)');
      return true;
    }),
  
  body('customer_phone')
    .trim()
    .notEmpty().withMessage('Telefoonnummer is verplicht')
    .matches(/^[+]?[\d\s-]{9,20}$/).withMessage('Ongeldig telefoonnummer'),

  body('customer_vat_number')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('BTW-nummer mag max 50 tekens zijn'),
  
  body('delivery_type')
    .isIn(['delivery', 'pickup']).withMessage('Ongeldige bezorgtype'),
  
  body('address.street')
    .if(body('delivery_type').equals('delivery'))
    .trim()
    .notEmpty().withMessage('Straat is verplicht voor bezorging'),
  
  body('address.house_number')
    .if(body('delivery_type').equals('delivery'))
    .trim()
    .notEmpty().withMessage('Huisnummer is verplicht voor bezorging'),
  
  body('address.postal_code')
    .if(body('delivery_type').equals('delivery'))
    .trim()
    .notEmpty().withMessage('Postcode is verplicht voor bezorging'),
  
  body('address.city')
    .if(body('delivery_type').equals('delivery'))
    .trim()
    .notEmpty().withMessage('Stad is verplicht voor bezorging'),
  
  body('items')
    .isArray({ min: 1 }).withMessage('Minimaal 1 product vereist'),
  
  body('items.*.product_id')
    .notEmpty().withMessage('Product ID is verplicht'),
  
  body('items.*.quantity')
    .isInt({ min: 1, max: 50 }).withMessage('Hoeveelheid moet tussen 1 en 50 zijn'),

  // Anti-bot math challenge (required)
  body('antibot_token')
    .notEmpty().withMessage('Beveiligingscontrole ontbreekt')
    .bail(),
  body('antibot_answer')
    .notEmpty().withMessage('Beveiligingsantwoord ontbreekt')
    .bail()
    .isInt({ min: -1000, max: 1000 }).withMessage('Ongeldig beveiligingsantwoord')
    .bail()
    .custom((value, { req }) => {
      const token = req.body?.antibot_token;
      const result = verifyMathChallenge(token, value);
      if (!result.ok) {
        if (result.reason === 'expired') throw new Error('Beveiligingscontrole verlopen, probeer opnieuw');
        throw new Error('Beveiligingscontrole mislukt');
      }
      return true;
    }),
  
  handleValidation
];

/**
 * Product validation rules
 */
export const validateProduct = [
  body('name')
    .trim()
    .notEmpty().withMessage('Productnaam is verplicht')
    .isLength({ min: 2, max: 100 }).withMessage('Naam moet tussen 2 en 100 tekens zijn'),
  
  body('price')
    .isFloat({ min: 0 }).withMessage('Prijs moet een positief getal zijn'),
  
  body('category_id')
    .isInt({ min: 1 }).withMessage('Categorie ID is verplicht'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Beschrijving mag max 1000 tekens zijn'),
  
  handleValidation
];

/**
 * Login validation rules
 */
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('E-mail is verplicht')
    .isEmail().withMessage('Ongeldig e-mailadres'),
  
  body('password')
    .notEmpty().withMessage('Wachtwoord is verplicht'),
  
  handleValidation
];

/**
 * ID parameter validation
 */
export const validateId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Ongeldige ID'),
  
  handleValidation
];
