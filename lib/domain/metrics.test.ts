import {
  POINTS,
  calculatePoopStreak,
  calculateTimeOfDayDistribution,
  calculateWeeklyPoints,
  groupLogsIntoWalks,
} from "@/lib/domain/metrics";
import type { Activity, Log, Reminder } from "@/lib/database.types";

function createLog(
  id: string,
  createdAt: string,
  type: Log["type"],
  userName: Log["user_name"] = "Chris"
): Log {
  return {
    id,
    created_at: createdAt,
    type,
    user_name: userName,
    notes: null,
  };
}

function localIsoAt(hour: number): string {
  const date = new Date(2026, 1, 1, hour, 0, 0, 0);
  return date.toISOString();
}

describe("groupLogsIntoWalks", () => {
  it("groups logs within 30 minutes into the same walk", () => {
    const logs: Log[] = [
      createLog("1", "2026-02-01T08:00:00.000Z", "pee"),
      createLog("2", "2026-02-01T08:20:00.000Z", "poop"),
      createLog("3", "2026-02-01T09:00:00.000Z", "pee"),
    ];

    const walks = groupLogsIntoWalks(logs);
    expect(walks).toHaveLength(2);
    expect(walks[0].logs).toHaveLength(2);
    expect(walks[1].logs).toHaveLength(1);
  });
});

describe("calculatePoopStreak", () => {
  it("counts consecutive days with 3+ poops", () => {
    const now = new Date();
    const day1 = new Date(now);
    day1.setDate(now.getDate() - 1);
    const day2 = new Date(now);
    day2.setDate(now.getDate() - 2);
    const day3 = new Date(now);
    day3.setDate(now.getDate() - 3);

    const logs: Log[] = [
      createLog("a", day1.toISOString(), "poop"),
      createLog("b", day1.toISOString(), "poop"),
      createLog("c", day1.toISOString(), "poop"),
      createLog("d", day2.toISOString(), "poop"),
      createLog("e", day2.toISOString(), "poop"),
      createLog("f", day2.toISOString(), "poop"),
      createLog("g", day3.toISOString(), "poop"),
    ];

    expect(calculatePoopStreak(logs)).toBe(2);
  });
});

describe("calculateWeeklyPoints", () => {
  it("assigns points by source type consistently", () => {
    const logs: Log[] = [
      createLog("1", "2026-02-01T08:00:00.000Z", "pee", "Chris"),
      createLog("2", "2026-02-01T08:20:00.000Z", "poop", "Debbie"),
    ];

    const activities: Activity[] = [
      {
        id: "a1",
        created_at: "2026-02-01T11:00:00.000Z",
        type: "dinner",
        logged_by: "Chris",
        assigned_to: "Haydn",
      },
    ];

    const reminders: Reminder[] = [
      {
        id: "r1",
        created_at: "2026-02-01T12:00:00.000Z",
        type: "grooming",
        due_date: "2026-02-01",
        completed_at: "2026-02-01T12:05:00.000Z",
        completed_by: "Chris",
        notes: null,
      },
    ];

    const points = calculateWeeklyPoints(logs, activities, reminders);

    expect(points.Chris).toBe(POINTS.walkLog + POINTS.reminder);
    expect(points.Debbie).toBe(POINTS.walkLog);
    expect(points.Haydn).toBe(POINTS.activity);
  });
});

describe("calculateTimeOfDayDistribution", () => {
  it("buckets events into four day-part segments", () => {
    const logs: Log[] = [
      createLog("m", localIsoAt(6), "pee"),
      createLog("a", localIsoAt(13), "pee"),
      createLog("e", localIsoAt(18), "poop"),
      createLog("n", localIsoAt(23), "poop"),
    ];

    const distribution = calculateTimeOfDayDistribution(logs);

    expect(distribution).toEqual({
      morning: 1,
      afternoon: 1,
      evening: 1,
      night: 1,
    });
  });
});
