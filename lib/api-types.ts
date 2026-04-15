import type { ActivityType, ReminderType, UserName } from "@/lib/database.types";

export interface ApiSuccessResponse {
  success: true;
}

export interface ApiErrorResponse {
  error: string;
}

export interface WalkCreateRequest {
  userName: UserName;
  createdAt?: string;
  poop: boolean;
  pee: boolean;
}

export interface WalkUpdateRequest {
  logIds: string[];
  userName: UserName;
  createdAt: string;
  poop: boolean;
  pee: boolean;
}

export interface WalkDeleteRequest {
  logIds: string[];
}

export interface ActivityCreateRequest {
  type: ActivityType;
  loggedBy: UserName;
  assignedTo: UserName;
  createdAt?: string;
}

export interface ActivityUpdateRequest {
  id: string;
  loggedBy: UserName;
  assignedTo: UserName;
  createdAt?: string;
}

export interface ActivityDeleteRequest {
  id: string;
}

export interface ReminderLogRequest {
  type: ReminderType;
  dueDate: string;
  appointmentAt?: string;
  scheduledAt?: string;
  scheduledBy?: UserName;
  completedBy?: UserName;
  completedAt?: string;
  notes?: string;
}

export interface ReminderScheduleRequest {
  id?: string;
  type: ReminderType;
  dueDate: string;
  appointmentAt: string;
  scheduledBy: UserName;
  scheduledAt?: string;
  notes?: string;
}

export interface ReminderCompleteRequest {
  id: string;
  completedBy: UserName;
  completedAt?: string;
}

export interface UnlockRequest {
  pin: string;
}
