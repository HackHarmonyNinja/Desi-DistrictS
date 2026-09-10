const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 5050;

const REMOVE_BG_API_KEY =
  process.env.REMOVE_BG_API_KEY || '';

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || '';

const GOOGLE_TRANSLATE_API_KEY =
  process.env.GOOGLE_TRANSLATE_API_KEY || '';

const OPENAI_CATALOG_MODEL =
  process.env.OPENAI_CATALOG_MODEL || 'gpt-5';

const OPENAI_TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1';


// ============================================================
// CORS + BODY PARSING
// ============================================================

app.use(cors({
  origin: '*',
  methods: [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'OPTIONS'
  ],
  allowedHeaders: [
    'Content-Type',
    'Authorization'
  ]
}));

app.use(express.json({
  limit: '20mb'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '20mb'
}));


// ============================================================
// REQUEST LOGGER
// ============================================================

app.use((req, res, next) => {
  console.log(
    `[API] ${req.method} ${req.originalUrl}`
  );

  next();
});


// ============================================================
// DATA STORAGE
// ============================================================

const DATA_DIR =
  path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, {
    recursive: true
  });
}

function dataFile(name) {
  return path.join(DATA_DIR, name);
}

function readJson(name, fallback = []) {
  const file = dataFile(name);

  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(
        file,
        JSON.stringify(
          fallback,
          null,
          2
        )
      );

      return fallback;
    }

    const raw =
      fs.readFileSync(
        file,
        'utf8'
      );

    if (!raw.trim()) {
      return fallback;
    }

    return JSON.parse(raw);

  } catch (error) {
    console.error(
      `[DATA READ ERROR] ${name}`,
      error
    );

    return fallback;
  }
}

function writeJson(name, data) {
  const file = dataFile(name);

  try {
    fs.writeFileSync(
      file,
      JSON.stringify(
        data,
        null,
        2
      )
    );

    return true;

  } catch (error) {
    console.error(
      `[DATA WRITE ERROR] ${name}`,
      error
    );

    return false;
  }
}

function generateId(prefix = '') {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .substring(2, 8)
  );
}


// ============================================================
// DEFAULT PRODUCTS
// ============================================================

const defaultProducts = [
  {
    id: '1',
    title: 'Handcrafted Terracotta Vase',
    category: 'Handicrafts',
    material: 'Terracotta',
    size: 'medium',
    price: 499,
    desc:
      'Decorative handmade terracotta vase shaped on a traditional potter wheel.',
    shop: 'Village Crafts',
    img:
      'assets/images/product-terracotta.png',
    featured: true
  },

  {
    id: '2',
    title: 'Traditional Bandhani Fabric',
    category: 'Textiles',
    material: 'Cotton',
    size: 'large',
    price: 799,
    desc:
      'Authentic Bandhani tie-dye textile crafted by traditional artisans.',
    shop: 'Kutch Weavers',
    img:
      'assets/images/story-embroidery.png',
    featured: false
  },

  {
    id: '3',
    title: 'Handcrafted Bamboo Flute',
    category: 'Musical instruments',
    material: 'Bamboo',
    size: 'medium',
    price: 349,
    desc:
      'Traditional bansuri crafted from seasoned bamboo.',
    shop: 'Rhythm India',
    img:
      'assets/images/story-woodcraft.png',
    featured: true
  }
];

if (
  !fs.existsSync(
    dataFile('products.json')
  )
) {
  writeJson(
    'products.json',
    defaultProducts
  );
}


// ============================================================
// HEALTH
// ============================================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message:
      'Desi District API is running.',
    port: PORT
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy.'
  });
});


// ============================================================
// AUTHENTICATION
// ============================================================

app.post(
  '/api/auth/signup',
  (req, res) => {

    try {
      const {
        name,
        email,
        phone,
        password,
        role
      } = req.body || {};

      if (
        !name ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Name, email and password are required.'
        });
      }

      const users =
        readJson(
          'users.json',
          []
        );

      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      const existing =
        users.find(
          user =>
            String(user.email || '')
              .trim()
              .toLowerCase() ===
            normalizedEmail
        );

      if (existing) {
        return res.status(409).json({
          success: false,
          message:
            'An account with this email already exists.'
        });
      }

      const normalizedRole =
        String(role || 'Buyer')
          .toLowerCase() === 'seller'
          ? 'Seller'
          : 'Buyer';

      const user = {
        id: generateId('USR-'),
        name: String(name).trim(),
        email: normalizedEmail,
        phone:
          String(phone || '').trim(),
        password: String(password),
        role: normalizedRole,
        createdAt:
          new Date().toISOString()
      };

      users.push(user);

      writeJson(
        'users.json',
        users
      );

      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt
      };

      return res.status(201).json({
        success: true,
        message:
          'Account created successfully.',
        user: safeUser
      });

    } catch (error) {
      console.error(
        'Signup error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to create account.'
      });
    }
  }
);


