const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { connectDatabase } = require('./config/database');
const { exposeSession } = require('./middleware/auth');
const { attachCsrf, verifyStandardPosts } = require('./middleware/csrf');
const { formatMoney } = require('./utils/money');

if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set.');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(rateLimit({ windowMs: 60 * 1000, max: 240, standardHeaders: true, legacyHeaders: false }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0 }));
app.use(session({
  name: 'vitale_lite_sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'sessions' }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));
app.use(attachCsrf);
app.use(verifyStandardPosts);
app.use(exposeSession);
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.cartCount = 0;
  res.locals.formatMoney = formatMoney;
  next();
});

app.use(require('./routes/adminAuth'));
app.use(require('./routes/adminProducts'));
app.use(require('./routes/adminCategories'));
app.use(require('./routes/adminOrders'));
app.use(require('./routes/storefront'));

app.use((req, res) => res.status(404).render('public/pages/not-found', { title: 'Page not found', metaDescription: 'Page not found.' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).render('public/pages/server-error', { title: 'Server error', metaDescription: 'Something went wrong.' });
});

async function start() {
  await connectDatabase();
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`Vitale CMS Lite running on http://localhost:${port}`));
}

if (require.main === module) {
  start().catch(error => {
    console.error('Startup failed:', error);
    process.exit(1);
  });
}

module.exports = { app, start };
