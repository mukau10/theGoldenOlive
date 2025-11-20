import { useState } from 'react';
import type { FormEvent } from 'react';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const ContactForm = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear errors when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
        });
        // Hide success message after 5 seconds
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(data.message || 'Er is een fout opgetreden. Probeer het opnieuw.');
      }
    } catch (err) {
      setError('Kon geen verbinding maken met de server. Controleer uw internetverbinding of bel ons op +32 494 19 43 97.');
      console.error('Contact form error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="col-12 col-lg-8 mx-auto">
      <div className="bg-black border border-warning rounded-3 p-4 p-lg-5">
        <h3 className="text-warning mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
          <i className="bi bi-envelope me-2"></i>Stuur ons een bericht
        </h3>

        <form onSubmit={handleSubmit} className="php-email-form">
          {/* Success Message */}
          {success && (
            <div className="sent-message alert alert-success d-block mb-4">
              <i className="bi bi-check-circle me-2"></i>
              Uw bericht is succesvol verzonden! We nemen zo spoedig mogelijk contact met u op.
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="error-message alert alert-danger d-block mb-4">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="loading d-block text-center mb-4">
              <div className="spinner-border text-warning" role="status">
                <span className="visually-hidden">Verzenden...</span>
              </div>
              <p className="text-white mt-2">Uw bericht wordt verzonden...</p>
            </div>
          )}

          <div className="row g-3">
            {/* Name */}
            <div className="col-12 col-md-6">
              <div className="form-group">
                <label htmlFor="name" className="text-white mb-2">
                  Naam <span className="text-warning">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control bg-dark text-white border-warning"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Uw naam"
                />
              </div>
            </div>

            {/* Email */}
            <div className="col-12 col-md-6">
              <div className="form-group">
                <label htmlFor="email" className="text-white mb-2">
                  Email <span className="text-warning">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-control bg-dark text-white border-warning"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="uw.email@voorbeeld.be"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="col-12 col-md-6">
              <div className="form-group">
                <label htmlFor="phone" className="text-white mb-2">
                  Telefoon
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="form-control bg-dark text-white border-warning"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+32 XXX XX XX XX"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="col-12 col-md-6">
              <div className="form-group">
                <label htmlFor="subject" className="text-white mb-2">
                  Onderwerp
                </label>
                <select
                  id="subject"
                  name="subject"
                  className="form-select bg-dark text-white border-warning"
                  value={formData.subject}
                  onChange={handleChange}
                >
                  <option value="">Selecteer onderwerp</option>
                  <option value="Reservering">Reservering</option>
                  <option value="Evenement">Evenement</option>
                  <option value="Algemene vraag">Algemene vraag</option>
                  <option value="Klacht">Klacht</option>
                  <option value="Compliment">Compliment</option>
                  <option value="Anders">Anders</option>
                </select>
              </div>
            </div>

            {/* Message */}
            <div className="col-12">
              <div className="form-group">
                <label htmlFor="message" className="text-white mb-2">
                  Bericht <span className="text-warning">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  className="form-control bg-dark text-white border-warning"
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Uw bericht..."
                ></textarea>
              </div>
            </div>

            {/* Submit Button */}
            <div className="col-12 text-center">
              <button
                type="submit"
                className="btn btn-warning btn-lg px-5 py-3 rounded-pill fw-bold text-black"
                disabled={loading}
                style={{ transition: 'all 0.3s' }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Verzenden...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-2"></i>Verzend Bericht
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactForm;

