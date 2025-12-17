export type UserName = 'Chris' | 'Debbie' | 'Haydn'
export type LogType = 'poop' | 'pee'

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

export interface Database {
    public: {
        Tables: {
            logs: {
                Row: Log
                Insert: LogInsert
                Update: Partial<Log>
            }
        }
    }
}
