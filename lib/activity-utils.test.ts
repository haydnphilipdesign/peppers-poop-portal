import { getRoutineDefaultTimestamp, getRoutineStatus } from "@/lib/activity-utils";
import type { Activity } from "@/lib/database.types";

describe("getRoutineDefaultTimestamp", () => {
  it("uses 9:00 AM for toy refills", () => {
    const timestamp = getRoutineDefaultTimestamp(new Date("2026-04-10T15:30:00.000Z"), "toys");

    expect(timestamp.getHours()).toBe(9);
    expect(timestamp.getMinutes()).toBe(0);
  });

  it("uses 5:45 PM for dinner", () => {
    const timestamp = getRoutineDefaultTimestamp(new Date("2026-04-10T08:00:00.000Z"), "dinner");

    expect(timestamp.getHours()).toBe(17);
    expect(timestamp.getMinutes()).toBe(45);
  });
});

describe("getRoutineStatus", () => {
  it("returns the latest selected-day activity for a routine", () => {
    const activities: Activity[] = [
      {
        id: "older",
        created_at: "2026-04-10T09:00:00.000Z",
        type: "dinner",
        logged_by: "Chris",
        assigned_to: "Chris",
      },
      {
        id: "latest",
        created_at: "2026-04-10T17:45:00.000Z",
        type: "dinner",
        logged_by: "Haydn",
        assigned_to: "Debbie",
      },
    ];

    const status = getRoutineStatus(activities, "dinner", new Date("2026-04-10T00:00:00.000Z"));

    expect(status.isComplete).toBe(true);
    expect(status.activity?.id).toBe("latest");
    expect(status.assignedTo).toBe("Debbie");
    expect(status.defaultTimeLabel).toBe("5:45 PM");
  });
});
