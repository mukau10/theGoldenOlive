# Data Management - Menu Items & Allergens

## Overview
All menu items and allergen information are stored in JSON files and fetched immediately when needed, with intelligent caching for optimal performance.

## JSON Data Files

### 1. Menu Data (`/public/data/menu.json`)
Contains all menu items organized by category:
- `voorgerechten` (Starters)
- `mix-bbq` (Mix BBQ)
- `spareribs` (Spareribs)
- `burgers` (Burgers)
- `kindermenu` (Kids Menu)
- `supplementen` (Extras)
- `desserten` (Desserts)
- `mocktails` (Mocktails)
- `frisdranken` (Soft Drinks)
- `warme-dranken` (Hot Drinks)

Each menu item includes:
```json
{
  "id": "unique-id",
  "name": "Item Name",
  "price": "€X.XX",
  "description": "Item description",
  "image": "path/to/image",
  "alt": "Alt text for image",
  "allergens": [
    {
      "code": "G",
      "type": "Gluten",
      "color": "red",
      "description": "Full description"
    }
  ]
}
```

### 2. Allergens Reference (`/public/data/allergens.json`)
Contains comprehensive allergen definitions:
- **allergens**: All allergen types with codes, descriptions, colors
- **dietary**: Dietary indicators (vegetarian, vegan, gluten-free, etc.)

Structure:
```json
{
  "allergens": [
    {
      "code": "G",
      "type": "Gluten",
      "color": "red",
      "description": "Full description",
      "icon": "bi-wheat"
    }
  ],
  "dietary": [
    {
      "code": "V",
      "type": "Vegetarian",
      "color": "green",
      "description": "Description",
      "icon": "bi-flower"
    }
  ]
}
```

## Hooks

### `useMenu()`
Fetches and caches menu data with intelligent loading:

**Features:**
- ✅ Immediate caching (no duplicate fetches)
- ✅ Promise sharing (multiple components can use same fetch)
- ✅ Loading states
- ✅ Error handling

**Usage:**
```tsx
import { useMenu } from '../hooks/useMenu';

const MyComponent = () => {
  const { menuData, loading, error } = useMenu();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  // Use menuData
};
```

**Preload Function:**
```tsx
import { preloadMenu } from '../hooks/useMenu';

// Preload immediately on app start
preloadMenu();
```

### `useAllergens()`
Fetches and caches allergen reference data:

**Features:**
- ✅ Immediate caching
- ✅ Promise sharing
- ✅ Helper functions for allergen lookup

**Usage:**
```tsx
import { useAllergens } from '../hooks/useAllergens';

const MyComponent = () => {
  const { allergensData, getAllergenByCode, loading } = useAllergens();
  
  const allergen = getAllergenByCode('G'); // Get Gluten info
};
```

**Preload Function:**
```tsx
import { preloadAllergens } from '../hooks/useAllergens';

// Preload immediately
preloadAllergens();
```

## Immediate Fetching Strategy

### 1. Preloading in HTML
Both JSON files are preloaded in `index.html`:
```html
<link rel="preload" href="/data/menu.json" as="fetch" crossorigin="anonymous" type="application/json">
<link rel="preload" href="/data/allergens.json" as="fetch" crossorigin="anonymous" type="application/json">
```

### 2. App-Level Preloading
Data is preloaded immediately when the app starts:
```tsx
// In App.tsx
useEffect(() => {
  preloadMenu();
  preloadAllergens();
}, []);
```

### 3. Intelligent Caching
- First fetch stores data in memory cache
- Subsequent requests use cached data immediately
- No duplicate network requests
- Promise sharing prevents race conditions

## Utility Functions

### `menuUtils.ts`
Helper functions for menu data manipulation:

- `getAllAllergensFromMenu()` - Extract all unique allergens from menu
- `getMenuItemsByAllergen()` - Find items containing specific allergen
- `filterItemsByAllergens()` - Filter items by allergen codes
- `getDietarySafeItems()` - Get items safe for dietary requirements
- `searchMenuItems()` - Search items by name or description

**Usage:**
```tsx
import { getMenuItemsByAllergen, searchMenuItems } from '../utils/menuUtils';
import { useMenu } from '../hooks/useMenu';

const MyComponent = () => {
  const { menuData } = useMenu();
  
  // Find all items with Gluten
  const glutenItems = getMenuItemsByAllergen(menuData, 'G');
  
  // Search for "burger"
  const burgerItems = searchMenuItems(menuData, 'burger');
};
```

## Component Integration

### MenuItem Component
The `MenuItem` component automatically:
- ✅ Uses `useAllergens()` hook for enhanced allergen info
- ✅ Falls back to item's allergen data if reference not available
- ✅ Displays allergens with proper colors and hover effects
- ✅ Handles allergen clicks with descriptions

### Menu Component
The `Menu` component:
- ✅ Uses `useMenu()` hook for menu data
- ✅ Filters items by category
- ✅ Handles allergen popups
- ✅ Shows loading states

## Performance Optimizations

1. **Caching**: Data is cached in memory after first fetch
2. **Preloading**: Critical data preloaded in HTML and on app start
3. **Promise Sharing**: Multiple components share the same fetch promise
4. **Lazy Loading**: Components only fetch when mounted
5. **No Duplicate Requests**: Cache prevents redundant network calls

## Data Flow

```
App Start
  ↓
Preload menu.json & allergens.json (HTML + App.tsx)
  ↓
Cache in memory
  ↓
Components use hooks (useMenu, useAllergens)
  ↓
Immediate access to cached data
  ↓
No additional network requests
```

## Benefits

1. ✅ **Fast Loading**: Preloaded and cached data
2. ✅ **No Duplicates**: Single source of truth
3. ✅ **Type Safety**: Full TypeScript support
4. ✅ **Easy Updates**: Just update JSON files
5. ✅ **Scalable**: Easy to add new categories or items
6. ✅ **Maintainable**: Centralized data management

## Updating Data

To update menu items or allergens:
1. Edit `/public/data/menu.json` or `/public/data/allergens.json`
2. No code changes needed
3. Data is automatically loaded on next app start
4. Cache is cleared on page refresh

## Best Practices

1. ✅ Always use hooks (`useMenu`, `useAllergens`) instead of direct fetch
2. ✅ Use utility functions for complex queries
3. ✅ Preload critical data on app start
4. ✅ Handle loading and error states
5. ✅ Use TypeScript types for type safety

