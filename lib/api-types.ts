import type { ActivityType, ReminderType, UserName } from "@/lib/database.types";

export interface ApiSuccessResponse {
  success: true;
}

export interface ApiErrorResponse {
  error: string;
}

export interface WalkCreateRequest {
  requestId: string;
  userName: UserName;
  createdAt: string;
  poop: boolean;
  pee: boolean;
}

// The client fixes an omitted occurrence time when it first creates a request.
export type WalkCreateDraft = Omit<WalkCreateRequest, 'requestId' | 'createdAt'> & { createdAt?: string; draftId?: string };

export interface WalkUpdateRequest {
  requestId: string;
  walkId: string;
  expectedRevision: number;
  userName: UserName;
  createdAt: string;
  poop: boolean;
  pee: boolean;
}

export interface WalkMutationResponse {
  success: true;
  walkId?: string;
  revision?: number;
}

/** Enough of a saved walk to remove it again without waiting for a re-read. */
export interface SavedWalk {
  id: string;
  revision: number;
}

export interface WalkDeleteRequest {
  requestId: string;
  walkId: string;
  expectedRevision: number;
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
