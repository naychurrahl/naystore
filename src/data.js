// Centralized data for the entire website
// All dynamic content can be edited from this file

export const companyInfo = {
  name: "Nexus Enterprises",
  tagline: "Where Innovation Meets Excellence",
  description: "A diversified business group with ventures in e-commerce, creative services, and digital content.",
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

// E-commerce Products Data
export const products = [
  {
    id: 1,
    name: "Premium Wireless Headphones",
    category: "Electronics",
    price: 299.99,
    originalPrice: 399.99,
    image: "premium wireless headphones",
    description: "High-quality wireless headphones with noise cancellation and 30-hour battery life.",
    inStock: true,
    badge: "Sale"
  },
  {
    id: 2,
    name: "Smart Fitness Watch",
    category: "Electronics",
    price: 199.99,
    originalPrice: null,
    image: "smart fitness watch",
    description: "Track your health and fitness goals with advanced sensors and GPS.",
    inStock: true,
    badge: "New"
  },
  {
    id: 3,
    name: "Leather Laptop Bag",
    category: "Accessories",
    price: 149.99,
    originalPrice: 199.99,
    image: "leather laptop bag",
    description: "Premium leather bag with padded laptop compartment and multiple pockets.",
    inStock: true,
    badge: "Sale"
  },
  {
    id: 4,
    name: "Minimalist Desk Lamp",
    category: "Home & Office",
    price: 79.99,
    originalPrice: null,
    image: "minimalist desk lamp",
    description: "Adjustable LED desk lamp with touch controls and USB charging port.",
    inStock: true,
    badge: null
  },
  {
    id: 5,
    name: "Organic Cotton T-Shirt",
    category: "Apparel",
    price: 34.99,
    originalPrice: null,
    image: "organic cotton tshirt",
    description: "Soft and sustainable organic cotton t-shirt in various colors.",
    inStock: true,
    badge: "Eco-Friendly"
  },
  {
    id: 6,
    name: "Stainless Steel Water Bottle",
    category: "Lifestyle",
    price: 24.99,
    originalPrice: 34.99,
    image: "stainless steel water bottle",
    description: "Insulated water bottle that keeps drinks cold for 24 hours.",
    inStock: false,
    badge: "Out of Stock"
  },
  {
    id: 7,
    name: "Wireless Charging Pad",
    category: "Electronics",
    price: 39.99,
    originalPrice: null,
    image: "wireless charging pad",
    description: "Fast wireless charging for all Qi-compatible devices.",
    inStock: true,
    badge: null
  },
  {
    id: 8,
    name: "Canvas Backpack",
    category: "Accessories",
    price: 89.99,
    originalPrice: 119.99,
    image: "canvas backpack",
    description: "Durable canvas backpack with laptop sleeve and water-resistant coating.",
    inStock: true,
    badge: "Sale"
  }
];

// Portfolio Projects Data
export const portfolioProjects = [
  {
    id: 1,
    title: "Brand Identity Design",
    client: "TechStart Inc.",
    category: "Branding",
    image: "brand identity design office",
    description: "Complete brand identity redesign including logo, color palette, and brand guidelines.",
    tags: ["Branding", "Logo Design", "Visual Identity"],
    year: 2024,
    featured: true
  },
  {
    id: 2,
    title: "E-commerce Platform",
    client: "Fashion Forward",
    category: "Web Development",
    image: "ecommerce website design",
    description: "Full-stack e-commerce platform with custom CMS and payment integration.",
    tags: ["Web Development", "UI/UX", "E-commerce"],
    year: 2024,
    featured: true
  },
  {
    id: 3,
    title: "Mobile App Design",
    client: "FitLife",
    category: "App Design",
    image: "mobile app design mockup",
    description: "Fitness tracking mobile app with social features and personalized workouts.",
    tags: ["Mobile Design", "UI/UX", "Health & Fitness"],
    year: 2023,
    featured: false
  },
  {
    id: 4,
    title: "Marketing Campaign",
    client: "Green Energy Co.",
    category: "Marketing",
    image: "marketing campaign creative",
    description: "Multi-channel marketing campaign for sustainable energy solutions.",
    tags: ["Marketing", "Social Media", "Sustainability"],
    year: 2024,
    featured: true
  },
  {
    id: 5,
    title: "Corporate Website",
    client: "Legal Partners LLP",
    category: "Web Development",
    image: "corporate website design",
    description: "Professional website with case studies, team profiles, and client portal.",
    tags: ["Web Development", "Corporate", "Professional Services"],
    year: 2023,
    featured: false
  },
  {
    id: 6,
    title: "Product Photography",
    client: "Artisan Goods",
    category: "Photography",
    image: "product photography studio",
    description: "High-quality product photography for handcrafted goods catalog.",
    tags: ["Photography", "Product", "E-commerce"],
    year: 2024,
    featured: false
  }
];

// Gallery Images Data
export const galleryImages = [
  {
    id: 1,
    title: "Urban Architecture",
    image: "modern architecture building",
    category: "Architecture",
    photographer: "Jane Smith",
    date: "2024-01-15"
  },
  {
    id: 2,
    title: "Mountain Landscape",
    image: "mountain landscape sunset",
    category: "Nature",
    photographer: "John Doe",
    date: "2024-02-20"
  },
  {
    id: 3,
    title: "Street Photography",
    image: "urban street photography",
    category: "Street",
    photographer: "Sarah Johnson",
    date: "2024-01-10"
  },
  {
    id: 4,
    title: "Abstract Art",
    image: "abstract art colorful",
    category: "Abstract",
    photographer: "Mike Chen",
    date: "2024-03-05"
  },
  {
    id: 5,
    title: "Ocean Waves",
    image: "ocean waves beach",
    category: "Nature",
    photographer: "Emily Davis",
    date: "2024-02-14"
  },
  {
    id: 6,
    title: "City Lights",
    image: "city lights night",
    category: "Urban",
    photographer: "David Kim",
    date: "2024-01-25"
  },
  {
    id: 7,
    title: "Forest Path",
    image: "forest path trees",
    category: "Nature",
    photographer: "Lisa Brown",
    date: "2024-03-12"
  },
  {
    id: 8,
    title: "Minimalist Interior",
    image: "minimalist interior design",
    category: "Architecture",
    photographer: "Tom Wilson",
    date: "2024-02-28"
  },
  {
    id: 9,
    title: "Vintage Car",
    image: "vintage classic car",
    category: "Automotive",
    photographer: "Chris Lee",
    date: "2024-01-30"
  }
];

// Blog Posts Data
export const blogPosts = [
  {
    id: 1,
    title: "The Future of E-commerce: Trends to Watch in 2024",
    excerpt: "Discover the emerging trends that will shape online retail in the coming year, from AI-powered personalization to sustainable shipping practices.",
    content: "Full blog post content would go here...",
    author: "Sarah Mitchell",
    authorImage: "professional woman portrait",
    category: "E-commerce",
    image: "ecommerce technology future",
    publishDate: "2024-03-15",
    readTime: 8,
    tags: ["E-commerce", "Technology", "Trends"]
  },
  {
    id: 2,
    title: "Design Principles for Modern Web Applications",
    excerpt: "Learn about the fundamental design principles that create intuitive and engaging user experiences in contemporary web development.",
    content: "Full blog post content would go here...",
    author: "Alex Johnson",
    authorImage: "professional man portrait",
    category: "Design",
    image: "web design workspace",
    publishDate: "2024-03-10",
    readTime: 6,
    tags: ["Design", "UI/UX", "Web Development"]
  },
  {
    id: 3,
    title: "Building a Strong Brand Identity: A Step-by-Step Guide",
    excerpt: "Explore the essential elements of creating a memorable brand identity that resonates with your target audience and stands out in the market.",
    content: "Full blog post content would go here...",
    author: "Emma Davis",
    authorImage: "professional woman smiling",
    category: "Branding",
    image: "branding strategy workspace",
    publishDate: "2024-03-05",
    readTime: 10,
    tags: ["Branding", "Marketing", "Business Strategy"]
  },
  {
    id: 4,
    title: "Photography Tips for Product Shots That Sell",
    excerpt: "Master the art of product photography with these professional tips and techniques to make your products shine and increase conversions.",
    content: "Full blog post content would go here...",
    author: "Michael Chang",
    authorImage: "photographer portrait",
    category: "Photography",
    image: "product photography setup",
    publishDate: "2024-03-01",
    readTime: 7,
    tags: ["Photography", "E-commerce", "Marketing"]
  },
  {
    id: 5,
    title: "Sustainable Business Practices That Drive Growth",
    excerpt: "How implementing eco-friendly practices can not only help the planet but also improve your bottom line and attract conscious consumers.",
    content: "Full blog post content would go here...",
    author: "Rachel Green",
    authorImage: "professional woman outdoor",
    category: "Business",
    image: "sustainable business green",
    publishDate: "2024-02-28",
    readTime: 9,
    tags: ["Sustainability", "Business", "CSR"]
  },
  {
    id: 6,
    title: "The Power of Social Media Marketing in 2024",
    excerpt: "Harness the latest social media strategies and platforms to expand your reach, engage your audience, and grow your business.",
    content: "Full blog post content would go here...",
    author: "David Park",
    authorImage: "marketing professional portrait",
    category: "Marketing",
    image: "social media marketing",
    publishDate: "2024-02-25",
    readTime: 5,
    tags: ["Social Media", "Marketing", "Digital Strategy"]
  }
];

// Navigation Menu Data
export const navigationMenu = [
  { name: "Home", path: "/" },
  { name: "Shop", path: "/shop" },
  { name: "Portfolio", path: "/portfolio" },
  { name: "Gallery", path: "/gallery" },
  { name: "Blog", path: "/blog" }
];

// Categories for filtering
export const productCategories = ["All", "Electronics", "Accessories", "Home & Office", "Apparel", "Lifestyle"];
export const portfolioCategories = ["All", "Branding", "Web Development", "App Design", "Marketing", "Photography"];
export const galleryCategories = ["All", "Architecture", "Nature", "Street", "Abstract", "Urban", "Automotive"];
export const blogCategories = ["All", "E-commerce", "Design", "Branding", "Photography", "Business", "Marketing"];
