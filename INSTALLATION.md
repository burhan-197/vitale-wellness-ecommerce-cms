# Installation

## Requirements

- Node.js 20+
- MongoDB 7+ or a compatible MongoDB service

## Setup

1. Extract the project.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Configure MongoDB and your session secret.
5. Run `npm start`.
6. Visit `/admin` and complete first-admin setup.

Product uploads are saved to `public/uploads/products`, so use persistent disk storage if you deploy the Lite edition to a platform with an ephemeral filesystem.
