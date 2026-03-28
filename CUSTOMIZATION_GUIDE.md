# Quick Customization Guide

This guide shows you exactly how to customize the website's appearance and content.

## 🎨 Changing Colors

**File:** `/src/styles/colors.css`

All website colors are controlled from this single file. Simply edit the hex color values:

```css
:root {
  /* PRIMARY COLORS - Main brand color used for buttons, links, highlights */
  --color-primary: #2563eb;           /* Change this to your brand color */
  --color-primary-hover: #1d4ed8;     /* Darker shade for hover states */
  --color-primary-light: #dbeafe;     /* Light shade for backgrounds */
  
  /* SECONDARY COLORS - Used for portfolio section */
  --color-secondary: #7c3aed;         /* Purple accent color */
  --color-secondary-hover: #6d28d9;
  --color-secondary-light: #ede9fe;
  
  /* ACCENT COLORS - Used for gallery section */
  --color-accent: #f59e0b;            /* Orange/amber accent */
  --color-accent-hover: #d97706;
  --color-accent-light: #fef3c7;
  
  /* SUCCESS COLORS - Used for blog section and success states */
  --color-success: #10b981;           /* Green */
  --color-success-hover: #059669;
  --color-success-light: #d1fae5;
  
  /* ERROR COLORS - Used for error states */
  --color-error: #ef4444;             /* Red */
  --color-error-hover: #dc2626;
  --color-error-light: #fee2e2;
  
  /* NEUTRAL COLORS - Backgrounds and text */
  --color-background: #ffffff;        /* Main background */
  --color-surface: #f9fafb;          /* Card backgrounds */
  --color-border: #e5e7eb;           /* Border color */
  --color-text-primary: #111827;     /* Main text color */
  --color-text-secondary: #6b7280;   /* Secondary text */
  --color-text-muted: #9ca3af;       /* Muted text */
  
  /* NAVIGATION COLORS */
  --color-nav-bg: #ffffff;
  --color-nav-text: #111827;
  --color-nav-hover: #f3f4f6;
  --color-nav-active: #2563eb;
  
  /* FOOTER COLORS */
  --color-footer-bg: #1f2937;
  --color-footer-text: #d1d5db;
  --color-footer-link: #93c5fd;
  
  /* SECTION-SPECIFIC COLORS */
  --color-product-card: #ffffff;
  --color-product-badge: #ef4444;
  --color-cart-button: #10b981;
  --color-cart-button-hover: #059669;
  --color-portfolio-overlay: rgba(0, 0, 0, 0.7);
  --color-portfolio-tag: #8b5cf6;
  --color-gallery-overlay: rgba(0, 0, 0, 0.85);
  --color-blog-card: #ffffff;
  --color-blog-category: #3b82f6;
  --color-blog-meta: #9ca3af;
}
```

### Color Usage Examples:

- **Primary Color**: Navigation active state, main CTA buttons, hero buttons
- **Secondary Color**: Portfolio section header, portfolio tags
- **Accent Color**: Gallery section header, featured items
- **Success Color**: Blog section header, add to cart buttons, success messages
- **Error Color**: Out of stock badges, error messages, delete buttons

---

## 📝 Editing Content

**File:** `/src/data.js`

All website content is stored as JavaScript objects in this file.

### Company Information

```javascript
export const companyInfo = {
  name: "Nexus Enterprises",              // Change company name
  tagline: "Where Innovation Meets Excellence",
  description: "A diversified business group...",
  email: "contact@nexusenterprises.com",
  phone: "+1 (555) 123-4567",
  address: "123 Business Avenue, Tech City, TC 12345",
  social: {
    facebook: "https://facebook.com/nexusenterprises",
    twitter: "https://twitter.com/nexusenterprises",
    instagram: "https://instagram.com/nexusenterprises",
    linkedin: "https://linkedin.com/company/nexusenterprises"
  }
};
```

### Adding a New Product

```javascript
export const products = [
  // ... existing products ...
  {
    id: 9,                                    // Unique ID
    name: "New Product Name",                 // Product name
    category: "Electronics",                  // Category (must match productCategories)
    price: 199.99,                           // Current price
    originalPrice: 249.99,                   // Optional: Original price (shows as strikethrough)
    image: "product description for unsplash", // Image search term
    description: "Product description here",
    inStock: true,                           // true or false
    badge: "New"                             // Optional: "Sale", "New", "Out of Stock", etc.
  }
];
```

### Adding a New Portfolio Project

