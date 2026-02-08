import { format, isSameDay, subDays } from "date-fns";
import type {
  Activity,
  Log,
  Reminder,
  UserName,
} from "@/lib/database.types";

export interface Walk {
  id: string;
  time: Date;
  timeFormatted: string;
  userName: UserName;
  hasPoop: boolean;
  hasPee: boolean;
  logs: Log[];
}

export const POINTS = {
  walkLog: 5,
  activity: 5,
  reminder: 5,
} as const;

const WALK_GROUPING_WINDOW_MINUTES = 30;

export function createWalkFromLogs(logs: Log[]): Walk {
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latestLog = sortedLogs[0];
  const walkTime = new Date(latestLog.created_at);

  return {
    id: `walk-${latestLog.id}`,
    time: walkTime,
    timeFormatted: format(walkTime, "h:mm a"),
    userName: latestLog.user_name,
    hasPoop: sortedLogs.some((log) => log.type === "poop"),
    hasPee: sortedLogs.some((log) => log.type === "pee"),
    logs: sortedLogs,
  };
}

export function groupLogsIntoWalks(logs: Log[]): Walk[] {
  if (logs.length === 0) {
    return [];
  }

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const walks: Walk[] = [];
  let currentWalk: Log[] = [sortedLogs[0]];

  for (let i = 1; i < sortedLogs.length; i += 1) {
    const previousLogTime = new Date(sortedLogs[i - 1].created_at).getTime();
    const currentLogTime = new Date(sortedLogs[i].created_at).getTime();
    const diffMinutes = (currentLogTime - previousLogTime) / (1000 * 60);

    if (diffMinutes <= WALK_GROUPING_WINDOW_MINUTES) {
      currentWalk.push(sortedLogs[i]);
      continue;
    }

    walks.push(createWalkFromLogs(currentWalk));
    currentWalk = [sortedLogs[i]];
  }

  walks.push(createWalkFromLogs(currentWalk));
  return walks;
}

export function getLatestWalkFromLogs(logs: Log[]): Walk | null {
  const grouped = groupLogsIntoWalks(logs);
  if (grouped.length === 0) {
    return null;
  }
  return grouped[grouped.length - 1];
}

export function calculatePoopStreak(logs: Log[], minimumPoopsPerDay = 3): number {
  if (logs.length === 0) {
    return 0;
  }

  let streak = 0;
  let dayToCheck = new Date();
  const todayPoops = logs.filter(
    (log) =>
      log.type === "poop" && isSameDay(new Date(log.created_at), dayToCheck)
  ).length;

  if (todayPoops < minimumPoopsPerDay) {
    dayToCheck = subDays(dayToCheck, 1);
  }

  while (true) {
    const dayPoops = logs.filter(
      (log) =>
        log.type === "poop" && isSameDay(new Date(log.created_at), dayToCheck)
    ).length;

    if (dayPoops < minimumPoopsPerDay) {
      break;
    }

    streak += 1;
    dayToCheck = subDays(dayToCheck, 1);
  }

  return streak;
}

export function createEmptyUserStats<T>(factory: () => T): Record<UserName, T> {
  return {
    Chris: factory(),
    Debbie: factory(),
    Haydn: factory(),
  };
}

export function calculateWeeklyPoints(
  logs: Log[],
  activities: Activity[],
  reminders: Reminder[]
): Record<UserName, number> {
  const points = createEmptyUserStats(() => 0);

  logs.forEach((log) => {
    points[log.user_name] += POINTS.walkLog;
  });

  activities.forEach((activity) => {
    points[activity.assigned_to] += POINTS.activity;
  });

  reminders.forEach((reminder) => {
    if (reminder.completed_by) {
      points[reminder.completed_by] += POINTS.reminder;
    }
  });

  return points;
}

export function calculateWalkerStats(
  logs: Log[],
  walks: Walk[]
): Record<UserName, { walks: number; poops: number; pees: number }> {
  const stats = createEmptyUserStats(() => ({ walks: 0, poops: 0, pees: 0 }));

  logs.forEach((log) => {
    if (log.type === "poop") {
      stats[log.user_name].poops += 1;
    } else {
      stats[log.user_name].pees += 1;
    }
  });

  walks.forEach((walk) => {
    stats[walk.userName].walks += 1;
  });

  return stats;
}

export function calculateTimeOfDayDistribution(logs: Log[]): {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
} {
  const distribution = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  };

  logs.forEach((log) => {
    const hour = new Date(log.created_at).getHours();
    if (hour >= 5 && hour < 12) {
      distribution.morning += 1;
    } else if (hour >= 12 && hour < 17) {
      distribution.afternoon += 1;
    } else if (hour >= 17 && hour < 21) {
      distribution.evening += 1;
    } else {
      distribution.night += 1;
    }
  });

  return distribution;
}
