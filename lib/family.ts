import type { UserName } from '@/lib/database.types'

type FamilyMemberMeta = {
    initials: string
    avatarClassName: string
    softClassName: string
    surfaceClassName: string
}

export const FAMILY_ORDER: UserName[] = ['Chris', 'Debbie', 'Haydn']

export const FAMILY_MEMBERS: Record<UserName, FamilyMemberMeta> = {
    Chris: {
        initials: 'CH',
        avatarClassName: 'bg-sky-600 text-white',
        softClassName: 'bg-sky-500/10 text-sky-700',
        surfaceClassName: 'border-sky-200/80 bg-sky-50/80',
    },
    Debbie: {
        initials: 'DE',
        avatarClassName: 'bg-rose-600 text-white',
        softClassName: 'bg-rose-500/10 text-rose-700',
        surfaceClassName: 'border-rose-200/80 bg-rose-50/80',
    },
    Haydn: {
        initials: 'HA',
        avatarClassName: 'bg-emerald-600 text-white',
        softClassName: 'bg-emerald-500/10 text-emerald-700',
        surfaceClassName: 'border-emerald-200/80 bg-emerald-50/80',
    },
}

export function getFamilyMemberMeta(userName: UserName) {
    return FAMILY_MEMBERS[userName]
}
