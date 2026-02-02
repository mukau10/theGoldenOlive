/**
 * Checkout Component - Mobile First Design
 * Multi-step checkout flow with validation and address autocomplete
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrder } from './OrderContext';
import './Order.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface CheckoutProps {
  onBack: () => void;
  onSuccess: (orderNumber: string) => void;
}

interface FormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: {
    street: string;
    house_number: string;
    bus: string;
    postal_code: string;
    city: string;
  };
  notes: string;
}

interface PostcodeData {
  code: string;
  city: string;
  province: string;
  deliveryAvailable: boolean;
}

interface StreetSuggestion {
  display_name: string;
  street: string;
}

interface ValidationErrors {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  street?: string;
  house_number?: string;
  postal_code?: string;
  city?: string;
  antibot_answer?: string;
}

// Validation patterns (stronger, pragmatic)
const EMAIL_BASIC_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'trashmail.com',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'temp-mail.org',
  'minuteinbox.com',
]);
// Phone regex - local number without country code (7-12 digits)
const PHONE_REGEX = /^[0-9]{7,12}$/;
const BELGIAN_POSTCODE_REGEX = /^[1-9][0-9]{3}$/;

// Common country codes
const COUNTRY_CODES = [
  { code: '+32', country: 'BE', flag: '🇧🇪', name: 'België' },
  { code: '+31', country: 'NL', flag: '🇳🇱', name: 'Nederland' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'Frankrijk' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Duitsland' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'UK' },
  { code: '+352', country: 'LU', flag: '🇱🇺', name: 'Luxemburg' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spanje' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italië' },
  { code: '+41', country: 'CH', flag: '🇨🇭', name: 'Zwitserland' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'VS/Canada' },
  { code: '+48', country: 'PL', flag: '🇵🇱', name: 'Polen' },
  { code: '+90', country: 'TR', flag: '🇹🇷', name: 'Turkije' },
  { code: '+212', country: 'MA', flag: '🇲🇦', name: 'Marokko' },
  { code: '+213', country: 'DZ', flag: '🇩🇿', name: 'Algerije' },
  { code: '+216', country: 'TN', flag: '🇹🇳', name: 'Tunesië' },
];

const CHECKOUT_STORAGE_KEY = 'golden-olive-checkout';

// Load saved checkout data from localStorage
const loadSavedCheckoutData = () => {
  try {
    const saved = localStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Error loading checkout data:', err);
  }
  return null;
};

const Checkout: React.FC<CheckoutProps> = ({ onBack, onSuccess }) => {
  const { t } = useTranslation();
  const { cart, total, clearCart } = useOrder();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Anti-bot challenge (simple math exercise)
  const [antiBot, setAntiBot] = useState<{
    token: string;
    question: string;
    expiresAt: number;
    a: number;
    b: number;
    op: '+' | '-';
  } | null>(null);
  const [antiBotAnswer, setAntiBotAnswer] = useState('');
  
  // Load saved data
  const savedData = loadSavedCheckoutData();
  
  // Payment method state - cash available for both pickup and delivery
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>(savedData?.paymentMethod || 'online');
  
  // Country code for phone number
  const [countryCode, setCountryCode] = useState(savedData?.countryCode || '+32');
  
  // Address autocomplete state
  const [postcodes, setPostcodes] = useState<PostcodeData[]>([]);
  const [streetSuggestions, setStreetSuggestions] = useState<StreetSuggestion[]>([]);
  const [showStreetSuggestions, setShowStreetSuggestions] = useState(false);
  const [loadingStreets, setLoadingStreets] = useState(false);
  const [deliveryWarning, setDeliveryWarning] = useState<string | null>(null);
  const streetInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<FormData>(savedData?.formData || {
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    address: {
      street: '',
      house_number: '',
      bus: '',
      postal_code: '',
      city: ''
    },
    notes: ''
  });
  
  // Save checkout data to localStorage when it changes
  useEffect(() => {
    const dataToSave = {
      formData,
      countryCode,
      paymentMethod,
    };
    try {
      localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (err) {
      console.error('Error saving checkout data:', err);
    }
  }, [formData, countryCode, paymentMethod]);

  // Load Belgian postcodes
  useEffect(() => {
    const loadPostcodes = async () => {
      try {
        const response = await fetch('/data/belgian-postcodes.json');
        const data = await response.json();
        setPostcodes(data.postcodes);
      } catch (err) {
        console.error('Error loading postcodes:', err);
      }
    };
    loadPostcodes();
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          streetInputRef.current && !streetInputRef.current.contains(e.target as Node)) {
        setShowStreetSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate subtotal
  const subtotal = cart.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  // Format phone number - only digits, no country code (that's handled separately)
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    return value.replace(/[^\d]/g, '');
  };

  // Validate individual field
  const validateField = useCallback((field: string, value: string): string | undefined => {
    switch (field) {
      case 'customer_name':
        if (!value.trim()) return t('order.errorName', 'Naam is verplicht');
        if (value.trim().length < 2) return t('order.errorNameShort', 'Naam moet minstens 2 tekens zijn');
        break;
      case 'customer_email':
        if (!value.trim()) return t('order.errorEmail', 'E-mail is verplicht');
        {
          const email = value.trim();
          if (email.length > 254) return t('order.errorEmailInvalid', 'Ongeldig e-mailadres');
          const parts = email.split('@');
          if (parts.length !== 2) return t('order.errorEmailInvalid', 'Ongeldig e-mailadres');
          const [local, domain] = parts;
          if (!local || local.length > 64) return t('order.errorEmailInvalid', 'Ongeldig e-mailadres');
          if (!EMAIL_BASIC_REGEX.test(email)) return t('order.errorEmailInvalid', 'Ongeldig e-mailadres');
          if (domain.includes('..')) return t('order.errorEmailInvalid', 'Ongeldig e-mailadres');
          const tld = domain.split('.').pop() || '';
          if (tld.length < 2) return t('order.errorEmailInvalid', 'Ongeldig e-mailadres');
          if (DISPOSABLE_EMAIL_DOMAINS.has(domain.toLowerCase())) {
            return t('order.errorEmailDisposable', 'Tijdelijk e-mailadres is niet toegestaan');
          }
        }
        break;
      case 'antibot_answer':
        if (!value.trim()) return t('order.errorAntiBot', 'Beantwoord de rekenoefening om verder te gaan');
        if (!/^-?\d+$/.test(value.trim())) return t('order.errorAntiBot', 'Beantwoord de rekenoefening om verder te gaan');
        if (antiBot) {
          const expected = antiBot.op === '+' ? antiBot.a + antiBot.b : antiBot.a - antiBot.b;
          if (parseInt(value.trim(), 10) !== expected) return t('order.errorAntiBotWrong', 'Antwoord is niet correct');
        }
        break;
      case 'customer_phone':
        if (!value.trim()) return t('order.errorPhone', 'Telefoonnummer is verplicht');
        // Remove leading zero if present (common in local numbers)
        let cleanedPhone = value.replace(/[\s\-\(\)\.]/g, '');
        if (cleanedPhone.startsWith('0')) {
          cleanedPhone = cleanedPhone.substring(1);
        }
        if (!PHONE_REGEX.test(cleanedPhone)) return t('order.errorPhoneInvalid', 'Voer een geldig telefoonnummer in (7-12 cijfers)');
        break;
      case 'address.street':
        if (cart.deliveryType === 'delivery' && !value.trim()) return t('order.errorStreet', 'Straat is verplicht');
        break;
      case 'address.house_number':
        if (cart.deliveryType === 'delivery' && !value.trim()) return t('order.errorHouseNumber', 'Huisnummer is verplicht');
        break;
      case 'address.postal_code':
        if (cart.deliveryType === 'delivery') {
          if (!value.trim()) return t('order.errorPostalCode', 'Postcode is verplicht');
          if (!BELGIAN_POSTCODE_REGEX.test(value)) return t('order.errorPostcodeInvalid', 'Ongeldige Belgische postcode');
        }
        break;
      case 'address.city':
        if (cart.deliveryType === 'delivery' && !value.trim()) return t('order.errorCity', 'Stad is verplicht');
        break;
    }
    return undefined;
  }, [cart.deliveryType, t, antiBot]);

  // Update form data with validation
  const updateFormData = (field: string, value: string) => {
    // Format phone number
    if (field === 'customer_phone') {
      value = formatPhoneNumber(value);
    }
    
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [addressField]: value }
      }));
      
      // Auto-fill city based on postcode
      if (addressField === 'postal_code' && BELGIAN_POSTCODE_REGEX.test(value)) {
        const postcodeData = postcodes.find(p => p.code === value);
        if (postcodeData) {
          setFormData(prev => ({
            ...prev,
            address: { ...prev.address, postal_code: value, city: postcodeData.city }
          }));
          
          // Check delivery availability
          if (!postcodeData.deliveryAvailable) {
            setDeliveryWarning(t('order.deliveryNotAvailable', 'Bezorging is momenteel niet beschikbaar in deze regio. Kies voor afhalen of neem contact met ons op.'));
          } else {
            setDeliveryWarning(null);
          }
        }
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Validate field if touched
    if (touched[field]) {
      const error = validateField(field, value);
      setValidationErrors(prev => ({ ...prev, [field.replace('address.', '')]: error }));
    }
    
    setError(null);
  };

  const refreshAntiBot = useCallback(async () => {
    try {
      const resp = await fetch(`${API_URL}/antibot/challenge`);
      const data = await resp.json();
      if (resp.ok && data?.data?.token) {
        setAntiBot(data.data);
        setAntiBotAnswer('');
        setValidationErrors((prev) => ({ ...prev, antibot_answer: undefined }));
        setTouched((prev) => ({ ...prev, antibot_answer: false }));
      }
    } catch (err) {
      console.error('Error loading anti-bot challenge:', err);
    }
  }, []);

  // Load anti-bot challenge when reaching payment step (step 3)
  useEffect(() => {
    if (step === 3 && !antiBot) {
      refreshAntiBot();
    }
  }, [step, antiBot, refreshAntiBot]);

  // Handle field blur
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const value = field.startsWith('address.') 
      ? formData.address[field.split('.')[1] as keyof typeof formData.address]
      : formData[field as keyof FormData] as string;
    const error = validateField(field, value || '');
    setValidationErrors(prev => ({ ...prev, [field.replace('address.', '')]: error }));
  };

  // Fetch street suggestions from OpenStreetMap Nominatim
  const fetchStreetSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setStreetSuggestions([]);
      return;
    }
    
    setLoadingStreets(true);
    try {
      const city = formData.address.city || 'Antwerpen';
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `street=${encodeURIComponent(query)}&` +
        `city=${encodeURIComponent(city)}&` +
        `country=Belgium&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=5`,
        {
          headers: {
            'Accept-Language': 'nl',
            'User-Agent': 'TheGoldenOlive-OrderSystem'
          }
        }
      );
      
      const data = await response.json();
      const suggestions: StreetSuggestion[] = data
        .filter((item: { address?: { road?: string } }) => item.address?.road)
        .map((item: { display_name: string; address: { road: string } }) => ({
          display_name: item.display_name,
          street: item.address.road
        }))
        .filter((item: StreetSuggestion, index: number, self: StreetSuggestion[]) => 
          index === self.findIndex(s => s.street === item.street)
        );
      
      setStreetSuggestions(suggestions);
    } catch (err) {
      console.error('Error fetching street suggestions:', err);
      setStreetSuggestions([]);
    } finally {
      setLoadingStreets(false);
    }
  }, [formData.address.city]);

  // Debounced street search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.address.street.length >= 3 && showStreetSuggestions) {
        fetchStreetSuggestions(formData.address.street);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.address.street, showStreetSuggestions, fetchStreetSuggestions]);

  // Select street suggestion
  const selectStreetSuggestion = (suggestion: StreetSuggestion) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, street: suggestion.street }
    }));
    setShowStreetSuggestions(false);
    setStreetSuggestions([]);
  };

  // Validate step 1
  const validateStep1 = (): boolean => {
    const errors: ValidationErrors = {};
    
    errors.customer_name = validateField('customer_name', formData.customer_name);
    errors.customer_email = validateField('customer_email', formData.customer_email);
    errors.customer_phone = validateField('customer_phone', formData.customer_phone);
    
    // Filter out undefined errors
    const filteredErrors = Object.fromEntries(
      Object.entries(errors).filter(([, v]) => v !== undefined)
    );
    
    setValidationErrors(filteredErrors);
    setTouched({ customer_name: true, customer_email: true, customer_phone: true });
    
    if (Object.keys(filteredErrors).length > 0) {
      setError(Object.values(filteredErrors)[0] as string);
      return false;
    }
    
    setError(null);
    return true;
  };

  // Validate step 2
  const validateStep2 = (): boolean => {
    if (cart.deliveryType !== 'delivery') {
      setError(null);
      return true;
    }
    
    const errors: ValidationErrors = {};
    
    errors.street = validateField('address.street', formData.address.street);
    errors.house_number = validateField('address.house_number', formData.address.house_number);
    errors.postal_code = validateField('address.postal_code', formData.address.postal_code);
    errors.city = validateField('address.city', formData.address.city);
    
    // Filter out undefined errors
    const filteredErrors = Object.fromEntries(
      Object.entries(errors).filter(([, v]) => v !== undefined)
    );
    
    setValidationErrors(prev => ({ ...prev, ...filteredErrors }));
    setTouched(prev => ({ 
      ...prev, 
      'address.street': true, 
      'address.house_number': true, 
      'address.postal_code': true, 
      'address.city': true 
    }));
    
    if (Object.keys(filteredErrors).length > 0) {
      setError(Object.values(filteredErrors)[0] as string);
      return false;
    }
    
    // Check delivery warning
    if (deliveryWarning) {
      setError(deliveryWarning);
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Anti-bot check (UI + backend)
      if (!antiBot) {
        await refreshAntiBot();
      }
      const antiErr = validateField('antibot_answer', antiBotAnswer);
      if (antiErr) {
        setValidationErrors((prev) => ({ ...prev, antibot_answer: antiErr }));
        setTouched((prev) => ({ ...prev, antibot_answer: true }));
        setError(antiErr);
        setLoading(false);
        return;
      }

      // Combine country code with phone number, removing leading zero if present
      const phoneNumber = formData.customer_phone.startsWith('0') 
        ? formData.customer_phone.substring(1) 
        : formData.customer_phone;
      const fullPhone = `${countryCode}${phoneNumber}`;
      
      const orderData = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: fullPhone,
        delivery_type: cart.deliveryType,
        payment_method: paymentMethod,
        antibot_token: antiBot?.token,
        antibot_answer: parseInt(antiBotAnswer.trim(), 10),
        address: cart.deliveryType === 'delivery' ? formData.address : undefined,
        notes: formData.notes || undefined,
        items: cart.items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          notes: item.notes
        }))
      };

      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Er is een fout opgetreden');
      }

      // Clear saved checkout data after successful order
      const clearCheckoutData = () => {
        try {
          localStorage.removeItem(CHECKOUT_STORAGE_KEY);
        } catch (err) {
          console.error('Error clearing checkout data:', err);
        }
      };

      // For cash payment, go directly to success
      if (paymentMethod === 'cash') {
        clearCart();
        clearCheckoutData();
        onSuccess(data.data.order_number);
        return;
      }

      // For online payment, redirect to payment
      if (data.data.payment_url) {
        clearCart();
        clearCheckoutData();
        window.location.href = data.data.payment_url;
      } else {
        clearCart();
        clearCheckoutData();
        onSuccess(data.data.order_number);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (newStep: number) => {
    if (newStep > step) {
      if (step === 1 && !validateStep1()) return;
      if (step === 2 && !validateStep2()) return;
    }
    setStep(newStep);
  };

  return (
    <div className="checkout-container">
      {/* Processing Overlay */}
      {loading && (
        <div className="order-processing-overlay" role="status" aria-live="polite">
          <div className="order-processing-card">
            <div className="order-processing-spinner" />
            <div className="order-processing-title">
              {t('order.processing', 'Verwerken...')}
            </div>
            <div className="order-processing-subtitle">
              {t('order.processingHint', 'Even geduld — we plaatsen je bestelling veilig.')}
            </div>
            <div className="order-processing-bar" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="checkout-steps">
        <div 
          className={`checkout-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}
          onClick={() => step > 1 && setStep(1)}
          role="button"
        >
          <span className="step-number">{step > 1 ? <i className="bi bi-check"></i> : '1'}</span>
          <span className="step-label">{t('order.details', 'Gegevens')}</span>
        </div>
        <div 
          className={`checkout-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}
          onClick={() => step > 2 && setStep(2)}
          role="button"
        >
          <span className="step-number">{step > 2 ? <i className="bi bi-check"></i> : '2'}</span>
          <span className="step-label">
            {cart.deliveryType === 'delivery' 
              ? t('order.address', 'Adres') 
              : t('order.confirm', 'Bevestig')}
          </span>
        </div>
        <div className={`checkout-step ${step >= 3 ? 'active' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">{t('order.payment', 'Betaling')}</span>
        </div>
      </div>

      {/* Order Summary Card (always visible on mobile) */}
      <div className="order-summary-card">
        <h6>
          <i className="bi bi-bag me-2"></i>
          {t('order.orderSummary', 'Je Bestelling')} ({cart.items.length})
        </h6>
        <div className="d-flex justify-content-between">
          <span className="text-muted">{t('order.subtotal', 'Subtotaal')}</span>
          <span>€{subtotal.toFixed(2)}</span>
        </div>
        {cart.deliveryType === 'delivery' && cart.deliveryFee > 0 && (
          <div className="d-flex justify-content-between">
            <span className="text-muted">{t('order.deliveryFee', 'Bezorgkosten')}</span>
            <span>€{cart.deliveryFee.toFixed(2)}</span>
          </div>
        )}
        <div className="d-flex justify-content-between mt-2 pt-2 border-top">
          <strong>{t('order.total', 'Totaal')}</strong>
          <strong className="text-golden">€{total.toFixed(2)}</strong>
        </div>
      </div>

      {/* Step 1: Customer Details */}
      {step === 1 && (
        <div className="checkout-form">
          <h5>
            <i className="bi bi-person"></i>
            {t('order.yourDetails', 'Je Gegevens')}
          </h5>
          
          <div className="mb-3">
            <label className="form-label">{t('order.name', 'Naam')} *</label>
            <input
              type="text"
              className={`form-control ${validationErrors.customer_name ? 'is-invalid' : touched.customer_name && formData.customer_name ? 'is-valid' : ''}`}
              value={formData.customer_name}
              onChange={(e) => updateFormData('customer_name', e.target.value)}
              onBlur={() => handleBlur('customer_name')}
              placeholder={t('order.namePlaceholder', 'Je volledige naam')}
              autoComplete="name"
            />
            {validationErrors.customer_name && (
              <div className="invalid-feedback">{validationErrors.customer_name}</div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label">{t('order.email', 'E-mail')} *</label>
            <input
              type="email"
              className={`form-control ${validationErrors.customer_email ? 'is-invalid' : touched.customer_email && formData.customer_email ? 'is-valid' : ''}`}
              value={formData.customer_email}
              onChange={(e) => updateFormData('customer_email', e.target.value)}
              onBlur={() => handleBlur('customer_email')}
              placeholder="je@email.com"
              autoComplete="email"
            />
            {validationErrors.customer_email && (
              <div className="invalid-feedback">{validationErrors.customer_email}</div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label">{t('order.phone', 'Telefoonnummer')} *</label>
            <div className="phone-input-group">
              <select
                className="form-select country-code-select"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label={t('order.countryCode', 'Landcode')}
              >
                {COUNTRY_CODES.map((cc) => (
                  <option key={cc.code} value={cc.code}>
                    {cc.flag} {cc.code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                className={`form-control phone-number-input ${validationErrors.customer_phone ? 'is-invalid' : touched.customer_phone && formData.customer_phone ? 'is-valid' : ''}`}
                value={formData.customer_phone}
                onChange={(e) => updateFormData('customer_phone', e.target.value)}
                onBlur={() => handleBlur('customer_phone')}
                placeholder="494 12 34 56"
                autoComplete="tel-national"
              />
            </div>
            {validationErrors.customer_phone && (
              <div className="invalid-feedback d-block">{validationErrors.customer_phone}</div>
            )}
            <small className="text-muted mt-1 d-block">
              {t('order.phoneHint', 'Voer je telefoonnummer in zonder landcode')}
            </small>
          </div>

          {error && (
            <div className="alert alert-danger py-2 mb-3">
              <i className="bi bi-exclamation-circle me-2"></i>
              {error}
            </div>
          )}

          <div className="checkout-actions">
            <button className="btn btn-outline-golden" onClick={onBack}>
              <i className="bi bi-arrow-left me-2"></i>
              {t('order.back', 'Terug')}
            </button>
            <button className="btn btn-golden" onClick={() => goToStep(2)}>
              {t('order.continue', 'Verder')}
              <i className="bi bi-arrow-right ms-2"></i>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Delivery Address / Pickup Confirmation */}
      {step === 2 && (
        <div className="checkout-form">
          {cart.deliveryType === 'delivery' ? (
            <>
              <h5>
                <i className="bi bi-geo-alt"></i>
                {t('order.deliveryAddress', 'Bezorgadres')}
              </h5>

              {/* Postcode & City - First for auto-fill */}
              <div className="row g-3 mb-3">
                <div className="col-5">
                  <label className="form-label">{t('order.postalCode', 'Postcode')} *</label>
                  <input
                    type="text"
                    className={`form-control ${validationErrors.postal_code ? 'is-invalid' : touched['address.postal_code'] && formData.address.postal_code ? 'is-valid' : ''}`}
                    value={formData.address.postal_code}
                    onChange={(e) => updateFormData('address.postal_code', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    onBlur={() => handleBlur('address.postal_code')}
                    placeholder="2018"
                    maxLength={4}
                    inputMode="numeric"
                    autoComplete="postal-code"
                  />
                  {validationErrors.postal_code && (
                    <div className="invalid-feedback">{validationErrors.postal_code}</div>
                  )}
                </div>
                <div className="col-7">
                  <label className="form-label">{t('order.city', 'Stad')} *</label>
                  <input
                    type="text"
                    className={`form-control ${validationErrors.city ? 'is-invalid' : touched['address.city'] && formData.address.city ? 'is-valid' : ''}`}
                    value={formData.address.city}
                    onChange={(e) => updateFormData('address.city', e.target.value)}
                    onBlur={() => handleBlur('address.city')}
                    placeholder={t('order.cityPlaceholder', 'Wordt automatisch ingevuld')}
                    autoComplete="address-level2"
                  />
                  {validationErrors.city && (
                    <div className="invalid-feedback">{validationErrors.city}</div>
                  )}
                </div>
              </div>

              {/* Delivery Warning */}
              {deliveryWarning && (
                <div className="alert alert-warning py-2 mb-3">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {deliveryWarning}
                </div>
              )}

              {/* Street with autocomplete */}
              <div className="row g-3">
                <div className="col-8">
                  <label className="form-label">{t('order.street', 'Straat')} *</label>
                  <div className="position-relative">
                    <input
                      ref={streetInputRef}
                      type="text"
                      className={`form-control ${validationErrors.street ? 'is-invalid' : touched['address.street'] && formData.address.street ? 'is-valid' : ''}`}
                      value={formData.address.street}
                      onChange={(e) => {
                        updateFormData('address.street', e.target.value);
                        setShowStreetSuggestions(true);
                      }}
                      onFocus={() => setShowStreetSuggestions(true)}
                      onBlur={() => handleBlur('address.street')}
                      placeholder={t('order.streetPlaceholder', 'Begin met typen...')}
                      autoComplete="off"
                    />
                    {loadingStreets && (
                      <div className="position-absolute top-50 end-0 translate-middle-y me-3">
                        <span className="spinner-border spinner-border-sm text-golden"></span>
                      </div>
                    )}
                    {validationErrors.street && (
                      <div className="invalid-feedback">{validationErrors.street}</div>
                    )}
                    
                    {/* Street Suggestions Dropdown */}
                    {showStreetSuggestions && streetSuggestions.length > 0 && (
                      <div ref={suggestionsRef} className="street-suggestions">
                        {streetSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="street-suggestion-item"
                            onClick={() => selectStreetSuggestion(suggestion)}
                          >
                            <i className="bi bi-geo-alt me-2 text-golden"></i>
                            {suggestion.street}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-4">
                  <label className="form-label">{t('order.houseNumber', 'Nr.')} *</label>
                  <input
                    type="text"
                    className={`form-control ${validationErrors.house_number ? 'is-invalid' : touched['address.house_number'] && formData.address.house_number ? 'is-valid' : ''}`}
                    value={formData.address.house_number}
                    onChange={(e) => updateFormData('address.house_number', e.target.value)}
                    onBlur={() => handleBlur('address.house_number')}
                    placeholder="86"
                  />
                  {validationErrors.house_number && (
                    <div className="invalid-feedback">{validationErrors.house_number}</div>
                  )}
                </div>
              </div>

              <div className="mb-3 mt-3">
                <label className="form-label">{t('order.bus', 'Bus/Appartement')}</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.address.bus}
                  onChange={(e) => updateFormData('address.bus', e.target.value)}
                  placeholder={t('order.optional', 'Optioneel')}
                />
              </div>

              <div className="delivery-info-note mt-3">
                <i className="bi bi-info-circle text-golden me-2"></i>
                <small className="text-muted">
                  {t('order.deliveryAreaNote', 'Bezorging beschikbaar in Antwerpen en directe omgeving. Bij twijfel, neem contact op.')}
                </small>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <i className="bi bi-shop display-3 text-golden mb-3"></i>
              <h5 className="text-white">{t('order.pickupAt', 'Afhalen bij')}</h5>
              <p className="text-white mb-1">The Golden Olive</p>
              <p className="text-muted mb-3">
                Vlaamsekaai 65, 2000 Antwerpen
              </p>
              <div className="order-note justify-content-center">
                <i className="bi bi-clock"></i>
                <span>{t('order.pickupReady', 'Je krijgt een bericht wanneer je bestelling klaar is')}</span>
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="form-label">{t('order.notes', 'Opmerkingen')}</label>
            <textarea
              className="form-control"
              value={formData.notes}
              onChange={(e) => updateFormData('notes', e.target.value)}
              placeholder={t('order.notesPlaceholder', 'Speciale wensen, allergieën, etc.')}
              rows={3}
            />
          </div>

          {error && (
            <div className="alert alert-danger py-2 mt-3">
              <i className="bi bi-exclamation-circle me-2"></i>
              {error}
            </div>
          )}

          <div className="checkout-actions">
            <button className="btn btn-outline-golden" onClick={() => setStep(1)}>
              <i className="bi bi-arrow-left me-2"></i>
              {t('order.back', 'Terug')}
            </button>
            <button className="btn btn-golden" onClick={() => goToStep(3)}>
              {t('order.continue', 'Verder')}
              <i className="bi bi-arrow-right ms-2"></i>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Payment Summary */}
      {step === 3 && (
        <div className="checkout-form">
          <h5>
            <i className="bi bi-credit-card"></i>
            {t('order.paymentSummary', 'Bevestig & Betaal')}
          </h5>

          {/* Order Summary */}
          <div className="order-summary-card mb-4">
            <div className="mb-3">
              <strong className="text-golden d-block mb-2">{t('order.customer', 'Klant')}</strong>
              <span className="text-white">{formData.customer_name}</span><br />
              <span className="text-muted small">{formData.customer_email}</span><br />
              <span className="text-muted small">{countryCode} {formData.customer_phone}</span>
            </div>

            {cart.deliveryType === 'delivery' && (
              <div className="mb-3">
                <strong className="text-golden d-block mb-2">{t('order.deliveryAddress', 'Bezorgadres')}</strong>
                <span className="text-white">
                  {formData.address.street} {formData.address.house_number}
                  {formData.address.bus && ` ${formData.address.bus}`}
                </span><br />
                <span className="text-muted small">{formData.address.postal_code} {formData.address.city}</span>
              </div>
            )}

            {cart.deliveryType === 'pickup' && (
              <div className="mb-3">
                <strong className="text-golden d-block mb-2">{t('order.pickup', 'Afhalen')}</strong>
                <span className="text-white">The Golden Olive</span><br />
                <span className="text-muted small">Vlaamsekaai 65, 2000 Antwerpen</span>
              </div>
            )}

            {formData.notes && (
              <div>
                <strong className="text-golden d-block mb-2">{t('order.notes', 'Opmerkingen')}</strong>
                <span className="text-muted small">{formData.notes}</span>
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="mb-4">
            <label className="form-label">{t('order.selectPaymentMethod', 'Kies betaalmethode')}</label>
            
            {/* Online Payment Option */}
            <div 
              className={`payment-option ${paymentMethod === 'online' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('online')}
              role="button"
              tabIndex={0}
            >
              <div className="payment-option-radio">
                {paymentMethod === 'online' && <i className="bi bi-check-lg"></i>}
              </div>
              <div className="payment-option-content">
                <div className="payment-option-title">
                  <i className="bi bi-credit-card me-2"></i>
                  {t('order.onlinePayment', 'Online Betalen')}
                </div>
                <div className="payment-option-icons">
                  <img src="https://www.mollie.com/external/icons/payment-methods/ideal.svg" alt="iDEAL" height="24" />
                  <img src="https://www.mollie.com/external/icons/payment-methods/bancontact.svg" alt="Bancontact" height="24" />
                  <img src="https://www.mollie.com/external/icons/payment-methods/creditcard.svg" alt="Credit Card" height="24" />
                  <img src="https://www.mollie.com/external/icons/payment-methods/paypal.svg" alt="PayPal" height="24" />
                </div>
              </div>
            </div>
            
            {/* Cash Payment Option - Available for both pickup and delivery */}
            <div 
              className={`payment-option ${paymentMethod === 'cash' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('cash')}
              role="button"
              tabIndex={0}
            >
              <div className="payment-option-radio">
                {paymentMethod === 'cash' && <i className="bi bi-check-lg"></i>}
              </div>
              <div className="payment-option-content">
                <div className="payment-option-title">
                  <i className="bi bi-cash-coin me-2"></i>
                  {cart.deliveryType === 'pickup' 
                    ? t('order.cashPaymentPickup', 'Cash bij Afhalen')
                    : t('order.cashPaymentDelivery', 'Cash bij Levering')
                  }
                </div>
                <div className="payment-option-desc">
                  {cart.deliveryType === 'pickup'
                    ? t('order.cashPaymentPickupDesc', 'Betaal contant wanneer je je bestelling ophaalt')
                    : t('order.cashPaymentDeliveryDesc', 'Betaal contant aan de bezorger')
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Anti-bot math challenge (simple) */}
          <div className="card border-0 mb-3" style={{ background: 'rgba(0,0,0,0.18)' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="fw-semibold mb-1">
                    <i className="bi bi-shield-check me-2"></i>
                    {t('order.antiBotTitle', 'Beveiligingscontrole')}
                  </div>
                  <div className="text-muted small">
                    {t('order.antiBotHint', 'Kleine rekenoefening om robots te vermijden.')}
                  </div>
                </div>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={refreshAntiBot}>
                  <i className="bi bi-arrow-repeat me-2"></i>
                  {t('order.newExercise', 'Nieuwe oefening')}
                </button>
              </div>

              <div className="mt-3">
                <label className="form-label mb-1">
                  {antiBot?.question || t('order.loading', 'Laden...')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`form-control ${validationErrors.antibot_answer ? 'is-invalid' : touched.antibot_answer && antiBotAnswer ? 'is-valid' : ''}`}
                  value={antiBotAnswer}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d-]/g, '').slice(0, 5);
                    setAntiBotAnswer(v);
                    if (touched.antibot_answer) {
                      const msg = validateField('antibot_answer', v);
                      setValidationErrors((prev) => ({ ...prev, antibot_answer: msg }));
                    }
                  }}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, antibot_answer: true }));
                    const msg = validateField('antibot_answer', antiBotAnswer);
                    setValidationErrors((prev) => ({ ...prev, antibot_answer: msg }));
                  }}
                  placeholder={t('order.antiBotPlaceholder', 'Antwoord')}
                />
                {validationErrors.antibot_answer && (
                  <div className="invalid-feedback">{validationErrors.antibot_answer}</div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger py-2 mb-3">
              <i className="bi bi-exclamation-circle me-2"></i>
              {error}
            </div>
          )}

          <div className="checkout-actions flex-column">
            <button
              className="btn btn-golden btn-lg w-100 py-3"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  {t('order.processing', 'Verwerken...')}
                </>
              ) : paymentMethod === 'cash' ? (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  {t('order.confirmOrder', 'Bestelling Bevestigen')} - €{total.toFixed(2)}
                </>
              ) : (
                <>
                  <i className="bi bi-lock-fill me-2"></i>
                  {t('order.payNow', 'Nu Betalen')} - €{total.toFixed(2)}
                </>
              )}
            </button>
            <button 
              className="btn btn-outline-golden w-100 mt-3" 
              onClick={() => setStep(2)}
              disabled={loading}
            >
              <i className="bi bi-arrow-left me-2"></i>
              {t('order.back', 'Terug')}
            </button>
          </div>

          <p className="text-center text-muted small mt-3">
            {paymentMethod === 'online' ? (
              <>
                <i className="bi bi-shield-check me-1"></i>
                {t('order.securePayment', 'Veilige betaling via Mollie')}
              </>
            ) : (
              <>
                <i className="bi bi-info-circle me-1"></i>
                {cart.deliveryType === 'pickup'
                  ? t('order.cashInfoPickup', 'Zorg ervoor dat je gepast geld meebrengt')
                  : t('order.cashInfoDelivery', 'Zorg ervoor dat je gepast geld klaar hebt voor de bezorger')
                }
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default Checkout;
