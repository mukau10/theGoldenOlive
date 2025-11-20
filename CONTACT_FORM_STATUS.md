# Contactformulier Status Rapport

**Datum:** $(date)  
**Project:** The Golden Olive

## Samenvatting

Het contactformulier werkt **momenteel NIET** omdat de Node.js email API server niet is geconfigureerd en niet draait.

## Belangrijke Bevindingen

### ✅ Wat werkt:
- React contactformulier component (`ContactForm.tsx`) is correct geïmplementeerd
- Node.js Express server code is aanwezig en correct geschreven
- Server dependencies zijn geïnstalleerd (nodemailer, express, cors, etc.)

### ❌ Wat niet werkt:
1. **Server dependencies zijn NIET geïnstalleerd**
   - `node_modules` ontbreekt in `react-app/server/`
   - Alle dependencies zijn "UNMET DEPENDENCY"
   - Server kan niet starten zonder dependencies

2. **Email API server draait NIET**
   - Geen server proces actief op poort 3001 voor dit project
   - Poort 3001 wordt gebruikt door een ander project (popmateVite)

3. **Geen .env configuratie**
   - Geen `.env` bestand in `react-app/server/`
   - Email credentials (SMTP) zijn niet geconfigureerd
   - Server kan geen emails verzenden zonder configuratie

4. **Frontend .env ontbreekt**
   - Geen `VITE_API_URL` configuratie in React app
   - Frontend gebruikt default `http://localhost:3001`

## PHP Configuratie Status

### Vendor Folder Analyse

De `vendor/` folder bevat **oude PHP dependencies** die niet meer gebruikt worden:

- ✅ **PHPMailer v6.9.1** - Niet meer nodig (vervangen door Nodemailer)
- ✅ **Composer** - PHP dependency manager (niet meer nodig)
- ✅ **Symfony polyfills** - PHP libraries (niet meer nodig)
- ✅ **Graham Campbell Result-Type** - PHP library (niet meer nodig)

**Conclusie:** De vendor folder kan worden verwijderd omdat het project is gemigreerd naar Node.js/React.

### Geen PHP Contact Form Files

Er zijn geen actieve PHP contactformulier bestanden gevonden. Het project gebruikt nu:
- **Node.js Express API** (`react-app/server/index.js`)
- **Nodemailer** (Node.js equivalent van PHPMailer)

## Wat moet er gebeuren?

### 1. Server Dependencies Installeren

```bash
cd react-app/server
npm install
```

Dit installeert:
- express (web server)
- nodemailer (email sending)
- cors (cross-origin requests)
- dotenv (environment variables)
- express-rate-limit (anti-spam protection)

### 2. Email Server Configureren

```bash
cd react-app/server
cp .env.example .env
```

Bewerk `.env` met je email instellingen:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
CONTACT_EMAIL=info@the-goldenolive.be
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Gmail App Password Instellen

Voor Gmail:
1. Ga naar: https://myaccount.google.com/security
2. Schakel 2-Stap Verificatie in
3. Genereer App Password: https://myaccount.google.com/apppasswords
4. Gebruik dit 16-karakter wachtwoord in `SMTP_PASS`

### 4. Server Starten

```bash
cd react-app/server
npm run dev  # Development mode (met auto-reload)
# of
npm start    # Production mode
```

### 5. Frontend Configureren (optioneel)

Als de API op een andere URL draait, voeg toe aan `react-app/.env`:

```env
VITE_API_URL=http://localhost:3001
```

### 6. Testen

Test het contactformulier:
1. Start de React app: `cd react-app && npm run dev`
2. Start de API server: `cd react-app/server && npm run dev`
3. Vul het contactformulier in op de website
4. Controleer of de email wordt verzonden

## API Endpoints

### POST `/api/contact`
Contactformulier verzenden

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+32 123 45 67 89",
  "subject": "Reservering",
  "message": "Hello..."
}
```

### POST `/api/reservation`
Reservering/evenement aanvraag

### GET `/health`
Health check endpoint

## Aanbevelingen

1. **Verwijder vendor folder** - Niet meer nodig na migratie naar Node.js
2. **Voeg .env toe aan .gitignore** - Beveilig email credentials
3. **Documenteer productie configuratie** - Voor deployment
4. **Test email functionaliteit** - Na configuratie

## Troubleshooting

### "Kon geen verbinding maken met de server"
- Controleer of de API server draait op poort 3001
- Controleer `VITE_API_URL` in frontend .env
- Controleer firewall instellingen

### "Authentication failed"
- Voor Gmail: Gebruik App Password, niet je normale wachtwoord
- Controleer of 2FA is ingeschakeld
- Verifieer credentials in `.env`

### "Connection timeout"
- Controleer SMTP poort (587 of 465)
- Controleer firewall instellingen
- Probeer een andere SMTP host

## Conclusie

Het contactformulier is technisch correct geïmplementeerd, maar werkt niet omdat:
1. **Server dependencies zijn niet geïnstalleerd** - `npm install` moet worden uitgevoerd
2. De email API server niet is geconfigureerd (geen .env)
3. De email API server niet draait
4. Email credentials ontbreken

**Stappen om te fixen:**
1. `cd react-app/server && npm install` - Installeer dependencies
2. `cp .env.example .env` - Maak .env bestand
3. Configureer email credentials in `.env`
4. `npm run dev` - Start de server
5. Test het contactformulier

Na deze stappen zou het contactformulier moeten werken.

