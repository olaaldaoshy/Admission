/**
 * GET /api/transfer-requests/{id}
 *   Current status of a transfer application created through this API.
 *
 * Auth: header `x-api-key: <TRANSFER_API_KEY>`
 */
import { doc, getDoc } from "firebase/firestore";
import { ApiError, getDb, handle, json, requireApiKey, toSummary } from "@/lib/transfer-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    requireApiKey(req);
    const { id } = await params;
    if (!/^\d{1,12}$/.test(id)) throw new ApiError(404, "NOT_FOUND", "Transfer request not found");
    const snap = await getDoc(doc(getDb(), "applications", id));
    const data = snap.exists() ? snap.data() : null;
    // Only expose applications that came from the Parent App.
    if (!data || data.source !== "parent-app") {
      throw new ApiError(404, "NOT_FOUND", "Transfer request not found");
    }
    return json(toSummary({ ...data, id: snap.id }));
  });
}
