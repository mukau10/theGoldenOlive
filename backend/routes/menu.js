/**
 * Public + shared menu routes for website menukaart
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const MENU_JSON_PATH = path.join(__dirname, '../../public/data/menu.json');
export const MENU_DIST_PATH = path.join(__dirname, '../../dist/data/menu.json');

export function readWebsiteMenu() {
  if (!fs.existsSync(MENU_JSON_PATH)) {
    throw new AppError('Menukaart bestand niet gevonden', 404);
  }
  const raw = fs.readFileSync(MENU_JSON_PATH, 'utf8');
  return JSON.parse(raw);
}

export function writeWebsiteMenu(menuData) {
  if (!menuData || typeof menuData !== 'object' || Array.isArray(menuData)) {
    throw new AppError('Ongeldige menukaart data', 400);
  }

  const json = JSON.stringify(menuData, null, 2);
  fs.writeFileSync(MENU_JSON_PATH, json, 'utf8');

  // Keep built dist copy in sync when present (production static hosting)
  try {
    const distDir = path.dirname(MENU_DIST_PATH);
    if (fs.existsSync(distDir)) {
      fs.writeFileSync(MENU_DIST_PATH, json, 'utf8');
    }
  } catch {
    // non-fatal
  }

  return menuData;
}

/**
 * GET /api/menu
 * Public website menukaart
 */
router.get('/', (req, res, next) => {
  try {
    const menu = readWebsiteMenu();
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: menu });
  } catch (error) {
    next(error);
  }
});

export default router;
