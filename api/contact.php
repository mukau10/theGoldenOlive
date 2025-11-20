<?php
/**
 * Contact Form Handler - The Golden Olive
 * Handles contact form submissions using PHPMailer
 */

// Set headers for JSON response and CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Alleen POST requests zijn toegestaan.'
    ]);
    exit();
}

// Load Composer autoloader
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Load configuration
require_once __DIR__ . '/config.php';

/**
 * Send contact form email
 */
function sendContactEmail($data) {
    global $smtpConfig;
    
    // Validation
    if (empty($data['name']) || empty($data['email']) || empty($data['message'])) {
        return [
            'success' => false,
            'message' => 'Naam, email en bericht zijn verplicht.'
        ];
    }
    
    // Email validation
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        return [
            'success' => false,
            'message' => 'Ongeldig email adres.'
        ];
    }
    
    // Sanitize input
    $name = htmlspecialchars(strip_tags($data['name']));
    $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
    $phone = isset($data['phone']) ? htmlspecialchars(strip_tags($data['phone'])) : '';
    $subject = isset($data['subject']) ? htmlspecialchars(strip_tags($data['subject'])) : 'Contactformulier: ' . $name;
    $message = htmlspecialchars(strip_tags($data['message']));
    $eventType = isset($data['eventType']) ? htmlspecialchars(strip_tags($data['eventType'])) : '';
    $eventDate = isset($data['eventDate']) ? htmlspecialchars(strip_tags($data['eventDate'])) : '';
    $guests = isset($data['guests']) ? htmlspecialchars(strip_tags($data['guests'])) : '';
    
    try {
        // Create PHPMailer instance
        $mail = new PHPMailer(true);
        
        // Server settings
        $mail->isSMTP();
        $mail->Host = $smtpConfig['host'];
        $mail->SMTPAuth = true;
        $mail->Username = $smtpConfig['username'];
        $mail->Password = $smtpConfig['password'];
        $mail->SMTPSecure = $smtpConfig['secure']; // PHPMailer::ENCRYPTION_STARTTLS or PHPMailer::ENCRYPTION_SMTPS
        $mail->Port = $smtpConfig['port'];
        $mail->CharSet = 'UTF-8';
        
        // Enable verbose debug output (only in development)
        if ($smtpConfig['debug']) {
            $mail->SMTPDebug = 2;
        }
        
        // Recipients
        $mail->setFrom($smtpConfig['username'], 'The Golden Olive Contact Form');
        $mail->addAddress($smtpConfig['contact_email']);
        $mail->addReplyTo($email, $name);
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        
        // HTML email body
        $htmlBody = createEmailTemplate([
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'subject' => $subject,
            'message' => $message,
            'eventType' => $eventType,
            'eventDate' => $eventDate,
            'guests' => $guests
        ]);
        
        $mail->Body = $htmlBody;
        
        // Plain text alternative
        $mail->AltBody = createPlainTextEmail([
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'subject' => $subject,
            'message' => $message,
            'eventType' => $eventType,
            'eventDate' => $eventDate,
            'guests' => $guests
        ]);
        
        // Send email
        $mail->send();
        
        return [
            'success' => true,
            'message' => 'Uw bericht is succesvol verzonden. We nemen zo spoedig mogelijk contact met u op.'
        ];
        
    } catch (Exception $e) {
        error_log('PHPMailer Error: ' . $mail->ErrorInfo);
        
        return [
            'success' => false,
            'message' => 'Er is een fout opgetreden bij het verzenden van uw bericht. Probeer het later opnieuw of bel ons op +32 494 19 43 97.',
            'error' => $smtpConfig['debug'] ? $mail->ErrorInfo : null
        ];
    }
}

/**
 * Create HTML email template
 */
function createEmailTemplate($data) {
    $html = '
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
                <div class="field-value">' . htmlspecialchars($data['name'] ?? 'Niet opgegeven') . '</div>
            </div>
            <div class="field">
                <div class="field-label">Email:</div>
                <div class="field-value">' . htmlspecialchars($data['email'] ?? 'Niet opgegeven') . '</div>
            </div>
            <div class="field">
                <div class="field-label">Telefoon:</div>
                <div class="field-value">' . htmlspecialchars($data['phone'] ?? 'Niet opgegeven') . '</div>
            </div>
            <div class="field">
                <div class="field-label">Onderwerp:</div>
                <div class="field-value">' . htmlspecialchars($data['subject'] ?? 'Geen onderwerp') . '</div>
            </div>
            <div class="field">
                <div class="field-label">Bericht:</div>
                <div class="field-value">' . nl2br(htmlspecialchars($data['message'] ?? 'Geen bericht')) . '</div>
            </div>';
    
    if (!empty($data['eventType'])) {
        $html .= '
            <div class="field">
                <div class="field-label">Evenement Type:</div>
                <div class="field-value">' . htmlspecialchars($data['eventType']) . '</div>
            </div>';
    }
    
    if (!empty($data['eventDate'])) {
        $html .= '
            <div class="field">
                <div class="field-label">Evenement Datum:</div>
                <div class="field-value">' . htmlspecialchars($data['eventDate']) . '</div>
            </div>';
    }
    
    if (!empty($data['guests'])) {
        $html .= '
            <div class="field">
                <div class="field-label">Aantal Gasten:</div>
                <div class="field-value">' . htmlspecialchars($data['guests']) . '</div>
            </div>';
    }
    
    $html .= '
        </div>
        <div class="footer">
            <p>Dit bericht is verzonden via het contactformulier op the-goldenolive.be</p>
            <p>Verzonden op: ' . date('d/m/Y H:i:s') . '</p>
        </div>
    </body>
    </html>';
    
    return $html;
}

/**
 * Create plain text email
 */
function createPlainTextEmail($data) {
    $text = "Contact Formulier - The Golden Olive\n\n";
    $text .= "Naam: " . ($data['name'] ?? 'Niet opgegeven') . "\n";
    $text .= "Email: " . ($data['email'] ?? 'Niet opgegeven') . "\n";
    $text .= "Telefoon: " . ($data['phone'] ?? 'Niet opgegeven') . "\n";
    $text .= "Onderwerp: " . ($data['subject'] ?? 'Geen onderwerp') . "\n\n";
    $text .= "Bericht:\n" . ($data['message'] ?? 'Geen bericht') . "\n\n";
    
    if (!empty($data['eventType'])) {
        $text .= "Evenement Type: " . $data['eventType'] . "\n";
    }
    
    if (!empty($data['eventDate'])) {
        $text .= "Evenement Datum: " . $data['eventDate'] . "\n";
    }
    
    if (!empty($data['guests'])) {
        $text .= "Aantal Gasten: " . $data['guests'] . "\n";
    }
    
    $text .= "\nVerzonden op: " . date('d/m/Y H:i:s');
    
    return $text;
}

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// If JSON decode failed, try form data
if (json_last_error() !== JSON_ERROR_NONE) {
    $data = $_POST;
}

// Send email
$result = sendContactEmail($data);

// Return JSON response
http_response_code($result['success'] ? 200 : 400);
echo json_encode($result);

