/**
 * POST /api/transfer-requests
 *   Create an Internal Transfer application from the Parent App.
 *   The application is saved under the student's BLB id (applications/{blbId});
 *   no sequential number is generated.
 *   Retry-safe: re-sending the same blbId + parentAppRequestId returns the
 *   existing application (200, duplicate: true). A different request for a
 *   blbId that already has an application is rejected (409 ID_ALREADY_EXISTS).
 *
 * GET /api/transfer-requests?parentAppRequestId=...
 *   Look up an application by the Parent App's own request id.
 *
 * Auth: header `x-api-key: <TRANSFER_API_KEY>`
 */
import {
  ApiError,
  createApplication,
  findByParentAppRequestId,
  getApplication,
  getDb,
  handle,
  json,
  loadCatalog,
  loadSlots,
  requireApiKey,
  slotMinutes,
  toSummary,
  validateTransferRequest,
} from "@/lib/transfer-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    requireApiKey(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON");
    }

    const db = getDb();
    const catalog = await loadCatalog(db);
    const { blbId, parentAppRequestId, appointment, application } = validateTransferRequest(body, catalog);

    // One application per BLB id. Same request re-sent → return it; anything else → conflict.
    const existing = await getApplication(db, blbId);
    if (existing) return alreadyExists(existing, parentAppRequestId);

    // The chosen slot must exist for that date, not be in the past, and have room.
    const { open, full } = await loadSlots(db, appointment.date);
    const wanted = slotMinutes(appointment.time);
    const same = (t: string) =>
      wanted !== null ? slotMinutes(t) === wanted : t.trim().toLowerCase() === appointment.time.toLowerCase();
    const slot = open.find((s) => same(s.time));
    if (!slot) {
      if (full.some((s) => same(s.time))) {
        throw new ApiError(409, "SLOT_FULL", "This assessment slot is fully booked. Pick another slot.");
      }
      throw new ApiError(422, "SLOT_NOT_AVAILABLE", "No bookable assessment slot at this date/time.", {
        "appointment.time": open.length
          ? `Available on ${appointment.date}: ${open.map((s) => s.time).join(", ")}`
          : `No open slots on ${appointment.date}`,
      });
    }
    application.interviewTime = slot.time; // store the exact slot name the admissions UI uses

    const created = await createApplication(db, blbId, application);
    if (!created) {
      // Lost a race with a concurrent request for the same BLB id.
      const now = await getApplication(db, blbId);
      if (now) return alreadyExists(now, parentAppRequestId);
      throw new ApiError(500, "INTERNAL_ERROR", "Could not save the application");
    }
    return json({ ...toSummary(created), duplicate: false }, 201);
  });
}

function alreadyExists(existing: Record<string, any>, parentAppRequestId: string) {
  if (existing.source === "parent-app" && existing.parentAppRequestId === parentAppRequestId) {
    return json({ ...toSummary(existing), duplicate: true }, 200);
  }
  throw new ApiError(
    409,
    "ID_ALREADY_EXISTS",
    `An application with id ${existing.id} already exists in Admissions.`,
    {
      blbId:
        existing.source === "parent-app"
          ? `Already used by transfer request ${existing.parentAppRequestId} (status: ${existing.status ?? "unknown"})`
          : "Already used by an application submitted through the admission form",
    }
  );
}

export async function GET(req: Request) {
  return handle(async () => {
    requireApiKey(req);
    const requestId = new URL(req.url).searchParams.get("parentAppRequestId")?.trim();
    if (!requestId) {
      throw new ApiError(400, "MISSING_PARAM", "Query parameter parentAppRequestId is required");
    }
    const app = await findByParentAppRequestId(getDb(), requestId);
    if (!app) throw new ApiError(404, "NOT_FOUND", "No transfer request with this parentAppRequestId");
    return json(toSummary(app));
  });
}
