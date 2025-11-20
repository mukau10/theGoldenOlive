# Server Setup Instructies

## ✅ Wat is al gedaan:

1. ✅ Dependencies zijn geïnstalleerd (`npm install`)
2. ✅ `.env` bestand is aangemaakt op basis van `.env.example`
3. ✅ Server code is gecontroleerd en werkt correct

## ⚠️ Wat je nog moet doen:

### 1. Email Credentials Invullen

Bewerk het `.env` bestand in `react-app/server/`:

```bash
cd react-app/server
nano .env  # of gebruik je favoriete editor
```

**Belangrijk:** Vervang de placeholder waarden:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=jouw-email@gmail.com          # ← Vervang dit
SMTP_PASS=jouw-app-password              # ← Vervang dit
CONTACT_EMAIL=info@the-goldenolive.be    # ← Email waar formulier naar wordt verzonden
PORT=3003                                 # ← Poort (kan worden aangepast)
FRONTEND_URL=http://localhost:3000       # ← URL van je React app
NODE_ENV=development
```

### 2. Gmail App Password Instellen

Als je Gmail gebruikt:

1. Ga naar: https://myaccount.google.com/security
2. Schakel **2-Stap Verificatie** in (als nog niet gedaan)
3. Ga naar: https://myaccount.google.com/apppasswords
4. Selecteer "Mail" en "Other (Custom name)"
5. Voer in: "The Golden Olive API"
6. Kopieer het 16-karakter wachtwoord
7. Gebruik dit wachtwoord in `SMTP_PASS` (NIET je normale Gmail wachtwoord!)

### 3. Server Starten

**Development mode (met auto-reload):**
```bash
cd react-app/server
npm run dev
```

**Production mode:**
```bash
cd react-app/server
npm start
```

Je zou moeten zien:
```
🚀 Email API server running on port 3003
📧 Email configured for: jouw-email@gmail.com
🌐 Frontend URL: http://localhost:3000
```

### 4. Frontend Configureren (optioneel)

Als je server op een andere poort draait dan 3001, voeg toe aan `react-app/.env`:

```env
VITE_API_URL=http://localhost:3003
```

## Testen

### 1. Health Check
```bash
curl http://localhost:3003/health
```

Verwacht antwoord:
```json
{"status":"ok","message":"Email API is running"}
```

### 2. Test Contact Formulier
1. Start de React app: `cd react-app && npm run dev`
2. Start de API server: `cd react-app/server && npm run dev`
3. Ga naar de contact pagina
4. Vul het formulier in en verzend
5. Controleer of je de email ontvangt

## Troubleshooting

### "Authentication failed"
- Voor Gmail: Gebruik App Password, niet je normale wachtwoord
- Controleer of 2FA is ingeschakeld
- Verifieer credentials in `.env`

### "Port already in use"
- Wijzig `PORT` in `.env` naar een andere poort (bijv. 3004, 3005, 5001)
- Update `VITE_API_URL` in frontend `.env` als je de poort wijzigt

### "Connection timeout"
- Controleer SMTP poort (587 voor Gmail)
- Controleer firewall instellingen
- Probeer een andere SMTP host

### Server start niet
- Controleer of alle dependencies zijn geïnstalleerd: `npm install`
- Controleer `.env` bestand op syntax errors
- Controleer Node.js versie: `node --version` (moet >= 18.0.0 zijn)

## API Endpoints

- `POST /api/contact` - Contactformulier verzenden
- `POST /api/reservation` - Reservering aanvraag
- `GET /health` - Health check

## Veiligheid

- ✅ `.env` staat in `.gitignore` (wordt niet gecommit)
- ✅ Rate limiting (5 requests per 15 minuten per IP)
- ✅ Input validatie
- ✅ Email format validatie
- ✅ CORS protection