app.post(
  '/api/auth/login',
  (req, res) => {

    try {
      const {
        identifier,
        email,
        name,
        password
      } = req.body || {};

      const loginIdentifier =
        String(
          identifier ||
          email ||
          name ||
          ''
        )
          .trim()
          .toLowerCase();

      if (
        !loginIdentifier ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Name/email and password are required.'
        });
      }

      const users =
        readJson(
          'users.json',
          []
        );

      const user =
        users.find(item => {

          const userEmail =
            String(
              item.email || ''
            )
              .trim()
              .toLowerCase();

          const userName =
            String(
              item.name || ''
            )
              .trim()
              .toLowerCase();

          return (
            userEmail ===
              loginIdentifier ||
            userName ===
              loginIdentifier
          );
        });

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            'Invalid name/email or password.'
        });
      }

      if (
        String(user.password) !==
        String(password)
      ) {
        return res.status(401).json({
          success: false,
          message:
            'Invalid name/email or password.'
        });
      }

      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role:
          String(user.role || 'Buyer')
            .toLowerCase() === 'seller'
            ? 'Seller'
            : 'Buyer',
        createdAt:
          user.createdAt
      };

      return res.json({
        success: true,
        message:
          'Login successful.',
        user: safeUser
      });

    } catch (error) {
      console.error(
        'Login error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to login.'
      });
    }
  }
);


// ============================================================
// SELLER ONBOARDING
// ============================================================

app.post(
  '/api/seller/onboard',
  (req, res) => {

    try {
      const {
        userEmail,
        district,
        bio,
        artform,
        otherArtform,
        experience,
        materials,
        phone,
        address,
        shopAddress,
        preferredLanguage,
        pehchanId,
        udyamId
      } = req.body || {};

      if (!userEmail) {
        return res.status(400).json({
          success: false,
          message:
            'User email is required.'
        });
      }

      if (!district) {
        return res.status(400).json({
          success: false,
          message:
            'District is required.'
        });
      }

      if (!bio) {
        return res.status(400).json({
          success: false,
          message:
            'Seller bio is required.'
        });
      }

      const profiles =
        readJson(
          'sellerProfiles.json',
          []
        );

      const normalizedEmail =
        String(userEmail)
          .trim()
          .toLowerCase();

      const profile = {
        id: generateId('SELLER-'),
        userEmail:
          normalizedEmail,
        district:
          String(district).trim(),
        bio:
          String(bio).trim(),
        artform:
          String(artform || '').trim(),
        otherArtform:
          String(otherArtform || '').trim(),
        experience:
          String(experience || '').trim(),
        materials:
          String(materials || '').trim(),
        phone:
          String(phone || '').trim(),
        address:
          String(address || '').trim(),
        shopAddress:
          String(
            shopAddress || ''
          ).trim(),
        preferredLanguage:
          String(
            preferredLanguage || ''
          ).trim(),
        pehchanId:
          String(
            pehchanId || ''
          ).trim(),
        udyamId:
          String(
            udyamId || ''
          ).trim(),
        updatedAt:
          new Date().toISOString()
      };

      const existingIndex =
        profiles.findIndex(
          item =>
            String(
              item.userEmail || ''
            )
              .trim()
              .toLowerCase() ===
            normalizedEmail
        );

      if (existingIndex >= 0) {
        profile.id =
          profiles[
            existingIndex
          ].id;

        profiles[
          existingIndex
        ] = profile;

      } else {
        profiles.push(profile);
      }

      writeJson(
        'sellerProfiles.json',
        profiles
      );

      return res.json({
        success: true,
        message:
          'Seller profile saved successfully.',
        profile
      });

    } catch (error) {
      console.error(
        'Seller onboarding error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to save seller profile.'
      });
    }
  }
);


