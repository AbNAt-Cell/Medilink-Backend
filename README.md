# Medilink-Backend

## Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with:
   ```
   MONGODB_URL
   PORT
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

## Features

- Express server with health check endpoint (`/health`)
- MongoDB connection via Mongoose
- Auth routes (`/api/auth`) for signup and login
- Uses `bcryptjs` for password hashing
- CORS enabled


## Scripts

- `npm run dev` — Start server with nodemon
- `npm run serve` — Start server with node