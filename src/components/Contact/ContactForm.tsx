import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const ContactForm = () => {
  const { t } = useTranslation();
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
      // Use PHP endpoint - works with any web server (no Node.js needed)
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/contact.php`, {
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
        setError(data.message || t('contactForm.error'));
      }
    } catch (err) {
      setError(t('contactForm.connectionError'));
      console.error('Contact form error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="col-12 col-lg-8 mx-auto">
      <div className="bg-black border border-warning rounded-3 p-4 p-lg-5">
        <h3 className="text-warning mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
          <i className="bi bi-envelope me-2"></i>{t('contactForm.title')}
        </h3>

        <form onSubmit={handleSubmit} className="php-email-form">
          {/* Success Message */}
          {success && (
            <div className="sent-message alert alert-success d-block mb-4">
              <i className="bi bi-check-circle me-2"></i>
              {t('contactForm.success')}
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
                <span className="visually-hidden">{t('contactForm.sending')}</span>
              </div>
              <p className="text-white mt-2">{t('contactForm.sending')}</p>
            </div>
          )}

          <div className="row g-3">
            {/* Name */}
            <div className="col-12 col-md-6">
              <div className="form-group">
                <label htmlFor="name" className="text-white mb-2">
                  {t('contactForm.name')} <span className="text-warning">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control bg-dark text-white border-warning"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder={t('contactForm.namePlaceholder')}
                />
              </div>
            </div>

            {/* Email */}
            <div className="col-12 col-md-6">
              <div className="form-group">
                <label htmlFor="email" className="text-white mb-2">
                  {t('contactForm.email')} <span className="text-warning">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-control bg-dark text-white border-warning"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder={t('contactForm.emailPlaceholder')}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="col-12 col-md-6">
              <div className="form-group">
                <label htmlFor="phone" className="text-white mb-2">
                  {t('contactForm.phone')}
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="form-control bg-dark text-white border-warning"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={t('contactForm.phonePlaceholder')}
                />
              </div>
            </div>

            {/* Subject */}
            <div className="col-12 col-md-6">
              <div className="form-group">
                <label htmlFor="subject" className="text-white mb-2">
                  {t('contactForm.subject')}
                </label>
                <select
                  id="subject"
                  name="subject"
                  className="form-select bg-dark text-white border-warning"
                  value={formData.subject}
                  onChange={handleChange}
                >
                  <option value="">{t('contactForm.selectSubject')}</option>
                  <option value={t('contact.reservation')}>{t('contact.reservation')}</option>
                  <option value={t('contact.event')}>{t('contact.event')}</option>
                  <option value={t('contact.generalQuestion')}>{t('contact.generalQuestion')}</option>
                  <option value={t('contact.complaint')}>{t('contact.complaint')}</option>
                  <option value={t('contact.compliment')}>{t('contact.compliment')}</option>
                  <option value={t('contact.other')}>{t('contact.other')}</option>
                </select>
              </div>
            </div>

            {/* Message */}
            <div className="col-12">
              <div className="form-group">
                <label htmlFor="message" className="text-white mb-2">
                  {t('contactForm.message')} <span className="text-warning">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  className="form-control bg-dark text-white border-warning"
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder={t('contactForm.messagePlaceholder')}
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
                    {t('contactForm.sending')}
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-2"></i>{t('contactForm.send')}
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

