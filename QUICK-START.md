# Quick Start

```bash
cp .env.example .env
npm install
npm start
```

Then open `http://localhost:3000/admin` and create the first admin account.

Required `.env` values:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/vitale_cms_lite
SESSION_SECRET=use-a-long-random-secret
```

For a fresh public deployment, also set `ADMIN_SETUP_TOKEN` before opening `/admin/setup`.
