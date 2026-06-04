import { supabase } from "@/integrations/supabase/client";

export type Plan = "free" | "pro" | "team";

export type PlanLimits = {
  dailyFetches: number; // Infinity for unlimited
  maxQuality: "360" | "480" | "720" | "1080" | "1440" | "2160" | "max";
  audioFormats: Array<"mp3" | "wav" | "opus" | "best">;
  batch: boolean;
  favorites: boolean;
  priorityQueue: boolean;
  sharedHistory: boolean;
  seats: number;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    dailyFetches: 10,
    maxQuality: "720",
    audioFormats: ["mp3"],
    batch: false,
    favorites: false,
    priorityQueue: false,
    sharedHistory: false,
    seats: 1,
  },
  pro: {
    dailyFetches: Infinity,
    maxQuality: "1080",
    audioFormats: ["mp3", "wav", "opus", "best"],
    batch: true,
    favorites: true,
    priorityQueue: true,
    sharedHistory: false,
    seats: 1,
  },
  team: {
    dailyFetches: Infinity,
    maxQuality: "2160",
    audioFormats: ["mp3", "wav", "opus", "best"],
    batch: true,
    favorites: true,
    priorityQueue: true,
    sharedHistory: true,
    seats: 5,
  },
};

const QUALITY_ORDER: Array<PlanLimits["maxQuality"]> = [
  "360",
  "480",
  "720",
  "1080",
  "1440",
  "2160",
  "max",
];

export function qualityAllowed(plan: Plan, quality: string): boolean {
  const cap = PLAN_LIMITS[plan].maxQuality;
  const capIdx = QUALITY_ORDER.indexOf(cap);
  const qIdx = QUALITY_ORDER.indexOf(quality as PlanLimits["maxQuality"]);
  if (qIdx === -1) return false;
  return qIdx <= capIdx;
}

export function clampQuality(plan: Plan, quality: string): PlanLimits["maxQuality"] {
  return qualityAllowed(plan, quality)
    ? (quality as PlanLimits["maxQuality"])
    : PLAN_LIMITS[plan].maxQuality;
}

export function audioAllowed(plan: Plan, fmt: string): boolean {
  return (PLAN_LIMITS[plan].audioFormats as string[]).includes(fmt);
}

export async function getCurrentPlan(): Promise<Plan> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return "free";
  const { data } = await supabase
    .from("user_plans")
    .select("plan")
    .eq("user_id", sess.session.user.id)
    .maybeSingle();
  const p = (data?.plan as Plan | undefined) ?? "free";
  return p === "pro" || p === "team" ? p : "free";
}

const ANON_KEY = "mediadrop_anon_usage";

type UsageRecord = { date: string; count: number };

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getAnonUsage(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(ANON_KEY);
    if (!raw) return 0;
    const rec = JSON.parse(raw) as UsageRecord;
    return rec.date === todayKey() ? rec.count : 0;
  } catch {
    return 0;
  }
}

export function bumpAnonUsage() {
  if (typeof window === "undefined") return;
  const next: UsageRecord = { date: todayKey(), count: getAnonUsage() + 1 };
  localStorage.setItem(ANON_KEY, JSON.stringify(next));
}

export async function getTodayUsage(): Promise<number> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return getAnonUsage();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("downloads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", sess.session.user.id)
    .gte("created_at", since.toISOString());
  return count ?? 0;
}