// ============================================================
// SELLERS
// ============================================================

app.get(
  '/api/sellers',
  (req, res) => {

    try {
      const sellers =
        readJson(
          'sellerProfiles.json',
          []
        );

      return res.json({
        success: true,
        sellers
      });

    } catch (error) {
      console.error(
        'Sellers error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load sellers.'
      });
    }
  }
);


// ============================================================
// PRODUCTS
// ============================================================

app.get(
  '/api/products',
  (req, res) => {

    try {
      let products =
        readJson(
          'products.json',
          defaultProducts
        );

      const {
        search,
        category,
        featured
      } = req.query;

      if (search) {
        const q =
          String(search)
            .toLowerCase()
            .trim();

        products =
          products.filter(
            product => {

              const text = [
                product.title,
                product.desc,
                product.shop,
                product.category,
                product.material
              ]
                .map(
                  value =>
                    String(
                      value || ''
                    ).toLowerCase()
                )
                .join(' ');

              return text.includes(q);
            }
          );
      }

      if (
        category &&
        category.toLowerCase() !== 'all'
      ) {
        products =
          products.filter(
            product =>
              String(
                product.category || ''
              )
                .toLowerCase() ===
              category.toLowerCase()
          );
      }

      if (
        featured === 'true'
      ) {
        products =
          products.filter(
            product =>
              product.featured === true
          );
      }

      return res.json({
        success: true,
        products
      });

    } catch (error) {
      console.error(
        'Products error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load products.'
      });
    }
  }
);


app.get(
  '/api/products/:id',
  (req, res) => {

    try {
      const products =
        readJson(
          'products.json',
          defaultProducts
        );

      const product =
        products.find(
          item =>
            String(item.id) ===
            String(req.params.id)
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            'Product not found.'
        });
      }

      return res.json({
        success: true,
        product
      });

    } catch (error) {
      console.error(
        'Product lookup error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load product.'
      });
    }
  }
);


app.post(
  '/api/products',
  (req, res) => {

    try {
      const {
        title,
        desc,
        description,
        price,
        category,
        material,
        size,
        shop,
        img,
        featured
      } = req.body || {};

      if (!title) {
        return res.status(400).json({
          success: false,
          message:
            'Product title is required.'
        });
      }

      const numericPrice =
        Number(price);

      if (
        !Number.isFinite(
          numericPrice
        ) ||
        numericPrice <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'A valid product price is required.'
        });
      }

      const products =
        readJson(
          'products.json',
          defaultProducts
        );

      const product = {
        id: generateId('PROD-'),
        title:
          String(title).trim(),
        desc:
          String(
            desc ||
            description ||
            ''
          ).trim(),
        price:
          Math.round(numericPrice),
        category:
          String(
            category ||
            'Handicrafts'
          ).trim(),
        material:
          String(
            material ||
            'default'
          ).trim(),
        size:
          String(
            size ||
            'medium'
          ).trim(),
        shop:
          String(
            shop ||
            'Independent Seller'
          ).trim(),
        img:
          String(
            img ||
            'assets/images/product-terracotta.png'
          ).trim(),
        featured:
          Boolean(featured),
        createdAt:
          new Date().toISOString()
      };

      products.push(product);

      writeJson(
        'products.json',
        products
      );

      return res.status(201).json({
        success: true,
        message:
          'Product added successfully.',
        product
      });

    } catch (error) {
      console.error(
        'Product creation error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to create product.'
      });
    }
  }
);


app.put(
  '/api/products/:id',
  (req, res) => {

    try {
      const products =
        readJson(
          'products.json',
          defaultProducts
        );

      const index =
        products.findIndex(
          product =>
            String(product.id) ===
            String(req.params.id)
        );

      if (index === -1) {
        return res.status(404).json({
          success: false,
          message:
            'Product not found.'
        });
      }

      const existing =
        products[index];

      const updated = {
        ...existing,
        ...req.body,
        id: existing.id,
        updatedAt:
          new Date().toISOString()
      };

      if (req.body.price !== undefined) {
        updated.price =
          Number(req.body.price);

        if (
          !Number.isFinite(
            updated.price
          ) ||
          updated.price <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid product price.'
          });
        }
      }

      products[index] =
        updated;

      writeJson(
        'products.json',
        products
      );

      return res.json({
        success: true,
        message:
          'Product updated successfully.',
        product: updated
      });

    } catch (error) {
      console.error(
        'Product update error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to update product.'
      });
    }
  }
);


