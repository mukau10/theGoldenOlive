# Cleanup Guide - Files to Remove After Migration

After successfully migrating to the React app, you can safely remove the following files and folders from the root directory:

## Files to Remove

### 1. Old HTML Files
- ✅ `index.html` - Replaced by React app
- ✅ `privacy-policy.html` - Now a React component (`/privacy-policy`)
- ✅ `allergie.html` - Now a React component (`/allergenen`)

### 2. PHP Dependencies (Not needed for React)
- ✅ `composer.json` - PHP dependency management
- ✅ `composer.lock` - PHP lock file
- ✅ `vendor/` - PHP dependencies (PHPMailer, etc.)
  - Note: PHPMailer functionality is now in `/api` folder

### 3. Old Assets (Already copied to React app)
- ✅ `assets/` - All assets have been copied to `/react-app/public/`
  - `assets/img/` → `/react-app/public/img/`
  - `assets/data/` → `/react-app/public/data/`
  - `assets/css/style.css` → Styles integrated into React app
  - `assets/js/main.js` → Functionality converted to React components
  - `assets/vendor/` → Dependencies now via npm

## Files to Keep

### Essential Files
- ✅ `robots.txt` - ✅ **COPIED** to `/react-app/public/robots.txt`
- ✅ `sitemap.xml` - ✅ **COPIED** to `/react-app/public/sitemap.xml`
- ✅ `README.md` - Project documentation (keep or update)

### React App
- ✅ `react-app/` - **KEEP** - This is your new application

## Migration Checklist

### ✅ Completed
- [x] All images copied to `/react-app/public/img/`
- [x] Menu JSON copied to `/react-app/public/data/menu.json`
- [x] Allergens JSON created at `/react-app/public/data/allergens.json`
- [x] robots.txt copied to `/react-app/public/robots.txt`
- [x] sitemap.xml copied to `/react-app/public/sitemap.xml`
- [x] Privacy Policy converted to React component
- [x] Allergen Info converted to React component
- [x] Routing set up for all pages
- [x] PHPMailer used in PHP API (`/api/contact.php`)
- [x] All functionality migrated to React

### Files Now in React App
- ✅ All images: `/react-app/public/img/`
- ✅ Menu data: `/react-app/public/data/menu.json`
- ✅ Allergens data: `/react-app/public/data/allergens.json`
- ✅ robots.txt: `/react-app/public/robots.txt`
- ✅ sitemap.xml: `/react-app/public/sitemap.xml`
- ✅ Privacy Policy: `/react-app/src/components/PrivacyPolicy/PrivacyPolicy.tsx`
- ✅ Allergen Info: `/react-app/src/components/AllergenInfo/AllergenInfo.tsx`

## Safe Removal Commands

**⚠️ WARNING: Only run these after verifying the React app works correctly!**

```bash
# Backup first (recommended)
cd /Users/mukadash/Documents/GitHub/theGoldenOlive
mkdir backup
cp -r index.html privacy-policy.html allergie.html assets vendor composer.json composer.lock backup/

# Remove old files (after verification)
rm index.html
rm privacy-policy.html
rm allergie.html
rm -rf assets/
rm -rf vendor/
rm composer.json
rm composer.lock
```

## What's New in React App

### New Structure
```
react-app/
├── public/
│   ├── robots.txt          ✅ From root
│   ├── sitemap.xml         ✅ From root
│   ├── img/                ✅ From assets/img/
│   └── data/               ✅ From assets/data/ + new allergens.json
├── src/
│   ├── components/
│   │   ├── PrivacyPolicy/  ✅ New React component
│   │   └── AllergenInfo/   ✅ New React component
│   └── ...
└── api/                    ✅ PHP email API
```

### New Routes
- `/` - Home page (all sections)
- `/privacy-policy` - Privacy Policy page
- `/allergenen` - Allergen Information page

## Verification Steps

Before removing old files:

1. ✅ Test React app: `cd react-app && npm run dev`
2. ✅ Test all routes work: `/`, `/privacy-policy`, `/allergenen`
3. ✅ Verify images load correctly
4. ✅ Verify menu loads from JSON
5. ✅ Test contact form (if server is running)
6. ✅ Check robots.txt and sitemap.xml are accessible
7. ✅ Verify SEO meta tags are present

## Notes

- The React app is now the **primary application**
- Old HTML files are no longer needed
- PHP dependencies (PHPMailer) are used in `/api` folder
- All functionality is preserved and improved
- Better performance with React
- Better SEO with proper routing

