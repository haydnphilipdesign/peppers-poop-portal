export type UserName = 'Chris' | 'Debbie' | 'Haydn'
export type LogType = 'poop' | 'pee'
export type ActivityType = 'toys' | 'dinner'
export type ReminderType = 'simparica' | 'grooming' | 'vet'

export interface Log {
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

export interface Activity {
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

export interface Reminder {
    id: string
    created_at: string
    type: ReminderType
    due_date: string
    completed_at: string | null
    completed_by: UserName | null
    notes: string | null
}

export type ReminderInsert = {
    id?: string
    created_at?: string
    type: ReminderType
    due_date: string
    completed_at?: string | null
    completed_by?: UserName | null
    notes?: string | null
}

export interface Database {
    public: {
        Tables: {
            logs: {
                Row: Log
                Insert: LogInsert
                Update: Partial<Log>
            }
            activities: {
                Row: Activity
                Insert: ActivityInsert
                Update: Partial<Activity>
            }
            reminders: {
                Row: Reminder
                Insert: ReminderInsert
                Update: Partial<Reminder>
            }
        }
    }
}
