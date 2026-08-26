export type CanonicalEntitlement = "free" | "premium";
export type Feature =
  | "assistant.basic"
  | "assistant.attachment"
  | "projects.intelligence"
  | "tasks.intelligence"
  | "studies.tutor"
  | "journeys.adaptive";
export const PLAN_LIMITS = Object.freeze({
  free: {
    activeProjects: 3,
    openTasks: 30,
    activeSubjects: 3,
    assistantDaily: 10,
    attachmentsDaily: 2,
    activeJourneys: 1,
    dailyMissions: 1,
  },
  premium: {
    activeProjects: null,
    openTasks: null,
    activeSubjects: null,
    assistantDaily: 100,
    attachmentsDaily: 20,
    activeJourneys: null,
    dailyMissions: null,
  },
});
const PREMIUM_FEATURES = new Set<Feature>([
  "projects.intelligence",
  "tasks.intelligence",
  "studies.tutor",
  "journeys.adaptive",
]);
export const canUseFeature = (entitlement: CanonicalEntitlement, feature: Feature) =>
  entitlement === "premium" || !PREMIUM_FEATURES.has(feature);
export const getFeatureLimit = (entitlement: CanonicalEntitlement, feature: Feature) =>
  feature === "assistant.attachment"
    ? PLAN_LIMITS[entitlement].attachmentsDaily
    : feature === "assistant.basic"
      ? PLAN_LIMITS[entitlement].assistantDaily
      : canUseFeature(entitlement, feature)
        ? null
        : 0;
export const getRemainingUsage = (limit: number | null, used: number) =>
  limit === null ? null : Math.max(0, limit - used);
