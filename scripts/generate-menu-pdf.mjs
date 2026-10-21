/**
 * Bouwt een zelfstandige, mobiel leesbare menukaart en een A4-PDF.
 * Bron: public/data/menu.json
 *
 *   node scripts/generate-menu-pdf.mjs
 *
 * Output:
 *   public/menukaart.html   — responsive pagina (telefoon + desktop)
 *   public/menu.pdf         — afdruk van het volledige menu
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const menuPath = path.join(root, 'public/data/menu.json');
const logoPath = path.join(root, 'public/img/logo.png');
const htmlPath = path.join(root, 'public/menukaart.html');
const pdfPath = path.join(root, 'public/menu.pdf');

const FONT_FACES = [
  {
    family: 'Cormorant Garamond',
    style: 'italic',
    weight: '500',
    url: 'https://fonts.gstatic.com/s/cormorantgaramond/v21/co3smX5slCNuHLi8bLeY9MK7whWMhyjYrGFEsdtdc62E6zd5wDD-iNM8A_6pUKz9.woff2',
  },
  {
    family: 'Cormorant Garamond',
    style: 'normal',
    weight: '500 700',
    url: 'https://fonts.gstatic.com/s/cormorantgaramond/v21/co3bmX5slCNuHLi8bLeY9MK7whWMhyjYqXtKky2F7g.woff2',
  },
  {
    family: 'Outfit',
    style: 'normal',
    weight: '400 600',
    url: 'https://fonts.gstatic.com/s/outfit/v15/QGYvz_MVcBeNP4NJtEtqUYLknw.woff2',
  },
];

const CATEGORIES = [
  { key: 'voorgerechten', title: 'Voorgerechten', short: 'Start', lede: 'Om de maaltijd mee te beginnen.' },
  { key: 'burgers', title: 'Burgers', short: 'Burgers', lede: 'Inclusief bijgerecht. Kies friet maison of kroketjes.' },
  { key: 'platter', title: 'Platter', short: 'Platter', lede: 'Inclusief bijgerecht. Kies friet maison of kroketjes.' },
  { key: 'loaded-scoops', title: 'Loaded Scoops', short: 'Scoops', lede: 'Frietjes met mac & cheese en toppings.' },
  { key: 'mixed-bbq', title: 'Mix BBQ', short: 'BBQ', lede: 'Mix Grill is voor één persoon. Mix BBQ Boil is een grote schotel vanaf 2 personen.' },
  { key: 'spareribs', title: 'Spareribs', short: 'Ribs', lede: 'Inclusief bijgerecht. Kies friet maison, kroketjes, krieltjes of mac and cheese.' },
  { key: 'kindermenu', title: 'Kindermenu', short: 'Kids', lede: 'Inclusief bijgerecht. Kies friet maison of kroketjes.' },
  { key: 'supplementen', title: 'Sides & sauzen', short: 'Sides', lede: 'Los te bestellen, bovenop het bijgerecht dat al bij je gerecht zit.' },
  { key: 'desserten', title: 'Desserten', short: 'Dessert', lede: 'Zoet afsluiten.' },
  { key: 'mocktails', title: 'Mocktails', short: 'Mocktails', lede: 'Alcoholvrij.' },
  { key: 'frisdranken', title: 'Frisdranken', short: 'Fris', lede: '' },
  { key: 'warme-dranken', title: 'Warme dranken', short: 'Warm', lede: '' },
];

const ALLERGEN_LABELS = {
  G: 'Gluten',
  M: 'Melk',
  E: 'Eieren',
  So: 'Soja',
  Se: 'Sesam',
  Mu: 'Mosterd',
  Mo: 'Weekdieren',
  S: 'Schaaldieren',
  F: 'Vis',
  N: 'Noten',
  P: 'Pinda',
  C: 'Selderij',
  L: 'Lupine',
  Su: 'Sulfiet',
};

const SKIP_DESCRIPTIONS = new Set([
  'kies deze side extra bij je burger of platter.',
  'warme saus.',
  'koude saus.',
]);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPrice(price) {
  const amount = parseFloat(String(price).replace('€', '').replace(',', '.').trim());
  if (Number.isNaN(amount)) return escapeHtml(price);
  return `€${amount.toFixed(2).replace('.', ',')}`;
}

function supplementGroup(item) {
  const description = (item.description || '').toLowerCase();
  if (description.includes('warme')) return 'Warme sauzen';
  if (description.includes('koude')) return 'Koude sauzen';
  return 'Bijgerechten';
}

function visibleDescription(item) {
  const description = (item.description || '').trim();
  if (!description || SKIP_DESCRIPTIONS.has(description.toLowerCase())) return '';
  return description;
}

function allergenNames(item) {
  const seen = new Set();
  const names = [];
  for (const allergen of item.allergens || []) {
    const label = ALLERGEN_LABELS[allergen.code] || allergen.type || allergen.code;
    if (!label || seen.has(label)) continue;
    seen.add(label);
    names.push(label);
  }
  return names;
}

function renderItem(item) {
  const description = visibleDescription(item);
  const allergens = allergenNames(item);
  return `<article class="item">
        <h3 class="name">${escapeHtml(item.name)}</h3>
        <p class="price">${formatPrice(item.price)}</p>
        ${description ? `<p class="desc">${escapeHtml(description)}</p>` : ''}
        ${allergens.length ? `<p class="allergens">${allergens.map(escapeHtml).join(' · ')}</p>` : ''}
      </article>`;
}

function renderCategory(category, items) {
  let body;
  if (category.key === 'supplementen') {
    const order = ['Bijgerechten', 'Warme sauzen', 'Koude sauzen'];
    body = order
      .map((title) => {
        const group = items.filter((item) => supplementGroup(item) === title);
        if (!group.length) return '';
        return `<h3 class="subhead">${title}</h3>${group.map(renderItem).join('\n')}`;
      })
      .join('\n');
  } else {
    body = items.map(renderItem).join('\n');
  }

  return `<section class="cat" id="${escapeHtml(category.key)}">
      <header class="cat-head">
        <h2>${escapeHtml(category.title)}</h2>
        <div class="rule" aria-hidden="true"></div>
        ${category.lede ? `<p class="lede">${escapeHtml(category.lede)}</p>` : ''}
      </header>
      ${body}
    </section>`;
}

async function fontCss() {
  const faces = await Promise.all(
    FONT_FACES.map(async (face) => {
      const response = await fetch(face.url);
      if (!response.ok) throw new Error(`Font download mislukt: ${face.url}`);
      const base64 = Buffer.from(await response.arrayBuffer()).toString('base64');
      return `@font-face{font-family:'${face.family}';font-style:${face.style};font-weight:${face.weight};font-display:swap;src:url(data:font/woff2;base64,${base64}) format('woff2');}`;
    })
  );
  return faces.join('\n');
}

function buildHtml({ fontCssText, logoSrc, sections, nav }) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#4c6971">
  <meta name="description" content="Menukaart van The Golden Olive in Antwerpen. Burgers, spareribs, mix BBQ, desserts en dranken.">
  <title>Menukaart · The Golden Olive</title>
  <style>
    ${fontCssText}
    :root {
      --slate: #4c6971;
      --ink: #1c2426;
      --muted: #5e5852;
      --line: rgba(76, 105, 113, 0.16);
      --gold: #8d5e28;
      --paper: #f7f3eb;
      --sheet: #fbf8f3;
      --serif: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
      --sans: Outfit, 'Segoe UI', sans-serif;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; scroll-padding-top: 64px; }
    body {
      margin: 0;
      color: var(--ink);
      background: #e6e0d4;
      font-family: var(--sans);
      font-weight: 400;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }
    .sheet {
      width: min(760px, 100%);
      margin: 0 auto;
      background: var(--sheet);
      min-height: 100vh;
    }
    .hero {
      background: var(--slate);
      color: #f6f1e6;
      text-align: center;
      padding: calc(22px + env(safe-area-inset-top)) 20px 26px;
    }
    .logo {
      width: min(250px, 72vw);
      height: auto;
      display: block;
      margin: 0 auto 2px;
    }
    .kicker {
      margin: 0;
      font-family: var(--serif);
      font-style: italic;
      font-weight: 500;
      font-size: clamp(1.7rem, 5vw, 2.15rem);
      letter-spacing: 0.01em;
    }
    .tagline {
      margin: 4px 0 0;
      font-size: 0.92rem;
      letter-spacing: 0.04em;
      color: rgba(246, 241, 230, 0.82);
    }
    .facts {
      list-style: none;
      margin: 16px 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      font-size: 0.92rem;
      color: rgba(246, 241, 230, 0.92);
    }
    .facts a { color: inherit; text-decoration: none; }
    .pdf-link {
      display: inline-block;
      margin-top: 16px;
      padding: 9px 14px;
      border: 1px solid rgba(246, 241, 230, 0.45);
      border-radius: 999px;
      color: #f6f1e6;
      text-decoration: none;
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .toc {
      position: sticky;
      top: 0;
      z-index: 3;
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 10px 14px;
      background: rgba(251, 248, 243, 0.94);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--line);
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .toc::-webkit-scrollbar { display: none; }
    .toc a {
      flex: 0 0 auto;
      text-decoration: none;
      color: #314448;
      background: #fff;
      border: 1px solid #e3d8c6;
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 0.75rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      line-height: 1;
    }
    .toc a.is-active {
      background: var(--slate);
      border-color: var(--slate);
      color: #f6f1e6;
    }
    main { padding: 8px 18px 12px; }
    .cat { padding-top: 8px; scroll-margin-top: 64px; }
    .cat-head { padding-top: 22px; }
    .cat h2 {
      margin: 0;
      font-family: var(--serif);
      font-weight: 600;
      font-size: clamp(1.9rem, 6vw, 2.45rem);
      line-height: 1;
      letter-spacing: 0.01em;
      color: #24383d;
    }
    .rule {
      width: 52px;
      height: 2px;
      margin: 10px 0 8px;
      background: linear-gradient(90deg, #d7b36a, #8d5e28);
    }
    .lede {
      margin: 0 0 4px;
      color: var(--muted);
      font-size: 0.95rem;
    }
    .subhead {
      margin: 18px 0 0;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--gold);
    }
    .item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      column-gap: 16px;
      row-gap: 3px;
      padding: 13px 0;
      border-bottom: 1px solid var(--line);
    }
    .name {
      margin: 0;
      font-family: var(--serif);
      font-weight: 600;
      font-size: clamp(1.22rem, 4.4vw, 1.48rem);
      line-height: 1.12;
    }
    .price {
      margin: 0;
      padding-top: 2px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--gold);
      font-size: 1rem;
      white-space: nowrap;
    }
    .desc, .allergens {
      grid-column: 1 / -1;
      margin: 0;
    }
    .desc {
      color: var(--muted);
      font-size: 0.95rem;
    }
    .allergens {
      color: #8a8176;
      font-size: 0.75rem;
      letter-spacing: 0.01em;
    }
    .notes {
      margin-top: 28px;
      padding: 18px 0 8px;
      border-top: 1px solid var(--line);
    }
    .notes h2 {
      margin: 0 0 8px;
      font-family: var(--serif);
      font-size: 1.6rem;
      font-weight: 600;
    }
    .notes p, .colophon p { margin: 0 0 8px; color: var(--muted); font-size: 0.9rem; }
    .legend {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 16px;
      margin: 10px 0 0;
      padding: 0;
      list-style: none;
      font-size: 0.86rem;
    }
    .legend b {
      display: inline-block;
      min-width: 1.8em;
      font-weight: 600;
      color: var(--ink);
    }
    .colophon {
      padding: 8px 18px calc(22px + env(safe-area-inset-bottom));
      text-align: center;
    }
    .colophon a { color: var(--slate); }
    @media (min-width: 760px) {
      body { padding: 28px 16px 40px; }
      .sheet {
        min-height: auto;
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 18px 50px rgba(40, 32, 20, 0.12);
      }
      main, .colophon { padding-left: 36px; padding-right: 36px; }
      .toc { padding-left: 28px; padding-right: 28px; }
      .legend { grid-template-columns: 1fr 1fr 1fr; }
      .hero { padding-top: 28px; }
      .facts { flex-direction: row; flex-wrap: wrap; gap: 6px 16px; font-size: 0.86rem; }
    }
    @media print {
      @page { size: A4; margin: 13mm 14mm 16mm; }
      html { scroll-behavior: auto; }
      body { background: white; padding: 0; }
      .sheet { width: auto; max-width: none; box-shadow: none; border-radius: 0; }
      .toc, .pdf-link { display: none !important; }
      .hero, .rule, .toc a.is-active {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .hero { padding: 10mm 8mm 7mm; }
      .facts { flex-direction: row; flex-wrap: wrap; gap: 2mm 5mm; font-size: 9.5pt; }
      .logo { width: 52mm; }
      .kicker { font-size: 22pt; }
      main, .colophon { padding: 0; }
      .cat-head { padding-top: 5mm; break-after: avoid; break-inside: avoid; }
      .cat h2 { font-size: 20pt; }
      .subhead { break-after: avoid; }
      .item { break-inside: avoid; padding: 2.4mm 0; }
      .name { font-size: 13.5pt; }
      .price { font-size: 11pt; }
      .desc { font-size: 9.5pt; }
      .allergens { font-size: 8pt; }
      .notes { break-inside: avoid; }
      a { text-decoration: none; color: inherit; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="hero">
      <img class="logo" src="${logoSrc}" alt="The Golden Olive">
      <p class="kicker">Menukaart</p>
      <p class="tagline">Authentieke smaken, warme gastvrijheid</p>
      <ul class="facts">
        <li>Vlaamsekaai 65, 2000 Antwerpen</li>
        <li>Maandag – zondag · 17:00 – 23:00</li>
        <li><a href="tel:+32494194397">+32 494 19 43 97</a></li>
      </ul>
      <a class="pdf-link" href="menu.pdf">Download PDF</a>
    </header>
    <nav class="toc" aria-label="Categorieën">
      ${nav}
    </nav>
    <main>
      ${sections}
      <section class="notes" id="allergenen">
        <h2>Allergenen</h2>
        <p>Onder elk gerecht staan de allergenen voluit. Meld een allergie of dieetwens bij het bestellen. De kaart kan wijzigen.</p>
        <ul class="legend">
          ${Object.entries(ALLERGEN_LABELS)
            .filter(([code]) => usedAllergens.has(code))
            .map(([code, label]) => `<li><b>${escapeHtml(code)}</b> ${escapeHtml(label)}</li>`)
            .join('')}
        </ul>
      </section>
    </main>
    <footer class="colophon">
      <p>Prijzen in euro, inclusief btw. BTW BE0738909475</p>
      <p><a href="https://the-goldenolive.be">the-goldenolive.be</a></p>
    </footer>
  </div>
  <script>
    (function () {
      var links = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
      var sections = links.map(function (link) {
        return document.querySelector(link.getAttribute('href'));
      }).filter(Boolean);
      if (!('IntersectionObserver' in window) || !sections.length) return;
      var nav = document.querySelector('.toc');
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = '#' + entry.target.id;
          links.forEach(function (link) {
            var active = link.getAttribute('href') === id;
            link.classList.toggle('is-active', active);
            if (active && nav) {
              var left = link.offsetLeft - nav.clientWidth / 2 + link.clientWidth / 2;
              nav.scrollTo({ left: left, behavior: 'smooth' });
            }
          });
        });
      }, { rootMargin: '-30% 0px -55% 0px', threshold: 0.01 });
      sections.forEach(function (section) { observer.observe(section); });
    })();
  </script>
</body>
</html>
`;
}

const usedAllergens = new Set();

function collectAllergens(items) {
  for (const item of items) {
    for (const allergen of item.allergens || []) usedAllergens.add(allergen.code);
  }
}

async function main() {
  const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
  const categories = CATEGORIES.filter((category) => Array.isArray(menu[category.key]));
  const known = new Set(categories.map((category) => category.key));
  for (const key of Object.keys(menu)) {
    if (!known.has(key) && Array.isArray(menu[key])) {
      categories.push({ key, title: key, short: key, lede: '' });
    }
  }

  let dishCount = 0;
  const sections = categories
    .map((category) => {
      const items = menu[category.key] || [];
      dishCount += items.length;
      collectAllergens(items);
      return renderCategory(category, items);
    })
    .join('\n');

  const nav = categories
    .map((category) => `<a href="#${escapeHtml(category.key)}">${escapeHtml(category.short)}</a>`)
    .join('');

  const logoSrc = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
  const html = buildHtml({
    fontCssText: await fontCss(),
    logoSrc,
    sections,
    nav,
  });

  fs.writeFileSync(htmlPath, html);
  console.log(`HTML geschreven: ${htmlPath} (${dishCount} gerechten)`);

  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!fs.existsSync(chrome)) {
    console.log('Chrome niet gevonden, PDF overgeslagen.');
    return;
  }

  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    '--virtual-time-budget=3000',
    `--print-to-pdf=${pdfPath}`,
    `file://${htmlPath}`,
  ], { stdio: 'inherit' });

  const stat = fs.statSync(pdfPath);
  console.log(`PDF geschreven: ${pdfPath} (${Math.round(stat.size / 1024)} KB)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
