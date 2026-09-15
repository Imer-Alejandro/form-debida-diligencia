import { readOneDriveState } from "@/lib/onedrive";

export async function GET() {
  const state = await readOneDriveState();
  return Response.json(state);
}