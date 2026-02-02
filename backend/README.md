# The Golden Olive - Delivery & Order System

Een volledig functionerend delivery/bestelsysteem voor The Golden Olive restaurant, gebouwd met Node.js, Express, MySQL en Mollie Payments.

## 🏗️ Architectuur

```
backend/
├── config/           # Database configuratie
│   └── database.js   # MySQL connection pool
├── controllers/      # (Routes bevatten controller logic)
├── middleware/       # Auth, validation, error handling
│   ├── auth.js       # JWT authenticatie
│   ├── errorHandler.js
│   ├── notFound.js
│   └── validate.js   # Input validatie
├── migrations/       # Database schema & seeding
│   ├── 001_initial_schema.sql
│   ├── run.js        # Migration runner
│   └── seed.js       # Data seeder
├── routes/           # API endpoints
│   ├── admin.js      # Admin dashboard
│   ├── auth.js       # Login/auth
│   ├── categories.js # Categorieën CRUD
│   ├── orders.js     # Bestellingen
│   ├── payments.js   # Mollie webhooks
│   └── products.js   # Producten CRUD
├── services/         # Business logic
│   └── mollie.js     # Mollie integratie
├── public/admin/     # Admin panel (static)
├── .env              # Environment variables
├── package.json
└── server.js         # Entry point
```

## 🚀 Installatie

### Vereisten

- Node.js 18.x of hoger
- MySQL 8.x
- npm of yarn

### Stap 1: Dependencies installeren

```bash
cd backend
npm install
```

### Stap 2: Environment configureren

Maak een `.env` bestand aan (of pas de bestaande aan):

```env
# Server
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootroot
DB_NAME=thegoldenolive

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Mollie
MOLLIE_API_KEY=test_xxxxxxxxxxxxxxxxxxxxxx
MOLLIE_WEBHOOK_URL=https://yourdomain.com/api/payments/webhook

# Frontend
FRONTEND_URL=http://localhost:5173

# Admin
ADMIN_EMAIL=admin@thegoldenolive.be
ADMIN_PASSWORD=admin123
```

### Stap 3: Database opzetten

```bash
# Maak database en tabellen aan
npm run migrate

# Importeer menu data en maak admin user
npm run seed
```

### Stap 4: Server starten

```bash
# Development (met auto-reload)
npm run dev

# Production
npm start
```

De server draait nu op `http://localhost:3001`

## 📚 API Endpoints

### Publieke Endpoints

| Method | Endpoint | Beschrijving |
|--------|----------|--------------|
| GET | `/api/products` | Alle producten |
| GET | `/api/products/grouped` | Producten per categorie |
| GET | `/api/products/:id` | Enkel product |
| GET | `/api/categories` | Alle categorieën |
| GET | `/api/categories/:id` | Categorie met producten |
| POST | `/api/orders` | Nieuwe bestelling |
| GET | `/api/orders/track/:orderNumber` | Bestelling volgen |
| GET | `/api/payments/:orderId/status` | Betalingsstatus |
| POST | `/api/payments/:orderId/retry` | Betaling opnieuw |
| POST | `/api/payments/webhook` | Mollie webhook |

### Admin Endpoints (authenticatie vereist)

