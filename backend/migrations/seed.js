/**
 * Database Seeder
 * Imports menu data and creates admin user
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { query, pool } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to create slug from name
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Helper to parse price string to number
const parsePrice = (priceStr) => {
  if (typeof priceStr === 'number') return priceStr;
  return parseFloat(priceStr.replace('€', '').replace(',', '.').trim());
};

// Category name mapping
const categoryNames = {
  'voorgerechten': 'Voorgerechten',
  'mixed-bbq': 'Mix BBQ',
  'spareribs': 'Spareribs',
  'loaded-scoops': 'Loaded Scoops',
  'burgers': 'Burgers',
  'kindermenu': 'Kindermenu',
  'supplementen': 'Supplementen',
  'desserten': 'Desserten',
  'mocktails': 'Mocktails',
  'frisdranken': 'Frisdranken',
  'warme-dranken': 'Warme Dranken'
};

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // 0. Add missing columns (safe operation)
    console.log('Checking database schema...');
    try {
      await query('ALTER TABLE users ADD COLUMN permissions JSON DEFAULT NULL');
      console.log('  ✓ Added permissions column to users');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  - permissions column exists');
    }
    try {
      await query('ALTER TABLE orders ADD COLUMN print_count INT DEFAULT 0');
      console.log('  ✓ Added print_count column to orders');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  - print_count column exists');
    }
    try {
      await query('ALTER TABLE orders ADD COLUMN printed_at TIMESTAMP NULL');
      console.log('  ✓ Added printed_at column to orders');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  - printed_at column exists');
    }
    console.log('');

    // 1. Create admin user
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
    
    await query(`
      INSERT INTO users (email, password, name, role, permissions)
      VALUES (?, ?, 'Admin', 'admin', NULL)
      ON DUPLICATE KEY UPDATE password = VALUES(password)
    `, [process.env.ADMIN_EMAIL || 'admin@thegoldenolive.be', hashedPassword]);
    
    console.log('✓ Admin user created');

    // 1b. Create staff user
    console.log('Creating staff user...');
    const staffPassword = await bcrypt.hash('staff123', 12);
    
    await query(`
      INSERT INTO users (email, password, name, role, permissions)
      VALUES (?, ?, 'Medewerker', 'staff', '["view_orders", "update_order_status", "view_products"]')
      ON DUPLICATE KEY UPDATE email = email
    `, ['staff@thegoldenolive.be', staffPassword]);
    
    console.log('✓ Staff user created\n');

    // 2. Read menu.json
    console.log('Reading menu data...');
    const menuPath = path.join(__dirname, '../../public/data/menu.json');
    
    if (!fs.existsSync(menuPath)) {
      console.log('⚠ Menu file not found, skipping product import');
      return;
    }
    
    const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
    console.log('✓ Menu data loaded\n');

    // 3. Import categories and products
    console.log('Importing categories and products...');
    
    let categoryOrder = 0;
    let productCount = 0;

    for (const [categoryKey, products] of Object.entries(menuData)) {
      const categoryName = categoryNames[categoryKey] || categoryKey;
      const categorySlug = createSlug(categoryKey);
      
      // Insert or update category
      await query(`
        INSERT INTO categories (name, slug, sort_order)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order)
      `, [categoryName, categorySlug, categoryOrder++]);

      // Get category ID
      const [category] = await query('SELECT id FROM categories WHERE slug = ?', [categorySlug]);
      
      if (!category) {
        console.log(`⚠ Could not find category: ${categorySlug}`);
        continue;
      }

      // Import products
      let productOrder = 0;
      for (const product of products) {
        const productSlug = createSlug(product.id || product.name);
        const price = parsePrice(product.price);
        
        // Clean description (remove HTML)
        const description = product.description
          ? product.description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')
          : null;

        // Fix image URL
        let imageUrl = product.image || null;
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
          imageUrl = '/' + imageUrl.replace('assets/', '');
        }

        await query(`
          INSERT INTO products (category_id, name, slug, description, price, image_url, allergens, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            category_id = VALUES(category_id),
            name = VALUES(name),
            description = VALUES(description),
            price = VALUES(price),
            image_url = VALUES(image_url),
            allergens = VALUES(allergens),
            sort_order = VALUES(sort_order)
        `, [
          category.id,
          product.name,
          productSlug,
          description,
          price,
          imageUrl,
          JSON.stringify(product.allergens || []),
          productOrder++
        ]);

        productCount++;
      }

      console.log(`  ✓ ${categoryName}: ${products.length} products`);
    }

    console.log(`\n✅ Seeding completed! ${Object.keys(menuData).length} categories, ${productCount} products imported.\n`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
