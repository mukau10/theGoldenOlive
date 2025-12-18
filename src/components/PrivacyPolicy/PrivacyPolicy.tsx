import { useTranslation } from 'react-i18next';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';

const PrivacyPolicy = () => {
  const { t } = useTranslation();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <Header />
      <main className="pt-24 pb-16 bg-dark-custom">
        <div className="container-fluid px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-5" data-aos="fade-up">
              <h1
                className="display-4 fw-bold text-golden mb-4"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {t('privacyPolicy.title')}
              </h1>
              <p className="fs-5 text-white-50">
                {t('privacyPolicy.lastUpdated')}: <span className="text-warning">{t('privacyPolicy.lastUpdatedDate')}</span>
              </p>
              <div className="mx-auto mt-3 bg-warning rounded-pill" style={{ width: '96px', height: '4px' }}></div>
            </div>

            {/* Content */}
            <div
              className="bg-black border border-warning rounded-3 p-4 p-lg-5 shadow-lg"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              {/* Introduction */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">1. Inleiding</h2>
                <div className="text-white-50 lh-lg">
                  <p>
                    The Golden Olive (hierna "wij", "ons", "restaurant") respecteert uw privacy en is toegewijd aan het
                    beschermen van uw persoonlijke gegevens. Dit privacybeleid legt uit hoe wij uw persoonlijke informatie
                    verzamelen, gebruiken en beschermen wanneer u onze website bezoekt of onze diensten gebruikt.
                  </p>
                  <p>
                    Dit beleid is opgesteld in overeenstemming met de Algemene Verordening Gegevensbescherming (AVG/GDPR)
                    en de Belgische wetgeving inzake gegevensbescherming.
                  </p>
                </div>
              </section>

              {/* Contact Information */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">2. Contactgegevens</h2>
                <div className="text-white-50 lh-lg">
                  <p>
                    <strong>The Golden Olive</strong>
                  </p>
                  <p>Vlaamsekaai 65, 2000 Antwerpen, België</p>
                  <p>
                    Telefoon: <a href="tel:+32494194397" className="text-warning text-decoration-none">+32 494 19 43 97</a>
                  </p>
                  <p>BTW-nummer: BE0738909475</p>
                  <p>Voor vragen over dit privacybeleid kunt u contact met ons opnemen via bovenstaande gegevens.</p>
                </div>
              </section>

              {/* Data Collection */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">3. Welke gegevens verzamelen wij?</h2>
                <div className="text-white-50 lh-lg">
                  <h3 className="h5 fw-semibold text-white mb-2">3.1 Automatisch verzamelde gegevens</h3>
                  <p>Wanneer u onze website bezoekt, verzamelen wij automatisch:</p>
                  <ul className="list-disc ms-4 mb-3">
                    <li>IP-adres</li>
                    <li>Browsertype en -versie</li>
                    <li>Besturingssysteem</li>
                    <li>Bezochte pagina's en tijdstip van bezoek</li>
                    <li>Verwijzende website</li>
                    <li>Apparaatinformatie</li>
                  </ul>

                  <h3 className="h5 fw-semibold text-white mb-2 mt-4">3.2 Gegevens die u verstrekt</h3>
                  <p>Wij kunnen de volgende gegevens verzamelen wanneer u:</p>
                  <ul className="list-disc ms-4 mb-3">
                    <li>Contact met ons opneemt via telefoon of e-mail</li>
                    <li>Een reservering maakt</li>
                    <li>Zich aanmeldt voor onze nieuwsbrief (indien van toepassing)</li>
                    <li>Feedback achterlaat</li>
                  </ul>
                  <p>Deze gegevens kunnen omvatten: naam, telefoonnummer, e-mailadres, voorkeuren en opmerkingen.</p>
                </div>
              </section>

              {/* Data Usage */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">4. Hoe gebruiken wij uw gegevens?</h2>
                <div className="text-white-50 lh-lg">
                  <p className="mb-3">Wij gebruiken uw persoonlijke gegevens voor de volgende doeleinden:</p>
                  <ul className="list-disc ms-4">
                    <li>Het verwerken van reserveringen en het verlenen van onze diensten</li>
                    <li>Het beantwoorden van uw vragen en verzoeken</li>
                    <li>Het verbeteren van onze website en diensten</li>
                    <li>Het naleven van wettelijke verplichtingen</li>
                    <li>Het beschermen van onze legitieme belangen</li>
                    <li>Marketing communicatie (alleen met uw toestemming)</li>
                  </ul>
                </div>
              </section>

              {/* Legal Basis */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">5. Rechtsgrondslag voor verwerking</h2>
                <div className="text-white-50 lh-lg">
                  <p>Wij verwerken uw persoonlijke gegevens op basis van:</p>
                  <ul className="list-disc ms-4">
                    <li>
                      <strong>Contractuele noodzaak:</strong> Voor het uitvoeren van reserveringen en dienstverlening
                    </li>
                    <li>
                      <strong>Toestemming:</strong> Voor marketing communicatie en nieuwsbrieven
                    </li>
                    <li>
                      <strong>Legitiem belang:</strong> Voor website verbetering en veiligheid
                    </li>
                    <li>
                      <strong>Wettelijke verplichting:</strong> Voor boekhouding en belastingdoeleinden
                    </li>
                  </ul>
                </div>
              </section>

              {/* Data Sharing */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">6. Delen van gegevens</h2>
                <div className="text-white-50 lh-lg">
                  <p>Wij verkopen, verhuren of delen uw persoonlijke gegevens niet met derden, behalve:</p>
                  <ul className="list-disc ms-4">
                    <li>Met uw uitdrukkelijke toestemming</li>
                    <li>Wanneer wettelijk verplicht (bijv. aan belastingdiensten)</li>
                    <li>Met dienstverleners die ons helpen bij onze bedrijfsvoering (onder strikte geheimhoudingsovereenkomsten)</li>
                    <li>In geval van bedrijfsovername of fusie</li>
                  </ul>
                </div>
              </section>

              {/* Data Security */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">7. Gegevensbeveiliging</h2>
                <div className="text-white-50 lh-lg">
                  <p>
                    Wij nemen passende technische en organisatorische maatregelen om uw persoonlijke gegevens te beschermen
                    tegen ongeautoriseerde toegang, wijziging, openbaarmaking of vernietiging.
                  </p>
                  <p>
                    Hoewel wij ons best doen om uw gegevens te beschermen, kunnen wij geen absolute veiligheid garanderen
                    van informatie die via internet wordt verzonden.
                  </p>
                </div>
              </section>

              {/* Data Retention */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">8. Bewaartermijnen</h2>
                <div className="text-white-50 lh-lg">
                  <p>Wij bewaren uw persoonlijke gegevens niet langer dan noodzakelijk voor de doeleinden waarvoor zij zijn verzameld:</p>
                  <ul className="list-disc ms-4">
                    <li>
                      <strong>Reserveringsgegevens:</strong> 1 jaar na uw laatste bezoek
                    </li>
                    <li>
                      <strong>Contactgegevens:</strong> Tot u zich uitschrijft of bezwaar maakt
                    </li>
                    <li>
                      <strong>Websitelogboeken:</strong> Maximaal 12 maanden
                    </li>
                    <li>
                      <strong>Boekhoudgegevens:</strong> 7 jaar (wettelijke verplichting)
                    </li>
                  </ul>
                </div>
              </section>

              {/* Cookies */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">9. Cookies</h2>
                <div className="text-white-50 lh-lg">
                  <p>
                    Onze website gebruikt cookies om uw ervaring te verbeteren. Cookies zijn kleine tekstbestanden die op
                    uw apparaat worden opgeslagen.
                  </p>
                  <h3 className="h5 fw-semibold text-white mb-2 mt-3">Soorten cookies die wij gebruiken:</h3>
                  <ul className="list-disc ms-4 mb-3">
                    <li>
                      <strong>Noodzakelijke cookies:</strong> Voor het functioneren van de website
                    </li>
                    <li>
                      <strong>Analytische cookies:</strong> Voor het analyseren van websitegebruik
                    </li>
                    <li>
                      <strong>Functionele cookies:</strong> Voor het onthouden van uw voorkeuren
                    </li>
                  </ul>
                  <p>
                    U kunt cookies uitschakelen in uw browserinstellingen, maar dit kan de functionaliteit van onze website
                    beïnvloeden.
                  </p>
                </div>
              </section>

              {/* Your Rights */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">10. Uw rechten</h2>
                <div className="text-white-50 lh-lg">
                  <p>Onder de AVG/GDPR heeft u de volgende rechten:</p>
                  <ul className="list-disc ms-4">
                    <li>
                      <strong>Recht op informatie:</strong> U heeft het recht om te weten welke gegevens wij van u verwerken
                    </li>
                    <li>
                      <strong>Recht op inzage:</strong> U kunt een kopie opvragen van uw persoonlijke gegevens
                    </li>
                    <li>
                      <strong>Recht op rectificatie:</strong> U kunt onjuiste gegevens laten corrigeren
                    </li>
                    <li>
                      <strong>Recht op wissing:</strong> U kunt verzoeken om verwijdering van uw gegevens
                    </li>
                    <li>
                      <strong>Recht op beperking:</strong> U kunt de verwerking van uw gegevens laten beperken
                    </li>
                    <li>
                      <strong>Recht op overdraagbaarheid:</strong> U kunt uw gegevens in een gestructureerd formaat opvragen
                    </li>
                    <li>
                      <strong>Recht van bezwaar:</strong> U kunt bezwaar maken tegen bepaalde verwerkingen
                    </li>
                    <li>
                      <strong>Recht om toestemming in te trekken:</strong> Wanneer verwerking gebaseerd is op toestemming
                    </li>
                  </ul>
                  <p className="mt-3">
                    Om deze rechten uit te oefenen, kunt u contact met ons opnemen via de bovenstaande contactgegevens.
                  </p>
                </div>
              </section>

              {/* Complaints */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">11. Klachten</h2>
                <div className="text-white-50 lh-lg">
                  <p>
                    Als u niet tevreden bent over hoe wij uw persoonlijke gegevens verwerken, heeft u het recht om een
                    klacht in te dienen bij de Belgische Gegevensbeschermingsautoriteit (GBA).
                  </p>
                  <p>
                    <strong>Gegevensbeschermingsautoriteit</strong>
                    <br />
                    Drukpersstraat 35, 1000 Brussel
                    <br />
                    Tel: +32 (0)2 274 48 00
                    <br />
                    E-mail: contact@apd-gba.be
                    <br />
                    Website: www.gegevensbeschermingsautoriteit.be
                  </p>
                </div>
              </section>

              {/* Third Party Services */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">12. Diensten van derden</h2>
                <div className="text-white-50 lh-lg">
                  <p>
                    Onze website kan links bevatten naar websites van derden. Wij zijn niet verantwoordelijk voor het
                    privacybeleid van deze externe websites.
                  </p>
                  <p>Wij kunnen ook gebruik maken van diensten van derden zoals:</p>
                  <ul className="list-disc ms-4">
                    <li>Google Maps (voor locatieweergave)</li>
                    <li>Social media platforms (Facebook, Instagram)</li>
                    <li>Webhosting providers</li>
                  </ul>
                  <p>Deze diensten hebben hun eigen privacybeleid dat u dient te raadplegen.</p>
                </div>
              </section>

              {/* Minors */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">13. Minderjarigen</h2>
                <div className="text-white-50 lh-lg">
                  <p>
                    Onze diensten zijn niet specifiek gericht op personen onder de 16 jaar. Wij verzamelen niet bewust
                    persoonlijke gegevens van kinderen onder de 16 jaar zonder toestemming van ouders of voogden.
                  </p>
                </div>
              </section>

              {/* Changes */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">14. Wijzigingen in dit beleid</h2>
                <div className="text-white-50 lh-lg">
                  <p>
                    Wij behouden ons het recht voor om dit privacybeleid te wijzigen. Wijzigingen worden gepubliceerd op
                    deze pagina met een nieuwe datum van "laatst bijgewerkt".
                  </p>
                  <p>
                    Wij raden u aan dit beleid regelmatig te controleren om op de hoogte te blijven van eventuele wijzigingen.
                  </p>
                </div>
              </section>

              {/* Contact */}
              <section className="mb-5">
                <h2 className="h3 fw-bold text-golden mb-3">15. Contact</h2>
                <div className="text-white-50 lh-lg">
                  <p>
                    Voor vragen over dit privacybeleid of over hoe wij uw persoonlijke gegevens verwerken, kunt u contact
                    met ons opnemen:
                  </p>
                  <div className="mt-4 p-4 bg-dark-light rounded border border-warning">
                    <p>
                      <strong>The Golden Olive</strong>
                    </p>
                    <p>Vlaamsekaai 65, 2000 Antwerpen</p>
                    <p>
                      Telefoon: <a href="tel:+32494194397" className="text-warning text-decoration-none">+32 494 19 43 97</a>
                    </p>
                    <p>Openingsuren: Maandag - Zondag: 17:00 - 23:00</p>
                  </div>
                </div>
              </section>

              {/* Back to Home Button */}
              <div className="text-center mt-5">
                <button
                  onClick={scrollToTop}
                  className="btn btn-outline-warning me-3 rounded-pill px-4"
                  aria-label={t('common.backToTop')}
                >
                  <i className="bi bi-arrow-up me-2"></i>{t('common.backToTop')}
                </button>
                <a
                  href="#hero"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = '/';
                  }}
                  className="btn btn-warning rounded-pill px-4"
                >
                  <i className="bi bi-house-door me-2"></i>{t('common.backToHome')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;

