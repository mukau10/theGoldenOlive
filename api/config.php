<?php
/**
 * Email Configuration - The Golden Olive
 * 
 * IMPORTANT: Update these values with your actual email credentials
 * For Gmail: Use App Password (not regular password)
 * Enable 2FA and generate App Password: https://myaccount.google.com/apppasswords
 */

// Load PHPMailer for constants
require_once __DIR__ . '/../vendor/autoload.php';
use PHPMailer\PHPMailer\PHPMailer;

// SMTP Configuration
$smtpConfig = [
    'host' => 'smtp.gmail.com',           // SMTP server (smtp.gmail.com for Gmail)
    'port' => 587,                         // SMTP port (587 for TLS, 465 for SSL)
    'secure' => PHPMailer::ENCRYPTION_STARTTLS, // Encryption: ENCRYPTION_STARTTLS or ENCRYPTION_SMTPS
    'username' => 'your-email@gmail.com',  // SMTP username (your email)
    'password' => 'your-app-password',      // SMTP password (Gmail App Password)
    'contact_email' => 'info@the-goldenolive.be', // Where to send contact form emails
    'debug' => false                       // Set to true for debugging (shows SMTP errors)
];

// Alternative configurations for other email providers:

// Outlook/Hotmail:
// $smtpConfig = [
//     'host' => 'smtp-mail.outlook.com',
//     'port' => 587,
//     'secure' => PHPMailer::ENCRYPTION_STARTTLS,
//     'username' => 'your-email@outlook.com',
//     'password' => 'your-password',
//     'contact_email' => 'info@the-goldenolive.be',
//     'debug' => false
// ];

// Custom SMTP Server:
// $smtpConfig = [
//     'host' => 'mail.yourdomain.com',
//     'port' => 587,
//     'secure' => PHPMailer::ENCRYPTION_STARTTLS,
//     'username' => 'info@yourdomain.com',
//     'password' => 'your-password',
//     'contact_email' => 'info@the-goldenolive.be',
//     'debug' => false
// ];

