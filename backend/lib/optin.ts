// Validation for public lead-magnet opt-ins. Kept pure so it can be unit-tested.

export const MAGNETS = ["lead-leak-audit", "missed-call-calculator", "plumber-guide"] as const;
export type Magnet = (typeof MAGNETS)[number];

export interface OptinInput {
  email?: unknown; name?: unknown; business?: unknown; city?: unknown; phone?: unknown;
  magnet?: unknown; consent?: unknown; consentText?: unknown; website?: unknown; hp_extra?: unknown; // honeypots
  source?: unknown; utm?: unknown; details?: unknown;
}

export type OptinResult =
  | { ok: true; bot: boolean; row: Record<string, unknown> }
  | { ok: false; error: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;

function cleanObject(v: unknown, maxKeys = 12): Record<string, string | number> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const out: Record<string, string | number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>).slice(0, maxKeys)) {
    const key = k.slice(0, 40);
    if (typeof val === "number" && Number.isFinite(val)) out[key] = val;
    else if (typeof val === "string") out[key] = val.slice(0, 200);
  }
  return out;
}

export function validateOptin(input: OptinInput): OptinResult {
  // Bots fill every field, including the hidden one. Pretend success, store nothing.
  if (str(input.hp_extra, 200)) return { ok: true, bot: true, row: {} };

  const email = str(input.email, 254).toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, error: "Please enter a valid email address." };

  const magnet = str(input.magnet, 40);
  if (!(MAGNETS as readonly string[]).includes(magnet)) return { ok: false, error: "Unknown offer." };

  if (input.consent !== true) return { ok: false, error: "Please tick the box to agree before continuing." };

  return {
    ok: true,
    bot: false,
    row: {
      email,
      name: str(input.name, 120) || null,
      business: str(input.business, 160) || null,
      city: str(input.city, 120) || null,
      phone: str(input.phone, 40) || null,
      magnet,
      consent: true,
      consentText: str(input.consentText, 500) || null,
      source: str(input.source, 300) || null,
      utm: cleanObject(input.utm),
      details: cleanObject(input.details),
    },
  };
}
