# Email Setup Guide

## Overview

The React app includes a Node.js backend API server that replaces PHPMailer functionality. The server uses **Nodemailer** (Node.js equivalent of PHPMailer) to send emails.

## Quick Start

### 1. Install Server Dependencies

```bash
cd react-app/server
npm install
```

### 2. Configure Email Settings

```bash
cp .env.example .env
```

Edit `.env` with your email credentials:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
CONTACT_EMAIL=info@the-goldenolive.be
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### 3. Start the Server

```bash
npm run dev
```

### 4. Configure Frontend

In `react-app/.env`:

```env
VITE_API_URL=http://localhost:3001
```

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "The Golden Olive API"
   - Copy the 16-character password
   - Use this in `SMTP_PASS` (not your regular password)

3. **Configure .env**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  # App password (16 chars, no spaces)
   ```

## Other Email Providers

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Custom SMTP Server
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@yourdomain.com
SMTP_PASS=your-password
```

## API Endpoints

### POST `/api/contact`
Sends contact form email.

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

**Response:**
```json
{
  "success": true,
  "message": "Uw bericht is succesvol verzonden...",
  "messageId": "email-id"
}
```

### POST `/api/reservation`
Sends reservation/event booking email.

## Testing

1. Start the server: `cd server && npm run dev`
2. Test the endpoint:
```bash
curl -X POST http://localhost:3001/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "Test message"
  }'
```

## Production Deployment

### Environment Variables

Set these in your production environment:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=production-email@gmail.com
SMTP_PASS=production-app-password
CONTACT_EMAIL=info@the-goldenolive.be
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://the-goldenolive.be
```

### Using PM2

```bash
npm install -g pm2
cd server
pm2 start index.js --name "golden-olive-api"
pm2 save
pm2 startup
```

## Troubleshooting

### "Authentication failed"
- For Gmail: Use App Password, not regular password
- Check 2FA is enabled
- Verify credentials in `.env`

### "Connection timeout"
- Check firewall settings
- Verify SMTP port (587 or 465)
- Try different SMTP host

### "CORS error"
- Set `FRONTEND_URL` in `.env` correctly
- Check CORS middleware in `index.js`

## Migration from PHPMailer

**Before (PHP):**
- PHP file with PHPMailer
- Server-side form processing

**After (Node.js):**
- Express API with Nodemailer
- Same functionality, better for React
- RESTful API endpoints
- Better error handling

## Security

- ✅ Rate limiting (5 requests/15 min per IP)
- ✅ Input validation
- ✅ Email format validation
- ✅ Environment variables for secrets
- ✅ CORS protection

