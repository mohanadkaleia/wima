import { db } from "@/server/db";

export function createContext() {
  return { db };
}

export type Context = ReturnType<typeof createContext>;
