# The Golden Olive - React App

Modern React application for The Golden Olive restaurant website, built with Vite, TypeScript, and Bootstrap.

## Features

- ⚡ **Vite** - Fast build tool and dev server
- ⚛️ **React 19** - Latest React with TypeScript
- 🎨 **Bootstrap 5** - Modern UI framework
- 🎭 **AOS** - Animate On Scroll library
- 🎨 **Custom Colors** - Centralized color management via `colors.tsx`
- 📱 **Responsive Design** - Mobile-first approach
- 🎬 **Video Autoplay** - Optimized for mobile devices
- 📧 **Email API** - Node.js backend with Nodemailer (replaces PHPMailer)
- 📝 **Contact Form** - Fully functional contact form with email sending

## Project Structure

```
react-app/
├── src/
│   ├── components/        # React components
│   │   ├── Header/        # Navigation header
│   │   ├── Hero/          # Hero section with video
│   │   ├── About/         # About section
│   │   ├── Menu/          # Menu system
│   │   ├── Events/        # Events carousel
│   │   ├── Gallery/       # Image gallery
│   │   ├── Contact/       # Contact information
│   │   └── Footer/        # Footer component
│   ├── hooks/             # Custom React hooks
│   │   └── useMenu.ts     # Menu data fetching hook
│   ├── types/             # TypeScript type definitions
│   │   └── menu.ts        # Menu data types
│   ├── utils/              # Utility functions
│   │   ├── categoryInfo.ts # Category information
│   │   └── bootstrapInit.ts # Bootstrap initialization
│   ├── styles/            # Custom CSS
│   │   └── custom.css     # Custom styles
│   ├── colors.tsx         # Color definitions
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── public/                # Static assets
│   ├── img/              # Images
│   └── data/             # JSON data files
├── server/               # Node.js Email API Server
│   ├── index.js          # Express server with Nodemailer
│   ├── package.json      # Server dependencies
│   └── README.md         # Server documentation
└── package.json
```

## Getting Started

### Installation

```bash
cd react-app
npm install
```

### Email API Server Setup

The app includes a Node.js backend API for email functionality (replaces PHPMailer):

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your email configuration
npm run dev  # Starts on port 3001
```

See `server/README.md` for detailed setup instructions.

### Development

**Frontend:**
```bash
npm run dev
```
The app will be available at `http://localhost:3000`

**Backend (Email API):**
```bash
cd server
npm run dev
```
The API will be available at `http://localhost:3001`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Color System

All colors are centralized in `src/colors.tsx`:

- **Golden**: `#ffc107` (primary brand color)
- **Golden Light**: `#ffcd39`
- **Golden Dark**: `#e6ac00`
- **Dark Custom**: `#000000`
- **Dark Light**: `#212529`

## Key Features

### Menu System
- Dynamic menu loading from JSON
- Category filtering
- Allergen information popups
- Responsive grid layout

### Video Hero
- Autoplay on mobile devices
- Fallback image support
- Optimized for performance

### Modern UI
- Glassmorphism effects
- Smooth animations
- Modern shadows and depth
- Responsive design

## Technologies Used

- **Vite** - Build tool
- **React 19** - UI library
- **TypeScript** - Type safety
- **Bootstrap 5** - CSS framework
- **Bootstrap Icons** - Icon library
- **AOS** - Scroll animations
- **Swiper** - Carousel component (if needed)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Notes

- All images are served from `/public/img/`
- Menu data is loaded from `/public/data/menu.json`
- The app uses smooth scrolling for navigation
- Bootstrap JavaScript is loaded via CDN in `index.html`