app.delete(
  '/api/products/:id',
  (req, res) => {

    try {
      let products =
        readJson(
          'products.json',
          defaultProducts
        );

      const originalLength =
        products.length;

      products =
        products.filter(
          product =>
            String(product.id) !==
            String(req.params.id)
        );

      if (
        products.length ===
        originalLength
      ) {
        return res.status(404).json({
          success: false,
          message:
            'Product not found.'
        });
      }

      writeJson(
        'products.json',
        products
      );

      return res.json({
        success: true,
        message:
          'Product deleted successfully.'
      });

    } catch (error) {
      console.error(
        'Product deletion error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to delete product.'
      });
    }
  }
);


// ============================================================
// REVIEWS
// ============================================================

app.get(
  '/api/reviews/:productId',
  (req, res) => {

    try {
      const reviews =
        readJson(
          'reviews.json',
          {}
        );

      const productReviews =
        Array.isArray(reviews)
          ? reviews.filter(
              review =>
                String(
                  review.productId
                ) ===
                String(
                  req.params.productId
                )
            )
          : (
              reviews[
                req.params.productId
              ] || []
            );

      return res.json({
        success: true,
        reviews:
          productReviews
      });

    } catch (error) {
      console.error(
        'Reviews error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load reviews.'
      });
    }
  }
);


app.post(
  '/api/reviews',
  (req, res) => {

    try {
      const {
        productId,
        rating,
        text,
        comment,
        userId,
        userName
      } = req.body || {};

      if (
        !productId ||
        !String(
          text || comment || ''
        ).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Product ID and review text are required.'
        });
      }

      const reviewText =
        String(
          text ||
          comment
        ).trim();

      const review = {
        id: generateId('REV-'),
        productId:
          String(productId),
        rating:
          Math.max(
            1,
            Math.min(
              5,
              Number(rating) || 5
            )
          ),
        text:
          reviewText,
        userId:
          userId || '',
        userName:
          userName ||
          'Anonymous',
        createdAt:
          new Date().toISOString()
      };

      let reviews =
        readJson(
          'reviews.json',
          {}
        );

      if (
        Array.isArray(reviews)
      ) {
        reviews.push(review);

      } else {
        if (
          !Array.isArray(
            reviews[productId]
          )
        ) {
          reviews[productId] = [];
        }

        reviews[
          productId
        ].unshift(review);
      }

      writeJson(
        'reviews.json',
        reviews
      );

      return res.status(201).json({
        success: true,
        message:
          'Review submitted successfully.',
        review
      });

    } catch (error) {
      console.error(
        'Review creation error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to submit review.'
      });
    }
  }
);


// ============================================================
// CART
// ============================================================

app.get(
  '/api/cart',
  (req, res) => {

    try {
      const cart =
        readJson(
          'cart.json',
          []
        );

      return res.json({
        success: true,
        cart
      });

    } catch (error) {
      console.error(
        'Cart error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load cart.'
      });
    }
  }
);


app.post(
  '/api/cart/add',
  (req, res) => {

    try {
      const {
        productId,
        quantity
      } = req.body || {};

      if (!productId) {
        return res.status(400).json({
          success: false,
          message:
            'Product ID is required.'
        });
      }

      const products =
        readJson(
          'products.json',
          defaultProducts
        );

      const product =
        products.find(
          item =>
            String(item.id) ===
            String(productId)
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            'Product not found.'
        });
      }

      const cart =
        readJson(
          'cart.json',
          []
        );

      const qty =
        Math.max(
          1,
          Number(quantity) || 1
        );

      const index =
        cart.findIndex(
          item =>
            String(
              item.productId
            ) ===
            String(productId)
        );

      if (index >= 0) {

        cart[index].quantity =
          Number(
            cart[index].quantity
          ) + qty;

        cart[index].product =
          product;

      } else {

        cart.push({
          id:
            generateId('CART-'),
          productId:
            String(productId),
          product,
          quantity: qty,
          createdAt:
            new Date().toISOString()
        });
      }

      writeJson(
        'cart.json',
        cart
      );

      return res.json({
        success: true,
        message:
          'Added to cart.',
        cart
      });

    } catch (error) {
      console.error(
        'Cart add error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to add item to cart.'
      });
    }
  }
);


