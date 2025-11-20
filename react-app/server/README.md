# Email API Server

Node.js Express server that replaces PHPMailer functionality for the React app.

## Features

- ✅ Nodemailer (Node.js equivalent of PHPMailer)
- ✅ Contact form email endpoint
- ✅ Reservation/Event booking endpoint
- ✅ Rate limiting (anti-spam)
- ✅ HTML email templates
- ✅ CORS support
- ✅ Error handling
- ✅ Environment-based configuration

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your email settings:

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

### 3. Gmail Setup (Recommended)

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "The Golden Olive API"
   - Copy the generated password
   - Use this password in `SMTP_PASS`

### 4. Run Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## API Endpoints

### POST `/api/contact`

Send contact form email.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+32 123 45 67 89",
  "subject": "Reservering",
  "message": "Hello, I would like to make a reservation..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Uw bericht is succesvol verzonden...",
  "messageId": "email-message-id"
}
```

### POST `/api/reservation`

Send reservation/event booking email.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+32 123 45 67 89",
  "eventType": "Verjaardag",
  "eventDate": "2025-12-25",
  "guests": "10",
  "message": "Additional notes..."
}
```

### GET `/health`

Health check endpoint.

## Frontend Configuration

In your React app, set the API URL:

**`.env` file:**
```env
VITE_API_URL=http://localhost:3001
```

**Production:**
```env
VITE_API_URL=https://api.the-goldenolive.be
```

## SMTP Providers

### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Custom SMTP
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
```

## Security Features

- ✅ Rate limiting (5 requests per 15 minutes per IP)
- ✅ Input validation
- ✅ Email format validation
- ✅ CORS protection
- ✅ Environment variables for sensitive data

## Deployment

### Using PM2

```bash
npm install -g pm2
pm2 start index.js --name "golden-olive-api"
pm2 save
pm2 startup
```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

## Troubleshooting

### Email not sending?

1. Check SMTP credentials in `.env`
2. For Gmail: Use App Password, not regular password
3. Check firewall/port restrictions
4. Verify `SMTP_USER` and `SMTP_PASS` are correct
5. Check server logs for error messages

### CORS errors?

1. Ensure `FRONTEND_URL` in `.env` matches your frontend URL
2. Check CORS middleware configuration

### Rate limit errors?

- Default: 5 requests per 15 minutes per IP
- Adjust in `index.js` if needed

## Migration from PHPMailer

This Node.js server replaces the PHP/PHPMailer setup:

**Before (PHP):**
- PHP file handling form submission
- PHPMailer library
- Server-side processing

**After (Node.js):**
- Express API endpoints
- Nodemailer library
- Same functionality, better for React apps

## Support

For issues or questions, check the server logs or contact support.

