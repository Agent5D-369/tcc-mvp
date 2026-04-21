import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let database: Database | null = null;
let queryClient: ReturnType<typeof postgres> | null = null;

function createDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  queryClient = postgres(connectionString, {
    max: 10,
    prepare: false,
  });

  return drizzle(queryClient, { schema });
}

function getDatabase() {
  if (!database) {
    database = createDatabase();
  }

  return database;
}

export const db = new Proxy({} as Database, {
  get(_, prop, receiver) {
    return Reflect.get(getDatabase() as object, prop, receiver);
  },
});
