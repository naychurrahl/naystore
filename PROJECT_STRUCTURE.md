# Multi-Business Website - Project Documentation

## Overview
This is a comprehensive multi-business website featuring four main sections: E-commerce, Portfolio, Gallery, and Blog. The application is built with React, TypeScript, React Router, and Tailwind CSS with a custom color system.

## Key Features

### 1. **Custom Color System** (`/src/styles/colors.css`)
All colors are managed through CSS custom properties in a single file. To change any color across the entire website, simply edit the values in this file.

**Example color variables:**
- `--color-primary`: Main brand color
- `--color-secondary`: Secondary brand color
- `--color-accent`: Accent/highlight color
- `--color-success`: Success states
- `--color-error`: Error states
- And many more...

### 2. **Centralized Data** (`/src/data.js`)
All dynamic content is stored as JavaScript objects in a single file. This includes:
- Company information
- Products (E-commerce)
- Portfolio projects
- Gallery images
- Blog posts
- Navigation menu items
- Category filters

**To update content:** Edit the objects in `/src/data.js`

### 3. **API Fetch Utility** (`/src/app/utils/api.js`)
A comprehensive API utility that supports all HTTP methods with headers and data.

**Features:**
- All HTTP methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- Custom headers support
- Request timeout handling
- Error handling with custom APIError class
- FormData support
- Convenience methods for common operations

**Usage Examples:**

```javascript
import { api } from './utils/api';

// GET request
const data = await api.get('https://api.example.com/users');

// POST request with data
const result = await api.post('https://api.example.com/users', {
  name: 'John',
  email: 'john@example.com'
});

// PUT request with custom headers
const updated = await api.put(
  'https://api.example.com/users/1',
  { name: 'Jane' },
  { 
    headers: { 
      'Authorization': 'Bearer token123',
      'Custom-Header': 'value'
    } 
  }
);

// PATCH request
const patched = await api.patch('https://api.example.com/users/1', {
  name: 'Updated Name'
});

// DELETE request
await api.delete('https://api.example.com/users/1');

// With timeout and signal
const controller = new AbortController();
const data = await api.get('https://api.example.com/users', {
  timeout: 5000,
  signal: controller.signal
});
```

## Project Structure

```
/src
├── /app
│   ├── App.tsx                 # Main application component
│   ├── routes.tsx              # React Router configuration
│   │
│   ├── /components
│   │   ├── Layout.tsx          # Main layout with nav and footer
│   │   ├── APIExample.tsx      # API utility demo component
│   │   └── /figma              # Figma-imported components
│   │
│   ├── /pages
│   │   ├── Home.tsx            # Home page with hero and features
│   │   ├── Shop.tsx            # E-commerce product listing
│   │   ├── Portfolio.tsx       # Portfolio projects showcase
│   │   ├── Gallery.tsx         # Photo gallery with lightbox
│   │   ├── Blog.tsx            # Blog listing with search
│   │   ├── BlogPost.tsx        # Individual blog post view
│   │   ├── APIDemo.tsx         # API utility demo page
│   │   └── NotFound.tsx        # 404 page
│   │
│   └── /utils
│       └── api.js              # API fetch utility
│
├── /styles
│   ├── index.css               # Main styles entry point
│   ├── colors.css              # Custom color system ⭐
│   ├── fonts.css               # Font imports
│   ├── tailwind.css            # Tailwind imports
│   └── theme.css               # Theme configuration
│
└── data.js                     # All dynamic content ⭐
```

## Pages & Features

### 1. Home Page (`/`)
- Hero section with company branding
- Feature cards linking to all business sections
- Statistics section
- Fully responsive design

### 2. Shop Page (`/shop`)
- Product grid with filtering by category
- Sorting options (price, name, featured)
- Product cards with images, prices, and badges
- Shopping cart integration (UI only)
- Out of stock indicators

### 3. Portfolio Page (`/portfolio`)
- Project showcase with categories
- Featured projects filter
- Project cards with tags and descriptions
- Hover effects with overlay
- Client information display

### 4. Gallery Page (`/gallery`)
- Masonry-style photo grid
- Category filtering
- Lightbox modal for full-size viewing
- Image metadata display
- Responsive columns

### 5. Blog Page (`/blog`)
- Article listing with search functionality
- Category filtering
- Author information
- Read time estimates
- Tag system
- Links to individual posts

### 6. Blog Post Page (`/blog/:id`)
- Full article view
- Author profile
- Related articles
- Social sharing button
- Rich content display

### 7. API Demo Page (`/api-demo`)
- Live API testing interface
- Demonstrates all HTTP methods
- Real-time response display
- Error handling examples
- Usage documentation

## Customization Guide

### Changing Colors
Edit `/src/styles/colors.css`:

```css
:root {
  --color-primary: #2563eb;        /* Change to your brand color */
  --color-secondary: #7c3aed;      /* Change secondary color */
  /* ... edit any color variable ... */
}
```

### Updating Content
Edit `/src/data.js`:

```javascript
export const companyInfo = {
  name: "Your Company Name",
  tagline: "Your Tagline",
  // ... update company info ...
};

export const products = [
  {
    id: 1,
    name: "Your Product",
    price: 99.99,
    // ... add/edit products ...
  }
];
```

### Adding New Pages
1. Create a new component in `/src/app/pages/`
2. Add route in `/src/app/routes.tsx`
3. Add navigation link in `/src/data.js` (navigationMenu)

### API Integration
Use the API utility to connect to your backend:

```javascript
import { api } from './utils/api';

// Fetch products from your API
const products = await api.get('https://your-api.com/products');

// Create new product
const newProduct = await api.post('https://your-api.com/products', {
  name: 'New Product',
  price: 49.99
});
```

## Technical Stack

- **React 18.3.1**: UI library
- **TypeScript**: Type safety
- **React Router 7.13.0**: Client-side routing
- **Tailwind CSS 4.1.12**: Utility-first styling
- **Lucide React**: Icon library
- **Vite**: Build tool and dev server

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimizations

- Lazy loading for images
- Memoized filtering and sorting
- Optimized re-renders with React hooks
- CSS custom properties for theming
- Route-based code splitting

## Future Enhancements

- Shopping cart functionality
- User authentication
- Real backend integration
- Payment processing
- Admin dashboard
- Content management system
- Email notifications
- Social media integration

## License

© 2024 Nexus Enterprises. All rights reserved.