app.post(
  '/api/cart',
  (req, res) => {

    req.url =
      '/api/cart/add';

    return app._router.handle(
      req,
      res,
      () => {}
    );
  }
);


app.delete(
  '/api/cart/item/:id',
  (req, res) => {

    try {
      let cart =
        readJson(
          'cart.json',
          []
        );

      cart =
        cart.filter(
          item =>
            String(
              item.productId
            ) !==
            String(
              req.params.id
            )
        );

      writeJson(
        'cart.json',
        cart
      );

      return res.json({
        success: true,
        cart
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          'Unable to remove cart item.'
      });
    }
  }
);


// ============================================================
// WISHLIST
// ============================================================

app.get(
  '/api/wishlist',
  (req, res) => {

    try {
      const wishlist =
        readJson(
          'wishlist.json',
          []
        );

      const products =
        readJson(
          'products.json',
          defaultProducts
        );

      const enriched =
        wishlist.map(
          item => {

            const product =
              products.find(
                p =>
                  String(p.id) ===
                  String(
                    item.productId
                  )
              );

            return {
              ...item,
              ...(product || {})
            };
          }
        );

      return res.json({
        success: true,
        wishlist:
          enriched
      });

    } catch (error) {
      console.error(
        'Wishlist error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load wishlist.'
      });
    }
  }
);


app.post(
  '/api/wishlist/toggle',
  (req, res) => {

    try {
      const {
        productId,
        userId
      } = req.body || {};

      if (!productId) {
        return res.status(400).json({
          success: false,
          message:
            'Product ID is required.'
        });
      }

      const products =
        readJson(
          'products.json',
          defaultProducts
        );

      const product =
        products.find(
          item =>
            String(item.id) ===
            String(productId)
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            'Product not found.'
        });
      }

      let wishlist =
        readJson(
          'wishlist.json',
          []
        );

      const index =
        wishlist.findIndex(
          item =>
            String(
              item.productId
            ) ===
            String(productId) &&
            String(
              item.userId || ''
            ) ===
            String(userId || '')
        );

      if (index >= 0) {

        wishlist.splice(
          index,
          1
        );

        writeJson(
          'wishlist.json',
          wishlist
        );

        return res.json({
          success: true,
          added: false,
          wishlist
        });
      }

      wishlist.push({
        id:
          generateId('WISH-'),
        productId:
          String(productId),
        userId:
          userId || '',
        createdAt:
          new Date().toISOString()
      });

      writeJson(
        'wishlist.json',
        wishlist
      );

      return res.json({
        success: true,
        added: true,
        wishlist
      });

    } catch (error) {
      console.error(
        'Wishlist toggle error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to update wishlist.'
      });
    }
  }
);


// ============================================================
// CHECKOUT
// ============================================================

app.post(
  '/api/checkout',
  (req, res) => {

    try {
      const {
        userId,
        items,
        total,
        shippingAddress,
        paymentMethod
      } = req.body || {};

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Cart items are required.'
        });
      }

      const orders =
        readJson(
          'orders.json',
          []
        );

      const order = {
        id:
          generateId('ORDER-'),
        userId:
          userId || '',
        items,
        total:
          Number(total) || 0,
        shippingAddress:
          shippingAddress || {},
        paymentMethod:
          paymentMethod || 'cash',
        status:
          'pending',
        createdAt:
          new Date().toISOString()
      };

      orders.push(order);

      writeJson(
        'orders.json',
        orders
      );

      return res.status(201).json({
        success: true,
        message:
          'Order placed successfully.',
        order
      });

    } catch (error) {
      console.error(
        'Checkout error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to place order.'
      });
    }
  }
);


// ============================================================
// AI PRICING
// RULES BASED, NOT FAKE ML
// ============================================================

