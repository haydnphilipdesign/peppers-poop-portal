export type UserName = 'Chris' | 'Debbie' | 'Haydn'
export type LogType = 'poop' | 'pee'
export type ActivityType = 'toys' | 'dinner'
export type ReminderType = 'simparica' | 'grooming' | 'vet'

export type Log = {
    walk_id?: string | null
    id: string
    created_at: string
    type: LogType
    user_name: UserName
    notes: string | null
}

export type LogInsert = {
    id?: string
    created_at?: string
    type: LogType
    user_name: UserName
    notes?: string | null
}

export type Activity = {
    id: string
    created_at: string
    type: ActivityType
    logged_by: UserName
    assigned_to: UserName
}

export type ActivityInsert = {
    id?: string
    created_at?: string
    type: ActivityType
    logged_by: UserName
    assigned_to: UserName
}

export type Reminder = {
    id: string
    created_at: string
    type: ReminderType
    due_date: string
    appointment_at: string | null
    scheduled_at: string | null
    scheduled_by: UserName | null
    completed_at: string | null
    completed_by: UserName | null
    notes: string | null
}

export type ReminderInsert = {
    id?: string
    created_at?: string
    type: ReminderType
    due_date: string
    appointment_at?: string | null
    scheduled_at?: string | null
    scheduled_by?: UserName | null
    completed_at?: string | null
    completed_by?: UserName | null
    notes?: string | null
}

export type WalkRow = {
    id: string
    created_at: string
    user_name: UserName
    revision: number
    provenance: 'explicit' | 'legacy_single' | 'legacy_estimate'
    deleted_at: string | null
}

export type WalkRecord = WalkRow & { logs: Log[] }

export interface Database {
    public: {
        Views: Record<string, never>
        Functions: {
            mutate_walk_v2: {
                Args: {
                    p_request_id: string; p_operation: 'create' | 'update' | 'delete'
                    p_walk_id: string | null; p_expected_revision: number | null
                    p_created_at: string | null; p_user_name: UserName | null
                    p_has_poop: boolean | null; p_has_pee: boolean | null
                }
                Returns: { walkId: string; revision: number }
            }
        }
        Tables: {
            walks: { Row: WalkRow; Insert: Partial<WalkRow>; Update: Partial<WalkRow>; Relationships: [] }
            logs: {
                Row: Log
                Insert: LogInsert
                Relationships: [{ foreignKeyName: 'logs_walk_id_fkey'; columns: ['walk_id']; isOneToOne: false; referencedRelation: 'walks'; referencedColumns: ['id'] }]
                Update: Partial<Log>
            }
            activities: {
                Row: Activity
                Insert: ActivityInsert
                Relationships: []
                Update: Partial<Activity>
            }
            reminders: {
                Row: Reminder
                Insert: ReminderInsert
                Relationships: []
                Update: Partial<Reminder>
            }
        }
    }
}
