const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// In-Memory Database Stores
let users = [];
let sellerProfiles = [];
let products = [
  { id: '1', title: 'Handloom Saree', price: 1500, desc: 'Authentic silk saree woven by local artisans.', category: 'Textiles', shop: 'Ananya Handloom', img: 'assets/images/story-embroidery.png', featured: true },
  { id: '2', title: 'Terracotta Vase', price: 600, desc: 'Handcrafted clay terracotta vase with traditional motifs.', category: 'Sculpture & handicrafts', shop: 'Village Crafts', img: 'assets/images/product-terracotta.png', featured: true },
  { id: '3', title: 'Woodcraft Table Decor', price: 2500, desc: 'Carved solid wood centerpiece.', category: 'Sculpture & handicrafts', shop: 'Heritage Woods', img: 'assets/images/story-woodcraft.png', featured: false }
];
let cartItems = [];
let wishlistItems = [];
let orders = [];

// ==========================================
// 1. AUTHENTICATION & SELLER ENDPOINTS
// ==========================================

app.post('/api/auth/signup', (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: 'Name, email, and password required.' });
  }
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'Account with this email already exists.' });
  }
  const newUser = { id: Date.now(), name, email, phone, password, role: role || 'Buyer', createdAt: new Date() };
  users.push(newUser);
  res.status(201).json({ success: true, message: 'Account created successfully', user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, name, password } = req.body;
  const user = users.find(u => (u.email === email || u.name === name) && u.password === password);
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  res.json({ success: true, message: 'Login successful', user });
});

app.post('/api/seller/onboard', (req, res) => {
  const { userEmail, district, bio, pehchanId, udyamId } = req.body;
  if (!district || !bio) {
    return res.status(400).json({ success: false, message: 'District and Bio story are required.' });
  }
  const newProfile = { id: Date.now(), ...req.body, verified: Boolean(pehchanId || udyamId), createdAt: new Date() };
  sellerProfiles.push(newProfile);
  res.status(201).json({ success: true, message: 'Artisan profile saved!', profile: newProfile });
});

app.get('/api/sellers', (req, res) => {
  res.json({ success: true, count: sellerProfiles.length, sellers: sellerProfiles });
});

// ==========================================
// 2. PRODUCT ENDPOINTS
// ==========================================

app.get('/api/products', (req, res) => {
  res.json({ success: true, count: products.length, products });
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
  res.json({ success: true, product });
});

app.post('/api/products', (req, res) => {
  const { title, price, desc, category, shop, img } = req.body;
  if (!title || !price || !shop) {
    return res.status(400).json({ success: false, message: 'Title, price, and shop name are required.' });
  }
  const newProduct = {
    id: String(Date.now()),
    title,
    price: Number(price),
    desc: desc || '',
    category: category || 'Sculpture & handicrafts',
    shop,
    img: img || 'assets/images/product-terracotta.png',
    featured: false,
    createdAt: new Date()
  };
  products.push(newProduct);
  res.status(201).json({ success: true, message: 'Product created successfully', product: newProduct });
});

// ==========================================
// 3. CART & WISHLIST ENDPOINTS
// ==========================================

app.get('/api/cart', (req, res) => {
  res.json({ success: true, cart: cartItems });
});

app.post('/api/cart/add', (req, res) => {
  const { productId, quantity } = req.body;
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

  const existingIndex = cartItems.findIndex(item => item.productId === productId);
  if (existingIndex > -1) {
    cartItems[existingIndex].quantity += (quantity || 1);
  } else {
    cartItems.push({ productId, product, quantity: quantity || 1 });
  }
  res.json({ success: true, message: 'Item added to cart', cart: cartItems });
});

app.delete('/api/cart/item/:id', (req, res) => {
  cartItems = cartItems.filter(item => item.productId !== req.params.id);
  res.json({ success: true, cart: cartItems });
});

app.delete('/api/cart/clear', (req, res) => {
  cartItems = [];
  res.json({ success: true, cart: [] });
});

app.get('/api/wishlist', (req, res) => {
  res.json({ success: true, wishlist: wishlistItems });
});

app.post('/api/wishlist/toggle', (req, res) => {
  const { productId } = req.body;
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

  const index = wishlistItems.findIndex(item => item.id === productId);
  if (index > -1) {
    wishlistItems.splice(index, 1);
    res.json({ success: true, added: false, wishlist: wishlistItems });
  } else {
    wishlistItems.push(product);
    res.json({ success: true, added: true, wishlist: wishlistItems });
  }
});

// ==========================================
// 4. CHECKOUT & ORDERS ENDPOINTS
// ==========================================

app.post('/api/checkout', (req, res) => {
  const { userEmail, shippingAddress, paymentMethod } = req.body;
  if (!cartItems.length) return res.status(400).json({ success: false, message: 'Your cart is empty.' });

  const total = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const newOrder = {
    id: 'ORD-' + Date.now(),
    userEmail: userEmail || 'guest@desidistrict.com',
    items: [...cartItems],
    totalAmount: total,
    shippingAddress: shippingAddress || 'Local Address',
    paymentMethod: paymentMethod || 'Cash on Delivery',
    status: 'Confirmed',
    createdAt: new Date()
  };

  orders.push(newOrder);
  cartItems = []; // Clear cart on order creation
  res.status(201).json({ success: true, message: 'Order placed successfully!', order: newOrder });
});

app.get('/api/orders', (req, res) => {
  res.json({ success: true, orders });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Desi District Backend running on http://localhost:${PORT}`);
});