const PRICING_MATRIX = {

  handicrafts: {
    base: 350,
    terracotta: 1.0,
    clay: 1.0,
    brass: 2.2,
    wood: 1.8,
    bamboo: 0.9,
    default: 1.0
  },

  textiles: {
    base: 800,
    cotton: 1.0,
    silk: 2.0,
    wool: 1.5,
    jute: 0.9,
    linen: 1.4,
    default: 1.0
  },

  sculpture: {
    base: 1200,
    stone: 2.5,
    metal: 3.0,
    clay: 1.0,
    wood: 1.8,
    default: 1.0
  },

  bakery: {
    base: 300,
    flour: 1.0,
    wheat: 1.0,
    chocolate: 1.8,
    default: 1.0
  },

  'musical instruments': {
    base: 600,
    bamboo: 1.0,
    wood: 1.8,
    brass: 2.0,
    default: 1.0
  },

  default: {
    base: 500,
    default: 1.0
  }
};

const SIZE_MULTIPLIERS = {
  small: 0.8,
  medium: 1.0,
  large: 1.4,
  xl: 1.8
};


function calculateSuggestedPrice(
  category,
  material,
  size
) {

  const normalizedCategory =
    String(
      category || 'default'
    )
      .trim()
      .toLowerCase();

  const normalizedMaterial =
    String(
      material || 'default'
    )
      .trim()
      .toLowerCase();

  const normalizedSize =
    String(
      size || 'medium'
    )
      .trim()
      .toLowerCase();

  const categoryData =
    PRICING_MATRIX[
      normalizedCategory
    ] ||
    PRICING_MATRIX.default;

  const materialMultiplier =
    categoryData[
      normalizedMaterial
    ] ||
    categoryData.default ||
    1;

  const sizeMultiplier =
    SIZE_MULTIPLIERS[
      normalizedSize
    ] || 1;

  const suggestedPrice =
    Math.round(
      categoryData.base *
      materialMultiplier *
      sizeMultiplier
    );

  const min =
    Math.round(
      suggestedPrice * 0.9
    );

  const max =
    Math.round(
      suggestedPrice * 1.15
    );

  return {
    suggestedPrice,
    priceRange: {
      min,
      max
    },
    inputs: {
      category,
      material,
      size
    }
  };
}


app.post(
  '/api/ai/suggest-price',
  (req, res) => {

    try {
      const {
        category,
        material,
        size
      } = req.body || {};

      const pricing =
        calculateSuggestedPrice(
          category,
          material,
          size
        );

      return res.json({
        success: true,
        pricing,
        suggestedPrice:
          pricing.suggestedPrice,
        priceRange:
          pricing.priceRange,
        label:
          'AI-suggested price'
      });

    } catch (error) {
      console.error(
        'Pricing error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Pricing estimation failed.'
      });
    }
  }
);


// Keep old endpoint compatible.
app.post(
  '/api/ai/pricing',
  (req, res) => {

    const {
      category,
      material,
      size
    } = req.body || {};

    const pricing =
      calculateSuggestedPrice(
        category,
        material,
        size
      );

    return res.json({
      success: true,
      pricing,
      suggestedPrice:
        pricing.suggestedPrice
    });
  }
);


// ============================================================
// IMAGE ENHANCER
// remove.bg + client-side brightness/contrast
// ============================================================

function dataUrlToBuffer(
  dataUrl
) {

  const match =
    String(dataUrl || '')
      .match(
        /^data:(.+?);base64,(.+)$/
      );

  if (!match) {
    throw new Error(
      'Invalid image data.'
    );
  }

  return {
    mimeType: match[1],
    buffer:
      Buffer.from(
        match[2],
        'base64'
      )
  };
}


app.post(
  '/api/ai/remove-background',
  async (req, res) => {

    try {
      const {
        imageData
      } = req.body || {};

      if (!imageData) {
        return res.status(400).json({
          success: false,
          message:
            'Image data is required.'
        });
      }

      if (!REMOVE_BG_API_KEY) {
        return res.status(500).json({
          success: false,
          message:
            'REMOVE_BG_API_KEY is not configured on the server.'
        });
      }

      const {
        mimeType,
        buffer
      } =
        dataUrlToBuffer(
          imageData
        );

      const form =
        new FormData();

      const blob =
        new Blob(
          [buffer],
          {
            type:
              mimeType ||
              'image/jpeg'
          }
        );

      form.append(
        'image_file',
        blob,
        'product-image'
      );

      form.append(
        'size',
        'auto'
      );

      const response =
        await fetch(
          'https://api.remove.bg/v1.0/removebg',
          {
            method: 'POST',
            headers: {
              'X-Api-Key':
                REMOVE_BG_API_KEY
            },
            body: form
          }
        );

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          'remove.bg error:',
          errorText
        );

        return res.status(
          response.status
        ).json({
          success: false,
          message:
            'remove.bg failed to process the image.'
        });
      }

      const arrayBuffer =
        await response.arrayBuffer();

      const output =
        Buffer.from(
          arrayBuffer
        ).toString('base64');

      return res.json({
        success: true,
        imageData:
          `data:image/png;base64,${output}`
      });

    } catch (error) {
      console.error(
        'Background removal error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          'Background removal failed.'
      });
    }
  }
);


