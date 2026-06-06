// Helpers for class invitation codes & links.
import { base44 } from "@/api/base44Client";

// Generate a short, human-readable code (8 chars, no ambiguous letters).
export function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

// Build a full join URL for a given invite code.
// Always use the production domain so links work even when generated from preview.
export function buildInviteUrl(code) {
  return `https://zamaaiprimary.online/class-join?code=${encodeURIComponent(code)}`;
}

// Ensure a class has an active invite code; returns the up-to-date class.
export async function ensureInviteCode(cls) {
  if (cls?.invite_code && cls.invite_active !== false) return cls;
  const updates = {
    invite_code: cls?.invite_code || generateInviteCode(),
    invite_active: true,
  };
  const updated = await base44.entities.SchoolClass.update(cls.id, updates);
  return { ...cls, ...updates, ...(updated || {}) };
}