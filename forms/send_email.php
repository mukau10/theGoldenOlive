<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once 'vendor/autoload.php'; // Laad PHPMailer

// Instantieer PHPMailer
$mail = new PHPMailer(true);

try {
    // Serverinstellingen
    $mail->SMTPDebug = 0; // Schakel debugmodus uit voor productie (0 voor geen debuginfo, 2 voor gedetailleerde debuginfo)
    $mail->isSMTP();
    $mail->Host = 'smtp.example.com'; // SMTP-server
    $mail->SMTPAuth = true;
    $mail->Username = 'your@example.com'; // SMTP-gebruikersnaam
    $mail->Password = 'yourpassword'; // SMTP-wachtwoord
    $mail->SMTPSecure = 'tls'; // TLS-versleuteling
    $mail->Port = 587; // SMTP-poort

    // E-mailontvanger
    $mail->setFrom('your@example.com', 'Your Name'); // Afzender
    $mail->addAddress('recipient@example.com', 'Recipient Name'); // Ontvanger

    // Inhoud van de e-mail
    $mail->isHTML(true); // Stel in dat de e-mail HTML-indeling heeft
    $mail->Subject = 'Testbericht via PHPMailer';
    $mail->Body    = 'Dit is een testbericht verzonden via PHPMailer.';

    // Verzend de e-mail
    $mail->send();
    echo 'Het bericht is succesvol verzonden!';
} catch (Exception $e) {
    echo "Het bericht kon niet worden verzonden. Fout: {$mail->ErrorInfo}";
}
?>
