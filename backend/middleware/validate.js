/**
 * Validation Middleware using express-validator
 */

import { validationResult, body, param, query as queryValidator } from 'express-validator';
import { AppError } from './errorHandler.js';

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
    .isEmail().withMessage('Ongeldig e-mailadres'),
  
  body('customer_phone')
    .trim()
    .notEmpty().withMessage('Telefoonnummer is verplicht')
    .matches(/^[+]?[\d\s-]{9,20}$/).withMessage('Ongeldig telefoonnummer'),
  
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