```javascript
export const portfolioProjects = [
  // ... existing projects ...
  {
    id: 7,
    title: "New Project Title",
    client: "Client Name",
    category: "Web Development",              // Must match portfolioCategories
    image: "project image description",
    description: "Project description...",
    tags: ["Tag1", "Tag2", "Tag3"],          // Array of tags
    year: 2024,
    featured: true                            // Show in featured filter
  }
];
```

### Adding a New Gallery Image

```javascript
export const galleryImages = [
  // ... existing images ...
  {
    id: 10,
    title: "Image Title",
    image: "image description for unsplash",
    category: "Nature",                       // Must match galleryCategories
    photographer: "Photographer Name",
    date: "2024-03-28"                       // Format: YYYY-MM-DD
  }
];
```

### Adding a New Blog Post

```javascript
export const blogPosts = [
  // ... existing posts ...
  {
    id: 7,
    title: "Blog Post Title",
    excerpt: "Short description or excerpt...",
    content: "Full blog post content...",    // Not currently used in detail view
    author: "Author Name",
    authorImage: "professional portrait",
    category: "Technology",                   // Must match blogCategories
    image: "blog post hero image",
    publishDate: "2024-03-28",               // Format: YYYY-MM-DD
    readTime: 8,                             // Minutes to read
    tags: ["Tag1", "Tag2", "Tag3"]           // Array of tags
  }
];
```

### Modifying Navigation Menu

```javascript
export const navigationMenu = [
  { name: "Home", path: "/" },
  { name: "Shop", path: "/shop" },
  { name: "Portfolio", path: "/portfolio" },
  { name: "Gallery", path: "/gallery" },
  { name: "Blog", path: "/blog" },
  // Add new menu items here:
  { name: "About", path: "/about" }
];
```

### Modifying Category Filters

```javascript
// E-commerce categories
export const productCategories = [
  "All", 
  "Electronics", 
  "Accessories", 
  "Home & Office", 
  "Apparel", 
  "Lifestyle"
  // Add new categories here
];

// Portfolio categories
export const portfolioCategories = [
  "All", 
  "Branding", 
  "Web Development", 
  "App Design", 
  "Marketing", 
  "Photography"
];

// Gallery categories
export const galleryCategories = [
  "All", 
  "Architecture", 
  "Nature", 
  "Street", 
  "Abstract", 
  "Urban", 
  "Automotive"
];

// Blog categories
export const blogCategories = [
  "All", 
  "E-commerce", 
  "Design", 
  "Branding", 
  "Photography", 
  "Business", 
  "Marketing"
];
```

---

## 🖼️ Image System

The website uses Unsplash for demo images. The `image` field in data objects is used as a search term.

**Examples:**
- `"premium wireless headphones"` → Searches Unsplash for headphone images
- `"modern office workspace"` → Searches for office images
- `"mountain landscape sunset"` → Searches for mountain landscapes

**To use your own images:**
Replace the ImageWithFallback `src` with your actual image URLs:
```jsx
<img src="/path/to/your/image.jpg" alt="Product" />
```

---

## 🔧 API Integration

**File:** `/src/app/utils/api.js`

Use the API utility to connect to your backend:

```javascript
import { api } from './utils/api';

// In your component:
async function loadProducts() {
  try {
    const products = await api.get('https://your-api.com/products');
    setProducts(products);
  } catch (error) {
    console.error('Failed to load products:', error);
  }
}

// Create new product
async function createProduct(productData) {
  try {
    const result = await api.post('https://your-api.com/products', productData);
    console.log('Product created:', result);
  } catch (error) {
    console.error('Failed to create product:', error);
  }
}
```

---

## 🎯 Quick Tips

1. **Test color changes live**: Edit `/src/styles/colors.css` and save to see changes immediately
2. **Add content**: Edit `/src/data.js` arrays to add new products, projects, images, or posts
3. **Keep categories consistent**: When adding items, use existing category names or add new ones to the category arrays
4. **Image search terms**: Use descriptive 2-3 word phrases for best Unsplash results
5. **IDs must be unique**: Each item in an array needs a unique `id` number

---

## 📂 File Locations Summary

| What to Edit | File Location |
|-------------|---------------|
| All colors | `/src/styles/colors.css` |
| All content | `/src/data.js` |
| API calls | `/src/app/utils/api.js` |
| Add new page | `/src/app/pages/NewPage.tsx` |
| Update routes | `/src/app/routes.tsx` |
| Layout/Navigation | `/src/app/components/Layout.tsx` |

---

## 🚀 Next Steps

1. Edit colors in `/src/styles/colors.css` to match your brand
2. Update company info in `/src/data.js`
3. Add your products, projects, images, and blog posts
4. Test the API demo at `/api-demo` to understand how to integrate your backend
5. Replace Unsplash images with your own image URLs

That's it! Your website is now fully customized.
