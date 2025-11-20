# Quick Start Guide

## 🚀 Getting Started

1. **Navigate to the React app directory:**
   ```bash
   cd react-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   The app will automatically open at `http://localhost:3000`

## 📦 Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🎨 Color System

All colors are defined in `src/colors.tsx`. The color scheme is maintained:
- **Golden**: `#ffc107` (primary)
- **Golden Light**: `#ffcd39`
- **Golden Dark**: `#e6ac00`
- **Dark Custom**: `#000000`
- **Dark Light**: `#212529`

## 📁 Project Structure

- `src/components/` - React components
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions
- `src/styles/` - Custom CSS styles
- `public/img/` - Images
- `public/data/` - JSON data files

## ✨ Features

- ✅ Modern React 19 with TypeScript
- ✅ Bootstrap 5 for styling
- ✅ Glassmorphism effects
- ✅ Smooth animations (AOS)
- ✅ Responsive design
- ✅ Video autoplay on mobile
- ✅ Menu filtering system
- ✅ Allergen information popups

## 🔧 Troubleshooting

If you encounter issues:

1. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check that assets are in place:**
   - Images should be in `public/img/`
   - Menu data should be in `public/data/menu.json`

3. **Verify TypeScript compilation:**
   ```bash
   npm run build
   ```

## 📝 Notes

- The app uses smooth scrolling for navigation
- Bootstrap JavaScript is loaded via CDN
- All images are served from `/public/img/`
- Menu data is loaded from `/public/data/menu.json`

