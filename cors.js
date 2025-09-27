export const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://d76kqh-3000.csb.app',
    'https://codesandbox.io'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}