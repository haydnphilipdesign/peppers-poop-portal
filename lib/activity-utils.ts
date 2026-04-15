import { format, setHours, setMinutes, startOfDay } from "date-fns";
import type {
  Activity,
  ActivityType,
  UserName,
} from "@/lib/database.types";

interface RoutineConfig {
  label: string;
  description: string;
  icon: string;
  defaultHour: number;
  defaultMinute: number;
}

export interface RoutineStatus {
  type: ActivityType;
  label: string;
  description: string;
  icon: string;
  activity: Activity | null;
  assignedTo: UserName | null;
  isComplete: boolean;
  defaultCreatedAt: Date;
  defaultTimeLabel: string;
}

export const ROUTINE_CONFIG: Record<ActivityType, RoutineConfig> = {
  toys: {
    label: "Fill Toys",
    description: "Morning treats",
    icon: "🧸",
    defaultHour: 9,
    defaultMinute: 0,
  },
  dinner: {
    label: "Make Dinner",
    description: "5:45 PM",
    icon: "🍽️",
    defaultHour: 17,
    defaultMinute: 45,
  },
};

export function getRoutineDefaultTimestamp(
  date: Date,
  type: ActivityType
): Date {
  const config = ROUTINE_CONFIG[type];
  return setMinutes(
    setHours(startOfDay(date), config.defaultHour),
    config.defaultMinute
  );
}

export function getRoutineStatus(
  activities: Activity[],
  type: ActivityType,
  date: Date
): RoutineStatus {
  const config = ROUTINE_CONFIG[type];
  const latestActivity =
    activities
      .filter((activity) => activity.type === type)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] ?? null;
  const defaultCreatedAt = getRoutineDefaultTimestamp(date, type);

  return {
    type,
    label: config.label,
    description: config.description,
    icon: config.icon,
    activity: latestActivity,
    assignedTo: latestActivity?.assigned_to ?? null,
    isComplete: latestActivity !== null,
    defaultCreatedAt,
    defaultTimeLabel: format(defaultCreatedAt, "h:mm a"),
  };
}
