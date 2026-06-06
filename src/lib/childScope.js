// Helpers for per-child data isolation on multi-child family plans.
//
// Strategy:
//  - All new records created from now on carry a `child_id` field.
//  - Legacy records (no child_id) are attributed to the OLDEST child profile
//    (the first one created) so existing single-child users see their history
//    on their original child profile, and siblings start with a clean slate.

export function isLegacyOwnerChild(activeChildId, childProfiles) {
  if (!activeChildId || !Array.isArray(childProfiles) || childProfiles.length === 0) return false;
  // childProfiles are loaded sorted by created_date (ascending) in ActiveChildContext
  const oldest = childProfiles[0];
  return oldest?.id === activeChildId;
}

// Filter a list of records (StudentResult / TopicProgress) down to the active child.
// If the active child is the oldest profile, also include legacy records with no child_id.
export function filterForActiveChild(records, activeChildId, childProfiles) {
  if (!activeChildId || !Array.isArray(records)) return records || [];
  const includeLegacy = isLegacyOwnerChild(activeChildId, childProfiles);
  return records.filter(r => {
    if (r.child_id === activeChildId) return true;
    if (includeLegacy && !r.child_id) return true;
    return false;
  });
}