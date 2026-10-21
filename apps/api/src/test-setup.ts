if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL must point to a disposable PostgreSQL database; tests may create and delete records.",
  );
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DIRECT_URL = process.env.TEST_DIRECT_URL || process.env.TEST_DATABASE_URL;
process.env.SESSION_SECRET = "test-secret-at-least-32-characters-long";
