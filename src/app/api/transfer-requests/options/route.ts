/**
 * GET /api/transfer-requests/options
 *   Campuses → systems (schools) → grades the admissions form currently offers.
 *   Use these exact names in transfer.fromCampus / toCampus / toSchool / toGrade.
 *
 * Auth: header `x-api-key: <TRANSFER_API_KEY>`
 */
import { ENUMS, getDb, handle, json, loadCatalog, requireApiKey } from "@/lib/transfer-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    requireApiKey(req);
    const catalog = await loadCatalog(getDb());
    return json({ ...catalog, enums: ENUMS });
  });
}
