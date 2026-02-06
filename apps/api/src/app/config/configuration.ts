export default () => ({
  port: parseInt(process.env.API_PORT || process.env.PORT || "3001", 10),
  database: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public",
  },
  cors: {
    origins: process.env.CORS_ORIGINS,
  },
});
