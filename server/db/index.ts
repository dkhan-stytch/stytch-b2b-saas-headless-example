import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import {
  ideas,
  type NewIdea,
  type Idea,
} from "./schema.js";
import { eq } from "drizzle-orm";

const sqlite = new Database("./db/squircle-demo.db");
const db = drizzle(sqlite);

export async function addIdea(idea: NewIdea) {
  return await db.insert(ideas).values(idea).returning();
}

export async function deleteIdea(ideaId: Idea["id"]) {
  return await db.delete(ideas).where(eq(ideas.id, ideaId)).returning();
}

// joins the ideas and users tables to select ideas with creator name
export async function getIdeas(orgId: string) {
  return await db
    .select({
      id: ideas.id,
      text: ideas.text,
      status: ideas.status,
      creator: ideas.creator,
    })
    .from(ideas)
    .where(eq(ideas.team, orgId))
}
