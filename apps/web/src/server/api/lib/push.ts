import { getPool } from "@aka/db";
import type { RowDataPacket } from "mysql2";

// Push notifications for the AKATSICO student app (Akatsico app), sent through
// Expo's push service. Devices register via POST /api/public/devices
// (modules/public/route.ts). This module:
//   - notifies subscribers when a news/announcement/event post goes live
//     (called from the posts service on publish, plus a sweeper for posts
//     scheduled with a future published_at), exactly once per post
//     (posts.pushed_at), and
//   - fans out umsk circulars to the matching student audience
//     (POST /api/public/push/broadcast, shared-secret protected).

export type PushTopic = "news" | "announcement" | "event" | "circular";
export const PUSH_TOPICS: Array<PushTopic> = ["news", "announcement", "event", "circular"];

// umsk informer.receiver values a circular can target.
export const AUDIENCES = ["STUDENT", "FRESHER", "FINAL", "UNDERGRAD", "POSTGRAD", "ALUMNI"] as const;
export type Audience = (typeof AUDIENCES)[number];

export type PushMessage = { title: string; body: string; data: Record<string, unknown> };

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH = 100; // Expo's per-request limit

type DeviceRow = RowDataPacket & { token: string; topics: unknown; audiences: unknown };

const asList = (v: unknown): Array<string> => {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};

// Devices subscribed to `topic` (no stored preference = all topics on), and,
// when `audience` is given, belonging to it. STUDENT means every signed-in
// current student; ALUMNI only those tagged as alumni.
export async function devicesFor(topic: PushTopic, audience?: Audience): Promise<Array<string>> {
  const [rows] = await getPool().execute<DeviceRow[]>("SELECT token, topics, audiences FROM push_devices");
  return rows
    .filter((d) => {
      const topics = asList(d.topics);
      if (topics.length && !topics.includes(topic)) return false;
      if (!audience) return true;
      const aud = asList(d.audiences);
      return aud.includes(audience);
    })
    .map((d) => d.token);
}

// Sends one message to many tokens; drops tokens Expo reports as no longer
// registered (app uninstalled / token rotated). Returns delivery counts.
export async function sendPush(tokens: Array<string>, message: PushMessage) {
  const unique = [...new Set(tokens)];
  let sent = 0;
  let failed = 0;
  const dead: Array<string> = [];
  for (let i = 0; i < unique.length; i += BATCH) {
    const chunk = unique.slice(i, i + BATCH);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(
          chunk.map((to) => ({ to, sound: "default", title: message.title, body: message.body, data: message.data, channelId: "default" })),
        ),
      });
      const json = (await res.json().catch(() => null)) as { data?: Array<{ status: string; details?: { error?: string } }> } | null;
      (json?.data ?? []).forEach((ticket, idx) => {
        if (ticket.status === "ok") sent++;
        else {
          failed++;
          const token = chunk[idx];
          if (token && ticket.details?.error === "DeviceNotRegistered") dead.push(token);
        }
      });
      if (!json?.data) failed += chunk.length;
    } catch (err) {
      failed += chunk.length;
      console.error("push: Expo request failed:", err);
    }
  }
  if (dead.length) {
    await getPool()
      .query("DELETE FROM push_devices WHERE token IN (?)", [dead])
      .catch((err: unknown) => console.error("push: failed to prune tokens:", err));
  }
  return { targeted: unique.length, sent, failed, pruned: dead.length };
}

const TOPIC_LABEL: Record<string, string> = { news: "News", announcement: "Announcement", event: "Event" };

// Push a live post once. Claims the post atomically (pushed_at) so concurrent
// publish + sweeper runs can't double-notify.
export async function notifyPostPublished(postId: number) {
  const pool = getPool();
  const [claim] = await pool.execute<any>(
    "UPDATE posts SET pushed_at = NOW() WHERE id = ? AND status = 'published' AND published_at <= NOW() AND pushed_at IS NULL",
    [postId],
  );
  if (!claim?.affectedRows) return null; // not live yet, or already pushed
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id, type, slug, title, COALESCE(excerpt, '') AS excerpt FROM posts WHERE id = ?",
    [postId],
  );
  const post = rows[0];
  if (!post) return null;
  const topic = post.type as PushTopic;
  const tokens = await devicesFor(topic);
  if (!tokens.length) return { targeted: 0, sent: 0, failed: 0, pruned: 0 };
  return sendPush(tokens, {
    title: `${TOPIC_LABEL[post.type] ?? "Update"}: ${post.title}`,
    body: String(post.excerpt || "Tap to read more.").slice(0, 178),
    data: { kind: "post", type: post.type, slug: post.slug, id: post.id },
  });
}

// Posts scheduled for later (published_at in the future) become live without
// any admin action -- push them when they do. Only recent ones, so an old
// post re-published long after the fact doesn't ping everyone.
export async function sweepScheduledPosts() {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    `SELECT id FROM posts WHERE status = 'published' AND pushed_at IS NULL
       AND published_at <= NOW() AND published_at >= NOW() - INTERVAL 1 DAY`,
  );
  for (const r of rows) await notifyPostPublished(Number(r.id)).catch((err) => console.error("push sweep:", err));
}

let sweeper: ReturnType<typeof setInterval> | null = null;
export function startPushSweeper(everyMs = 5 * 60 * 1000) {
  if (sweeper) return;
  sweeper = setInterval(() => void sweepScheduledPosts().catch(() => undefined), everyMs);
  sweeper.unref?.();
}
