'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getFamilyMemberMeta } from '@/lib/family'
import type { UserName } from '@/lib/database.types'
import { cn } from '@/lib/utils'

interface FamilyAvatarProps {
    userName: UserName
    size?: 'sm' | 'default' | 'lg'
    className?: string
}

export function FamilyAvatar({
    userName,
    size = 'default',
    className,
}: FamilyAvatarProps) {
    const member = getFamilyMemberMeta(userName)

    return (
        <Avatar size={size} className={cn(className)}>
            <AvatarFallback className={cn('font-semibold tracking-[0.08em]', member.avatarClassName)}>
                {member.initials}
            </AvatarFallback>
        </Avatar>
    )
}
