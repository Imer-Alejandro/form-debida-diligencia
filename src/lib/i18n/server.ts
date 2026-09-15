import { cookies } from "next/headers";
import { es, type EsDict } from "./es";
import { en } from "./en";

export type ServerDict = EsDict;

export async function getServerDict(): Promise<ServerDict> {
  const store = await cookies();
  const lang = store.get("sb_lang")?.value === "en" ? "en" : "es";
  return lang === "en" ? (en as unknown as ServerDict) : es;
}