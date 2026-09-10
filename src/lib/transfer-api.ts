/**
 * Internal Transfer API — shared server logic.
 *
 * Used by the routes under /api/transfer-requests so the Parent App backend can
 * create internal-transfer applications without going through the web form.
 * Writes exactly the same `applications/{id}` document shape as
 * src/app/application-form/page.tsx, plus a few transfer-only fields.
 *
 * Server-only. Auth: `x-api-key` header must equal env TRANSFER_API_KEY.
 */
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  runTransaction,
  type Firestore,
} from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

/* ------------------------------------------------------------------ */
/* Firestore                                                           */
/* ------------------------------------------------------------------ */

const APP_NAME = "transfer-api-server";
let cachedDb: Firestore | null = null;

export function getDb(): Firestore {
  if (cachedDb) return cachedDb;
  const cfg = firebaseConfig as Record<string, any>;
  const app = getApps().find((a) => a.name === APP_NAME) ?? initializeApp(cfg, APP_NAME);
  const db = getFirestore(app, cfg.firestoreDatabaseId || "(default)");
  // Local testing only: point at the Firestore emulator when this env var is set.
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  if (emulator) {
    const [host, port] = emulator.split(":");
    connectFirestoreEmulator(db, host, Number(port));
  }
  cachedDb = db;
  return db;
}

/* ------------------------------------------------------------------ */
/* Errors, auth, response helpers                                      */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string>
  ) {
    super(message);
  }
}

export function requireApiKey(req: Request) {
  const expected = process.env.TRANSFER_API_KEY;
  if (!expected) {
    throw new ApiError(500, "NOT_CONFIGURED", "TRANSFER_API_KEY is not set on the server");
  }
  const given = Buffer.from(req.headers.get("x-api-key") || "");
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    throw new ApiError(401, "UNAUTHORIZED", "Missing or invalid x-api-key header");
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e: any) {
    if (e instanceof ApiError) {
      return json(
        { error: { code: e.code, message: e.message, ...(e.details ? { details: e.details } : {}) } },
        e.status
      );
    }
    console.error("[transfer-api] unexpected error:", e);
    return json({ error: { code: "INTERNAL_ERROR", message: "Unexpected server error" } }, 500);
  }
}

/* ------------------------------------------------------------------ */
/* Dates & times (school runs on Cairo time)                           */
/* ------------------------------------------------------------------ */