// ============================================================
// GOOGLE TRANSLATE
// ============================================================

async function translateToEnglish(
  text,
  sourceLanguage
) {

  if (
    !GOOGLE_TRANSLATE_API_KEY
  ) {
    throw new Error(
      'GOOGLE_TRANSLATE_API_KEY is not configured.'
    );
  }

  const url =
    new URL(
      'https://translation.googleapis.com/language/translate/v2'
    );

  url.searchParams.set(
    'key',
    GOOGLE_TRANSLATE_API_KEY
  );

  const body = {
    q: text,
    target: 'en',
    format: 'text'
  };

  if (
    sourceLanguage &&
    sourceLanguage !== 'auto'
  ) {
    body.source =
      sourceLanguage;
  }

  const response =
    await fetch(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json'
        },
        body:
          JSON.stringify(body)
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data?.data?.translations?.[0]
  ) {
    console.error(
      'Google Translate error:',
      data
    );

    throw new Error(
      'Google Translate failed.'
    );
  }

  return {
    text:
      data
        .data
        .translations[0]
        .translatedText,

    detectedLanguage:
      data
        .data
        .translations[0]
        .detectedSourceLanguage ||
      sourceLanguage ||
      'unknown'
  };
}


// ============================================================
// OPENAI WHISPER
// ============================================================

async function transcribeAudio(
  buffer,
  mimeType,
  filename,
  language
) {

  if (!OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is not configured.'
    );
  }

  const form =
    new FormData();

  const blob =
    new Blob(
      [buffer],
      {
        type:
          mimeType ||
          'audio/webm'
      }
    );

  form.append(
    'file',
    blob,
    filename ||
      'recording.webm'
  );

  form.append(
    'model',
    OPENAI_TRANSCRIBE_MODEL
  );

  if (language) {
    form.append(
      'language',
      language
    );
  }

  const response =
    await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization:
            `Bearer ${OPENAI_API_KEY}`
        },
        body: form
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.text
  ) {

    console.error(
      'OpenAI transcription error:',
      data
    );

    throw new Error(
      data?.error?.message ||
      'Speech transcription failed.'
    );
  }

  return data.text;
}


// ============================================================
// OPENAI SEO CATALOG GENERATOR
// ============================================================

