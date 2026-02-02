# The Golden Olive - Admin Dashboard

Modern, veilig en overzichtelijk beheerpaneel voor het delivery/bestelsysteem.

## Features

### Dashboard
- **Real-time statistieken**: Orders vandaag, omzet, pending orders
- **Live updates**: Automatische polling elke 10 seconden
- **Notificaties**: Geluid bij nieuwe bestellingen
- **Status verdeling**: Visueel overzicht van order statussen
- **Populaire producten**: Top 10 best verkopende items

### Bestellingenbeheer
- Tabelweergave met filters (status, type, datum)
- Zoekfunctie (order nummer, klant, telefoon, email)
- Order detail modal met volledige informatie
- Status wijzigen met één klik
- Status geschiedenis tracking
- Print functionaliteit

### Productbeheer
- CRUD operaties voor alle producten
- Prijs en beschrijving bewerken
- Afbeelding URL instellen
- Beschikbaarheid toggle
- Categorie koppeling

### Categoriebeheer
- CRUD operaties
- Sortering (volgorde)
- Actief/inactief status

### Betalingen
- Overzicht alle Mollie betalingen
- Filter op status
- Payment ID zichtbaar
- Gekoppelde order informatie

### Instellingen
- Restaurant informatie
- Bezorgkosten & minimum bedrag
- BTW percentage
- Open/dicht toggle
- Notificatie geluid toggle

### Gebruikersbeheer
- Nieuwe gebruikers aanmaken
- Rollen toewijzen (admin/medewerker)
- Activiteitenlog bekijken

## Installatie

Het dashboard is automatisch beschikbaar na installatie van het backend systeem.

```bash
cd backend
npm install
npm run migrate
npm run seed
npm start
```

## Toegang

### URL
```
http://localhost:3001/admin
```

### Test Accounts

**Administrator** (volledige toegang):
- Email: `admin@thegoldenolive.be`
- Wachtwoord: `admin123`

**Medewerker** (beperkte toegang):
- Email: `staff@thegoldenolive.be`
- Wachtwoord: `staff123`

## Rollen & Permissies

### Administrator
Volledige toegang tot alle functies:
- Dashboard bekijken
- Orders beheren en status wijzigen
- Producten CRUD
- Categorieën CRUD
- Betalingen inzien
- Instellingen wijzigen
- Gebruikers beheren
- Logs bekijken

### Medewerker (Staff)
Beperkte toegang:
- Dashboard bekijken
- Orders bekijken en status wijzigen
- Producten bekijken (geen bewerken)

## API Endpoints

Alle admin endpoints vereisen authenticatie via JWT token.

### Dashboard
```
GET  /api/admin/dashboard        - Dashboard statistieken
GET  /api/admin/dashboard/live   - Live updates (polling)
```

### Orders
```
GET    /api/admin/orders              - Alle orders (met filters)
GET    /api/admin/orders/:id          - Order details
PATCH  /api/admin/orders/:id/status   - Status wijzigen
POST   /api/admin/orders/:id/print    - Mark as printed
```

### Products
```
GET     /api/admin/products          - Alle producten
POST    /api/admin/products          - Nieuw product
PUT     /api/admin/products/:id      - Product bewerken
DELETE  /api/admin/products/:id      - Product verwijderen
PATCH   /api/admin/products/:id/toggle - Beschikbaarheid toggle
```

### Categories
```
GET     /api/admin/categories        - Alle categorieën
POST    /api/admin/categories        - Nieuwe categorie
PUT     /api/admin/categories/:id    - Categorie bewerken
DELETE  /api/admin/categories/:id    - Categorie verwijderen
```

### Payments
```
GET  /api/admin/payments  - Alle betalingen
```

### Settings
```
GET  /api/admin/settings        - Alle instellingen
PUT  /api/admin/settings/:key   - Instelling wijzigen
```

### Users
```
GET   /api/admin/users  - Alle gebruikers
POST  /api/admin/users  - Nieuwe gebruiker
```

### Logs
```
GET  /api/admin/logs  - Activiteitenlog
```

## Database Tabellen

### order_status_history
Logt alle status wijzigingen:
- `order_id` - Gekoppelde order
- `previous_status` - Vorige status
- `new_status` - Nieuwe status
- `changed_by` - User ID die wijzigde
- `notes` - Optionele notities

### admin_logs
Audit trail voor admin acties:
- `user_id` - Wie deed de actie
- `action` - Actie type (create_product, update_order_status, etc.)
- `entity_type` - Type (order, product, category, etc.)
- `entity_id` - ID van betreffende entity
- `details` - JSON met extra details
- `ip_address` - IP adres
- `user_agent` - Browser info

### notifications
Admin notificaties:
- `type` - Type notificatie
- `title` - Titel
- `message` - Bericht
- `is_read` - Gelezen status

## Security

### Authenticatie
- JWT tokens met 24 uur geldigheid
- Secure password hashing (bcrypt, 12 rounds)
- Token refresh niet vereist binnen sessie

### Rate Limiting
- 100 requests per 15 minuten per IP
- Bescherming tegen brute force attacks

### Headers
- CORS configuratie
- Helmet security headers
- XSS bescherming

### Permissies
- Role-based access control
- Medewerkers kunnen geen admin functies uitvoeren
- Alle acties worden gelogd

## Live Updates

Het dashboard gebruikt polling voor live updates:
- Elke 10 seconden check voor nieuwe data
- Automatische notificatie bij nieuwe orders
- Optioneel geluidsignaal
- Visuele status indicator (groen = verbonden)

## Mobile Support

Het dashboard is volledig responsive:
- Sidebar toggle op mobiel
- Touch-friendly knoppen
- Tablet-vriendelijk voor keukengebruik
- Print-friendly order details

## Customization

### Styling
Alle stijlen in `/admin/css/dashboard.css`

CSS variabelen voor thema:
```css
:root {
  --primary: #d4a056;      /* Goud - primary color */
  --dark: #1a1a2e;         /* Donker achtergrond */
  --success: #10b981;      /* Groen - succes */
  --warning: #f59e0b;      /* Oranje - waarschuwing */
  --danger: #ef4444;       /* Rood - fout */
}
```

### JavaScript
Alle functionaliteit in `/admin/js/dashboard.js`

Configureerbare waarden:
```javascript
const API_BASE = '/api';  // API base URL
// Live update interval: 10000ms (10 seconden)
```

## Troubleshooting

### Login werkt niet
1. Check of backend draait: `npm start`
2. Check database verbinding
3. Voer seed opnieuw uit: `npm run seed`

### Geen orders zichtbaar
1. Check of er orders zijn aangemaakt
2. Check filters (datum, status)
3. Ververs de pagina

### Live updates stoppen
1. Check console voor fouten
2. Controleer netwerk verbinding
3. Herlaad de pagina

### Styling problemen
1. Clear browser cache
2. Check of CSS geladen is
3. Controleer Bootstrap CDN

## Support

Bij problemen:
1. Check de browser console (F12)
2. Check backend logs
3. Controleer database status
