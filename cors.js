export const corsOptions = {
  origin: function (origin, callback) {
    // Allow any origin
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}