| Method | Endpoint | Beschrijving |
|--------|----------|--------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/auth/me` | Huidige gebruiker |
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET | `/api/admin/settings` | Instellingen |
| PUT | `/api/admin/settings/:key` | Instelling wijzigen |
| GET | `/api/orders` | Alle bestellingen |
| GET | `/api/orders/:id` | Bestelling details |
| PATCH | `/api/orders/:id/status` | Status wijzigen |
| POST | `/api/products` | Product toevoegen |
| PUT | `/api/products/:id` | Product bewerken |
| DELETE | `/api/products/:id` | Product verwijderen |
| POST | `/api/categories` | Categorie toevoegen |
| PUT | `/api/categories/:id` | Categorie bewerken |
| DELETE | `/api/categories/:id` | Categorie verwijderen |

## 💳 Mollie Integratie

### Test Mode

De applicatie werkt in test mode wanneer geen geldige Mollie API key is geconfigureerd. In dit geval worden betalingen gesimuleerd.

### Live Mode

1. Maak een Mollie account aan op https://mollie.com
2. Kopieer je Live API key
3. Update `.env` met je key: `MOLLIE_API_KEY=live_xxxxx`
4. Configureer je webhook URL in het Mollie dashboard

### Webhook Setup

De webhook URL moet publiek bereikbaar zijn. Voor lokale ontwikkeling kun je tools als ngrok gebruiken:

```bash
ngrok http 3001
```

Update dan `MOLLIE_WEBHOOK_URL` in je `.env`.

### Ondersteunde Betaalmethoden

- iDEAL
- Bancontact
- Credit Card (Visa, MasterCard)
- PayPal
- Apple Pay
- Google Pay

## 🔒 Beveiliging

### Geïmplementeerde Beveiligingen

- **SQL Injection**: Parameterized queries via mysql2
- **XSS**: Input sanitization, helmet headers
- **CSRF**: CORS configuratie, SameSite cookies
- **Rate Limiting**: 100 requests per 15 minuten
- **JWT**: Secure token-based authenticatie
- **Password Hashing**: bcryptjs met salt rounds

### Production Checklist

- [ ] Verander `JWT_SECRET` naar een lange, random string
- [ ] Verander admin wachtwoord na eerste login
- [ ] Configureer HTTPS
- [ ] Beperk CORS origins
- [ ] Enable MySQL SSL
- [ ] Gebruik environment variables (niet hardcoded)

## 🖥️ Admin Panel

Toegang via: `http://localhost:3001/admin`

### Features

- **Dashboard**: Omzet, bestellingen, statistieken
- **Bestellingen**: Overzicht, status beheer
- **Producten**: CRUD operaties
- **Categorieën**: Beheer categorieën
- **Instellingen**: Bezorgkosten, openingstijden

### Default Login

- Email: `admin@thegoldenolive.be`
- Wachtwoord: `admin123`

⚠️ **Verander dit wachtwoord na eerste login!**

## 🧪 Testen

### API Testen met cURL

```bash
# Health check
curl http://localhost:3001/api/health

# Producten ophalen
curl http://localhost:3001/api/products

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@thegoldenolive.be","password":"admin123"}'

# Bestelling plaatsen
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test User",
    "customer_email": "test@test.com",
    "customer_phone": "+32123456789",
    "delivery_type": "pickup",
    "items": [
      {"product_id": 1, "quantity": 2}
    ]
  }'
```

### Postman Collection

Import de volgende endpoints in Postman voor eenvoudig testen.

## 📊 Database Schema

### Tabellen

- **users**: Admin gebruikers
- **categories**: Menu categorieën
- **products**: Menu items
- **addresses**: Bezorgadressen
- **orders**: Bestellingen
- **order_items**: Bestelde producten
- **payments**: Betalingen (Mollie)
- **settings**: Systeeminstellingen

### ER Diagram

```
users (1) ─────────────────────────
                                  
categories (1) ──── (N) products  
                                  
orders (1) ──── (N) order_items ──── (N) products
   │                              
   └──── (1) addresses            
   │                              
   └──── (1) payments             
```

## 🔧 Troubleshooting

### Database Connection Failed

```
✗ Database connection failed: Access denied
```

**Oplossing**: Controleer DB_USER, DB_PASSWORD en DB_NAME in `.env`

### Mollie Payment Error

```
Error creating payment: Invalid API key
```

**Oplossing**: Controleer MOLLIE_API_KEY, gebruik test key voor development

### Port Already in Use

```
Error: listen EADDRINUSE :::3001
```

**Oplossing**: Stop andere processen op port 3001 of verander PORT in `.env`

## 📝 Licentie

MIT License - The Golden Olive
