import { SQLDatabase } from "encore.dev/storage/sqldb";

export const organismDB = new SQLDatabase("organism", {
  migrations: "./migrations",
});