function extractJson(
  text
) {

  const cleaned =
    String(text || '')
      .trim()
      .replace(
        /^```json/i,
        ''
      )
      .replace(
        /^```/,
        ''
      )
      .replace(
        /```$/,
        ''
      )
      .trim();

  try {
    return JSON.parse(
      cleaned
    );
  } catch {
    const start =
      cleaned.indexOf('{');

    const end =
      cleaned.lastIndexOf('}');

    if (
      start >= 0 &&
      end > start
    ) {
      return JSON.parse(
        cleaned.slice(
          start,
          end + 1
        )
      );
    }

    throw new Error(
      'LLM did not return valid JSON.'
    );
  }
}


async function generateCatalog(
  translatedText,
  originalText,
  detectedLanguage,
  category,
  material
) {

  if (!OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is not configured.'
    );
  }

  const prompt = `
You are an expert Indian handicraft marketplace catalog writer.

Create an accurate, attractive and SEO-friendly product listing from the artisan's spoken description.

Do not invent specific facts that were not provided.

Return ONLY valid JSON in exactly this structure:

{
  "titleEn": "short SEO-friendly English product title",
  "titleHi": "natural Hindi product title",
  "descriptionEn": "polished English product description",
  "descriptionHi": "natural Hindi product description",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "category": "best category",
  "material": "best material"
}

Original spoken text:
${originalText}

Google-translated English:
${translatedText}

Detected language:
${detectedLanguage || 'unknown'}

Existing category:
${category || 'Handicrafts'}

Existing material:
${material || 'Not specified'}
`;

  const response =
    await fetch(
      'https://api.openai.com/v1/responses',
      {
        method: 'POST',
        headers: {
          Authorization:
            `Bearer ${OPENAI_API_KEY}`,
          'Content-Type':
            'application/json'
        },
        body:
          JSON.stringify({
            model:
              OPENAI_CATALOG_MODEL,
            input:
              prompt
          })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      'OpenAI catalog error:',
      data
    );

    throw new Error(
      data?.error?.message ||
      'Catalog generation failed.'
    );
  }

  const outputText =
    data.output_text ||
    '';

  return extractJson(
    outputText
  );
}


// ============================================================
// MULTILINGUAL CATALOGER
// Whisper -> Google Translate -> GPT
// ============================================================

app.post(
  '/api/ai/catalog-product',
  async (req, res) => {

    try {

      const {
        audioData,
        language,
        transcript,
        category,
        material
      } = req.body || {};

      let originalText =
        String(
          transcript || ''
        ).trim();

      let detectedLanguage =
        language || '';

      // --------------------------------------------------------
      // 1. WHISPER
      // --------------------------------------------------------

      if (
        audioData
      ) {

        const {
          mimeType,
          buffer
        } =
          dataUrlToBuffer(
            audioData
          );

        originalText =
          await transcribeAudio(
            buffer,
            mimeType,
            'catalog-recording.webm',
            language
          );
      }

      if (!originalText) {
        return res.status(400).json({
          success: false,
          message:
            'Audio or transcript is required.'
        });
      }

      // --------------------------------------------------------
      // 2. GOOGLE TRANSLATE
      // --------------------------------------------------------

      const translation =
        await translateToEnglish(
          originalText,
          language
        );

      detectedLanguage =
        translation.detectedLanguage;

      // --------------------------------------------------------
      // 3. GPT SEO CATALOG
      // --------------------------------------------------------

      const catalog =
        await generateCatalog(
          translation.text,
          originalText,
          detectedLanguage,
          category,
          material
        );

      return res.json({
        success: true,

        pipeline: {
          speechToText:
            'OpenAI Whisper',
          translation:
            'Google Translate',
          catalogGeneration:
            'OpenAI GPT'
        },

        transcript:
          originalText,

        translatedText:
          translation.text,

        detectedLanguage,

        catalog
      });

    } catch (error) {

      console.error(
        'Multilingual catalog error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          'Multilingual cataloging failed.'
      });
    }
  }
);


// ============================================================
// SIMPLE AI CATALOG COMPATIBILITY ENDPOINT
// ============================================================

app.post(
  '/api/ai/catalog',
  async (req, res) => {

    try {

      const {
        productName,
        description,
        category,
        material
      } = req.body || {};

      const source =
        description ||
        productName ||
        '';

      if (!source) {
        return res.status(400).json({
          success: false,
          message:
            'Product description is required.'
        });
      }

      const catalog =
        await generateCatalog(
          source,
          source,
          'en',
          category,
          material
        );

      return res.json({
        success: true,
        catalog
      });

    } catch (error) {

      console.error(
        'Catalog error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          'Catalog generation failed.'
      });
    }
  }
);


// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
  (err, req, res, next) => {

    console.error(
      'Unhandled API error:',
      err
    );

    res.status(500).json({
      success: false,
      message:
        'Internal server error.'
    });
  }
);


// ============================================================
// START SERVER
// ============================================================

app.listen(
  PORT,
  () => {

    console.log('');
    console.log(
      '=========================================='
    );
    console.log(
      '        DESI DISTRICT API SERVER'
    );
    console.log(
      '=========================================='
    );
    console.log(
      `Server: http://localhost:${PORT}`
    );
    console.log(
      `Health: http://localhost:${PORT}/api/health`
    );
    console.log(
      `remove.bg: ${
        REMOVE_BG_API_KEY
          ? 'CONFIGURED'
          : 'NOT CONFIGURED'
      }`
    );
    console.log(
      `OpenAI: ${
        OPENAI_API_KEY
          ? 'CONFIGURED'
          : 'NOT CONFIGURED'
      }`
    );
    console.log(
      `Google Translate: ${
        GOOGLE_TRANSLATE_API_KEY
          ? 'CONFIGURED'
          : 'NOT CONFIGURED'
      }`
    );
    console.log(
      '=========================================='
    );
    console.log('');
  }
);