const TZ = "Africa/Cairo";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function isIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function weekdayOf(date: string): string {
  return DAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

function cairoNow(): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** "10:00 AM" / "2:30 PM" / "14:30" → minutes since midnight. */
export function slotMinutes(name: string): number | null {
  const s = (name || "").trim().toUpperCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  if (m[3] === "PM" && h < 12) h += 12;
  if (m[3] === "AM" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/* ------------------------------------------------------------------ */
/* Catalog: campus → school (system) → grade                           */
/* Mirrors the option logic of the admission form.                     */
/* ------------------------------------------------------------------ */

export type Catalog = {
  campuses: { name: string; schools: { name: string; grades: string[] }[] }[];
};

const FALLBACK_SCHOOLS = ["American", "IB", "International Girls Only, British"];

export async function loadCatalog(db: Firestore): Promise<Catalog> {
  const [campusSnap, schoolSnap, gradeSnap] = await Promise.all([
    getDocs(collection(db, "campus")),
    getDocs(collection(db, "schools")),
    getDocs(collection(db, "grade")),
  ]);
  const campuses = campusSnap.docs
    .map((d) => ({ id: d.id, name: String(d.data().name || "").trim() }))
    .filter((c) => c.name);
  const grades = gradeSnap.docs
    .map((d) => ({ id: d.id, name: String(d.data().name || "").trim() }))
    .filter((g) => g.name);
  const allGradeNames = grades.map((g) => g.name);

  // Systems offered when a campus has no mapping (same fallback as the form).
  const campusNames = new Set(campuses.map((c) => c.name.toLowerCase()));
  const fallback: string[] = [];
  for (const s of schoolSnap.docs) {
    const n = String(s.data().name || "").trim();
    if (n && !campusNames.has(n.toLowerCase()) && !fallback.includes(n)) fallback.push(n);
  }
  for (const n of FALLBACK_SCHOOLS) {
    if (!fallback.includes(n) && !campusNames.has(n.toLowerCase())) fallback.push(n);
  }

  const mappings = await Promise.all(campuses.map((c) => getDoc(doc(db, "campus_mappings", c.id))));

  return {
    campuses: campuses.map((c, i) => {
      const map = mappings[i].exists() ? (mappings[i].data() as any) : null;
      const mapped = map?.schools && Object.keys(map.schools).length > 0 ? map.schools : null;
      if (!mapped) {
        return { name: c.name, schools: fallback.map((n) => ({ name: n, grades: allGradeNames })) };
      }
      return {
        name: c.name,
        schools: Object.entries(mapped)
          .map(([, sData]: [string, any]) => {
            const gradeIds = sData?.grades ? Object.keys(sData.grades) : [];
            const filtered = grades.filter((g) => gradeIds.includes(g.id)).map((g) => g.name);
            return {
              name: String(sData?.name || "").trim(),
              grades: filtered.length > 0 ? filtered : allGradeNames,
            };
          })
          .filter((s) => s.name),
      };
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Assessment slots                                                     */
/* ------------------------------------------------------------------ */

export type Slot = { time: string; capacity: number; booked: number; available: number };

/** Bookable (not past) assessment slots for a date, same rules as the form. */
export async function loadSlots(db: Firestore, date: string): Promise<{ open: Slot[]; full: Slot[] }> {
  const [settingsSnap, appsSnap] = await Promise.all([
    getDocs(query(collection(db, "settings"), where("type", "==", "assessment_time"))),
    getDocs(query(collection(db, "applications"), where("interviewDate", "==", date))),
  ]);

  const booked: Record<string, number> = {};
  appsSnap.docs.forEach((d) => {
    const t = d.data().interviewTime;
    if (t) booked[t] = (booked[t] || 0) + 1;
  });

  const now = cairoNow();
  const day = weekdayOf(date);
  const byTime = new Map<string, Slot>();

  settingsSnap.docs.forEach((d) => {
    const s = d.data() as any;
    const applies = s.date === date || (!s.date && s.day === day);
    if (!applies || !s.name) return;
    const time = String(s.name);
    const mins = slotMinutes(time);
    const past = date < now.date || (date === now.date && mins !== null && mins <= now.minutes);
    if (past) return;
    const capacity = parseInt(s.capacity) || 1;
    const prev = byTime.get(time);
    if (prev && prev.capacity >= capacity) return;
    const b = booked[time] || 0;
    byTime.set(time, { time, capacity, booked: b, available: Math.max(0, capacity - b) });
  });

  const all = [...byTime.values()].sort(
    (a, b) => (slotMinutes(a.time) ?? 9999) - (slotMinutes(b.time) ?? 9999)
  );
  return { open: all.filter((s) => s.available > 0), full: all.filter((s) => s.available === 0) };
}

/* ------------------------------------------------------------------ */
/* Request validation → application document                           */
/* ------------------------------------------------------------------ */

const EN_NAME = /^[a-zA-Z\s]+$/;
const AR_NAME = /^[\u0600-\u06FF\s]+$/;
const EG_MOBILE = /^01[0125]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NATIONAL_ID = /^\d{14}$/;
const REQUEST_ID = /^[A-Za-z0-9_.:\-]{1,100}$/;
const BLB_ID = /^\d{1,10}$/;

export const ENUMS = {
  religion: ["Muslim", "Christian", "Other"],
  secondLanguage: ["French", "German", "Other"],
  gender: ["Male", "Female"],
  occupation: ["Manager", "Teacher", "Engineer", "Doctor", "Private Business", "Housewife", "Other"],
  transferType: ["Full-year", "Mid-year"],
};

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const wordCount = (v: string) => v.split(/\s+/).filter(Boolean).length;

/** Case-insensitive match against an allowed list; returns the canonical value. */
const pick = (v: string, list: string[]) => list.find((x) => x.toLowerCase() === v.toLowerCase());

export type ValidatedRequest = {
  blbId: string;
  parentAppRequestId: string;
  appointment: { date: string; time: string };
  application: Record<string, unknown>;
};

export function validateTransferRequest(raw: unknown, catalog: Catalog): ValidatedRequest {
  const body = obj(raw);
  const student = obj(body.student);
  const address = obj(body.address);
  const father = obj(body.father);
  const mother = obj(body.mother);
  const transfer = obj(body.transfer);
  const appointment = obj(body.appointment);
  const errors: Record<string, string> = {};

  const required = (path: string, v: string) => {
    if (!v) errors[path] = "Required";
    return v;
  };
  const english = (path: string, v: string, isRequired: boolean) => {
    if (!v) {
      if (isRequired) errors[path] = "Required";
    } else if (!EN_NAME.test(v)) errors[path] = "English letters and spaces only";
    return v;
  };
  const arabic = (path: string, v: string, isRequired: boolean, minWords = 0) => {
    if (!v) {
      if (isRequired) errors[path] = "Required";
    } else if (!AR_NAME.test(v)) errors[path] = "Arabic letters only";
    else if (minWords && wordCount(v) < minWords) errors[path] = `Full name required (at least ${minWords} words)`;
    return v;
  };
  const oneOf = (path: string, v: string, list: string[], isRequired: boolean) => {
    if (!v) {
      if (isRequired) errors[path] = "Required";
      return "";
    }
    const hit = pick(v, list);
    if (!hit) errors[path] = `Must be one of: ${list.join(", ")}`;
    return hit || v;
  };
  const pattern = (path: string, v: string, re: RegExp, msg: string, isRequired: boolean) => {
    if (!v) {
      if (isRequired) errors[path] = "Required";
    } else if (!re.test(v)) errors[path] = msg;
    return v;
  };
  const date = (path: string, v: string, isRequired: boolean) => {
    if (!v) {
      if (isRequired) errors[path] = "Required";
    } else if (!isIsoDate(v)) errors[path] = "Use YYYY-MM-DD";
    return v;
  };

  // --- request meta ---
  const parentAppRequestId = pattern(
    "parentAppRequestId",
    str(body.parentAppRequestId),
    REQUEST_ID,
    "1–100 chars: letters, digits, _ . : -",
    true
  );
  const transferType = oneOf("transferType", str(body.transferType), ENUMS.transferType, false);
  // BLB id becomes the application id as-is (no new number is generated).
  const blbId = pattern("blbId", str(body.blbId), BLB_ID, "Digits only, up to 10", true);
  let consents: Record<string, unknown> | null = null;
  if (body.consents !== undefined && body.consents !== null) {
    if (typeof body.consents !== "object" || Array.isArray(body.consents)) errors["consents"] = "Must be an object";
    else if (JSON.stringify(body.consents).length > 5000) errors["consents"] = "Too large";
    else consents = JSON.parse(JSON.stringify(body.consents));
  }

  // --- transfer: from / to ---
  const campusNames = catalog.campuses.map((c) => c.name);
  let fromCampus = required("transfer.fromCampus", str(transfer.fromCampus));
  if (fromCampus) {
    const hit = pick(fromCampus, campusNames);
    if (!hit) errors["transfer.fromCampus"] = `Unknown campus. Valid: ${campusNames.join(", ")}`;
    fromCampus = hit || fromCampus;
  }
  let toCampus = required("transfer.toCampus", str(transfer.toCampus));
  let toSchool = required("transfer.toSchool", str(transfer.toSchool));
  let toGrade = required("transfer.toGrade", str(transfer.toGrade));
  const campus = catalog.campuses.find((c) => c.name.toLowerCase() === toCampus.toLowerCase());
  if (toCampus && !campus) errors["transfer.toCampus"] = `Unknown campus. Valid: ${campusNames.join(", ")}`;
  if (campus) {
    toCampus = campus.name;
    const school = campus.schools.find((s) => s.name.toLowerCase() === toSchool.toLowerCase());
    if (toSchool && !school)
      errors["transfer.toSchool"] = `Not offered at ${campus.name}. Valid: ${campus.schools.map((s) => s.name).join(", ")}`;
    if (school) {
      toSchool = school.name;
      const grade = pick(toGrade, school.grades);
      if (toGrade && !grade) errors["transfer.toGrade"] = `Not offered in ${campus.name} / ${school.name}`;
      toGrade = grade || toGrade;
    }
  }
  const previousSchool = required("transfer.previousSchool", str(transfer.previousSchool));
  const reason = str(transfer.reason);

  // --- student ---
  const firstName = english("student.firstName", str(student.firstName), true);
  const lastName = english("student.lastName", str(student.lastName), true);
  const arabicName = arabic("student.arabicName", str(student.arabicName), true, 4);
  const dateOfBirth = date("student.dateOfBirth", str(student.dateOfBirth), true);
  const nationalId = pattern("student.nationalId", str(student.nationalId), NATIONAL_ID, "Must be 14 digits", false);
  const religion = oneOf("student.religion", str(student.religion), ENUMS.religion, true);
  const citizenship = required("student.citizenship", str(student.citizenship));
  const secondLanguage = oneOf("student.secondLanguage", str(student.secondLanguage), ENUMS.secondLanguage, true);
  const gender = oneOf("student.gender", str(student.gender), ENUMS.gender, true);

  // --- address ---
  const governorate = required("address.governorate", str(address.governorate));
  const city = required("address.city", str(address.city));
  const street = required("address.street", str(address.street));
  const compound = str(address.compound);

  // --- parents ---
  const parent = (p: Record<string, unknown>, key: "father" | "mother", isFather: boolean) => ({
    firstName: english(`${key}.firstName`, str(p.firstName), isFather),
    lastName: english(`${key}.lastName`, str(p.lastName), isFather),
    arabicName: arabic(`${key}.arabicName`, str(p.arabicName), false, isFather ? 4 : 0),
    dateOfBirth: date(`${key}.dateOfBirth`, str(p.dateOfBirth), false),
    phone: pattern(`${key}.phone`, str(p.phone), EG_MOBILE, "Egyptian mobile, 11 digits, e.g. 01012345678", isFather),
    email: pattern(`${key}.email`, str(p.email), EMAIL, "Invalid email", false),
    nationalId: pattern(`${key}.nationalId`, str(p.nationalId), NATIONAL_ID, "Must be 14 digits", false),
    academicDegree: str(p.academicDegree),
    occupation: oneOf(`${key}.occupation`, str(p.occupation), ENUMS.occupation, false),
    company: str(p.company),
  });
  const f = parent(father, "father", true);
  const m = parent(mother, "mother", false);

  // --- appointment ---
  const apptDate = date("appointment.date", str(appointment.date), true);
  const apptTime = required("appointment.time", str(appointment.time));

  if (Object.keys(errors).length > 0) {
    throw new ApiError(422, "VALIDATION_ERROR", "Some fields are missing or invalid", errors);
  }

  const now = new Date().toISOString();
  const join = (a: string, b: string) => `${a} ${b}`.trim();

  // Same field set as the admission form, in the same order.
  const application: Record<string, unknown> = {
    firstName,
    lastName,
    arabicName,
    dateOfBirth,
    nationalId,
    religion,
    citizenship,
    secondLanguage,
    gender,
    governorate,
    city,
    street,
    compound,
    hearAbout: "",
    campus: toCampus,
    school: toSchool,
    grade: toGrade,
    category: "Internal Transfer",
    previousSchool,
    previousCampus: fromCampus,
    notes: reason,
    fatherFirstName: f.firstName,
    fatherLastName: f.lastName,
    fatherArabicName: f.arabicName,
    fatherDOB: f.dateOfBirth,
    fatherPhone: f.phone,
    fatherEmail: f.email,
    fatherNationalId: f.nationalId,
    fatherAcademicDegree: f.academicDegree,
    fatherOccupation: f.occupation,
    fatherCompanyBusiness: f.company,
    motherFirstName: m.firstName,
    motherLastName: m.lastName,
    motherArabicName: m.arabicName,
    motherDOB: m.dateOfBirth,
    motherPhone: m.phone,
    motherEmail: m.email,
    motherAcademicDegree: m.academicDegree,
    motherOccupation: m.occupation,
    motherCompanyBusiness: m.company,
    studentName: join(firstName, lastName),
    fatherName: join(f.firstName, f.lastName),
    motherName: join(m.firstName, m.lastName),
    status: "Applicant",
    applicationDate: now.split("T")[0],
    interviewDate: apptDate,
    interviewTime: apptTime, // replaced with the canonical slot name before saving
    createdAt: now,
    updatedAt: now,
    // --- transfer-only fields (not in the web form) ---
    source: "parent-app",
    parentAppRequestId,
    blbId,
    ...(m.nationalId ? { motherNationalId: m.nationalId } : {}),
    ...(transferType ? { transferType } : {}),
    ...(consents ? { consents } : {}),
  };

  return { blbId, parentAppRequestId, appointment: { date: apptDate, time: apptTime }, application };
}

/* ------------------------------------------------------------------ */
/* Persistence                                                          */
/* ------------------------------------------------------------------ */

export async function findByParentAppRequestId(db: Firestore, requestId: string) {
  const snap = await getDocs(
    query(collection(db, "applications"), where("parentAppRequestId", "==", requestId), limit(1))
  );
  return snap.empty ? null : { id: snap.docs[0].id, ...(snap.docs[0].data() as Record<string, any>) };
}

export async function getApplication(db: Firestore, id: string) {
  const snap = await getDoc(doc(db, "applications", id));
  return snap.exists() ? { ...(snap.data() as Record<string, any>), id: snap.id } : null;
}

/**
 * Saves the application at applications/{id} using the BLB id as-is.
 * Does not touch counters/applications. Returns null if the id is already taken
 * (checked inside the transaction, so two concurrent requests can't both win).
 */
export async function createApplication(
  db: Firestore,
  id: string,
  application: Record<string, unknown>
): Promise<Record<string, any> | null> {
  const ref = doc(db, "applications", id);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return null;
    const data = { ...application, id };
    tx.set(ref, data);
    return data;
  });
}

/** Public view of an application returned to the Parent App. */
export function toSummary(app: Record<string, any>) {
  return {
    id: String(app.id),
    parentAppRequestId: app.parentAppRequestId ?? null,
    status: app.status ?? null,
    category: app.category ?? null,
    studentName: app.studentName ?? null,
    blbId: app.blbId ?? null,
    previousCampus: app.previousCampus ?? null,
    previousSchool: app.previousSchool ?? null,
    campus: app.campus ?? null,
    school: app.school ?? null,
    grade: app.grade ?? null,
    transferType: app.transferType ?? null,
    interviewDate: app.interviewDate ?? null,
    interviewTime: app.interviewTime ?? null,
    createdAt: app.createdAt ?? null,
    updatedAt: app.updatedAt ?? null,
  };
}
