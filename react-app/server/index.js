/**
 * Node.js Express Server for Email Functionality
 * Replaces PHPMailer with Nodemailer (Node.js equivalent)
 */

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting to prevent spam
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many email requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // Use environment variables for email configuration
  // Supports Gmail, Outlook, custom SMTP, etc.
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false // For self-signed certificates
    }
  });
};

// Email template
const createEmailTemplate = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #ffc107, #ffcd39);
          color: #000;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .field {
          margin-bottom: 20px;
          padding: 15px;
          background: white;
          border-left: 4px solid #ffc107;
          border-radius: 4px;
        }
        .field-label {
          font-weight: bold;
          color: #ffc107;
          margin-bottom: 5px;
        }
        .field-value {
          color: #333;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>The Golden Olive - Contact Formulier</h1>
      </div>
      <div class="content">
        <div class="field">
          <div class="field-label">Naam:</div>
          <div class="field-value">${data.name || 'Niet opgegeven'}</div>
        </div>
        <div class="field">
          <div class="field-label">Email:</div>
          <div class="field-value">${data.email || 'Niet opgegeven'}</div>
        </div>
        <div class="field">
          <div class="field-label">Telefoon:</div>
          <div class="field-value">${data.phone || 'Niet opgegeven'}</div>
        </div>
        <div class="field">
          <div class="field-label">Onderwerp:</div>
          <div class="field-value">${data.subject || 'Geen onderwerp'}</div>
        </div>
        <div class="field">
          <div class="field-label">Bericht:</div>
          <div class="field-value">${data.message || 'Geen bericht'}</div>
        </div>
        ${data.eventType ? `
        <div class="field">
          <div class="field-label">Evenement Type:</div>
          <div class="field-value">${data.eventType}</div>
        </div>
        ` : ''}
        ${data.eventDate ? `
        <div class="field">
          <div class="field-label">Evenement Datum:</div>
          <div class="field-value">${data.eventDate}</div>
        </div>
        ` : ''}
        ${data.guests ? `
        <div class="field">
          <div class="field-label">Aantal Gasten:</div>
          <div class="field-value">${data.guests}</div>
        </div>
        ` : ''}
      </div>
      <div class="footer">
        <p>Dit bericht is verzonden via het contactformulier op the-goldenolive.be</p>
        <p>Verzonden op: ${new Date().toLocaleString('nl-BE')}</p>
      </div>
    </body>
    </html>
  `;
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Email API is running' });
});

// Contact form email endpoint
app.post('/api/contact', emailLimiter, async (req, res) => {
  try {
    const { name, email, phone, subject, message, eventType, eventDate, guests } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Naam, email en bericht zijn verplicht.'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Ongeldig email adres.'
      });
    }

    // Create transporter
    const transporter = createTransporter();

    // Verify transporter configuration
    await transporter.verify();

    // Email options
    const mailOptions = {
      from: `"${name}" <${process.env.SMTP_USER}>`,
      replyTo: email,
      to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
      subject: subject || `Contactformulier: ${name}`,
      html: createEmailTemplate({
        name,
        email,
        phone,
        subject,
        message,
        eventType,
        eventDate,
        guests
      }),
      text: `
        Contact Formulier - The Golden Olive
        
        Naam: ${name}
        Email: ${email}
        Telefoon: ${phone || 'Niet opgegeven'}
        Onderwerp: ${subject || 'Geen onderwerp'}
        
        Bericht:
        ${message}
        
        ${eventType ? `Evenement Type: ${eventType}` : ''}
        ${eventDate ? `Evenement Datum: ${eventDate}` : ''}
        ${guests ? `Aantal Gasten: ${guests}` : ''}
        
        Verzonden op: ${new Date().toLocaleString('nl-BE')}
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', info.messageId);

    res.json({
      success: true,
      message: 'Uw bericht is succesvol verzonden. We nemen zo spoedig mogelijk contact met u op.',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending email:', error);
    
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het verzenden van uw bericht. Probeer het later opnieuw of bel ons op +32 494 19 43 97.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reservation/Event booking endpoint
app.post('/api/reservation', emailLimiter, async (req, res) => {
  try {
    const { name, email, phone, eventType, eventDate, guests, message } = req.body;

    // Validation
    if (!name || !email || !phone || !eventDate) {
      return res.status(400).json({
        success: false,
        message: 'Naam, email, telefoon en datum zijn verplicht voor reserveringen.'
      });
    }

    const transporter = createTransporter();
    await transporter.verify();

    const mailOptions = {
      from: `"${name}" <${process.env.SMTP_USER}>`,
      replyTo: email,
      to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
      subject: `Reservering/Evenement: ${eventType || 'Algemeen'} - ${name}`,
      html: createEmailTemplate({
        name,
        email,
        phone,
        subject: `Reservering: ${eventType || 'Algemeen'}`,
        message: message || 'Reservering aanvraag',
        eventType,
        eventDate,
        guests
      }),
      text: `
        Reservering/Evenement Aanvraag - The Golden Olive
        
        Naam: ${name}
        Email: ${email}
        Telefoon: ${phone}
        Evenement Type: ${eventType || 'Algemeen'}
        Datum: ${eventDate}
        Aantal Gasten: ${guests || 'Niet opgegeven'}
        
        ${message ? `Opmerkingen:\n${message}` : ''}
        
        Verzonden op: ${new Date().toLocaleString('nl-BE')}
      `
    };

    const info = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Uw reserveringsaanvraag is succesvol verzonden. We bevestigen uw reservering zo spoedig mogelijk.',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending reservation email:', error);
    
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden. Bel ons op +32 494 19 43 97 voor directe reservering.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Email API server running on port ${PORT}`);
  console.log(`📧 Email configured for: ${process.env.SMTP_USER || 'Not configured'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

module.exports = app;

