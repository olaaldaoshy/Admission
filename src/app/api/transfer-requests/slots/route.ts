/**
 * GET /api/transfer-requests/slots?date=YYYY-MM-DD
 *   Assessment time slots still bookable on that date (Cairo time),
 *   with remaining capacity. Past and fully-booked slots are excluded.
 *
 * Auth: header `x-api-key: <TRANSFER_API_KEY>`
 */
import { ApiError, getDb, handle, isIsoDate, json, loadSlots, requireApiKey } from "@/lib/transfer-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    requireApiKey(req);
    const date = new URL(req.url).searchParams.get("date")?.trim() || "";
    if (!isIsoDate(date)) {
      throw new ApiError(400, "INVALID_DATE", "Query parameter date is required in YYYY-MM-DD format");
    }
    const { open } = await loadSlots(getDb(), date);
    return json({ date, slots: open });
  });
}
