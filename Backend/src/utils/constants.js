export const DB_NAME = "DB_name_here";
export const UserRolesEnum = {
    ADMIN : "admin",
    PROJECT_ADMIN : "project_admin",
    MEMBER: "member"
}

export const AvailableUserRoles = Object.values(UserRolesEnum)

export const PostPublishStatusEnum = {
    APPLIED: "applied",
    PUBLISHED: "published",
    ARCHIVED: "archived"
}
export const AvailablePostPublishStatus = Object.values(PostPublishStatusEnum)

export const PostStatusEnum = {
    OPEN: "OPEN", 
    CLOSED: "CLOESD",
}
export const AvailablePostStatus = Object.values(PostStatusEnum)

export const ConnectionRequestSchemaEnum = {
    PENDING: "pending",
    ACCEPTED: "accepted",
    REJECTED: "rejected",
    BLOCKED: "blocked"
}
export const AvailableConnectionRequestStatus = Object.values(ConnectionRequestSchemaEnum)

export const submissionlimit = {
    free: {
        linkExchanges: 1,
        contentCollabs: 1,
        newTools: 1
    },
    premium: {
        linkExchanges: 5,
        contentCollabs: 5,
        newTools: 5
    },
    enterprise: {
        linkExchanges: 10,
        contentCollabs: 10,
        newTools: 10
    }
}

export const SubscriptionEnum = {
    FREE: "free",
    PREMIUM: "premium",
    ENTERPRISE: "enterprise"
}
export const AvailableSubscription = Object.values(SubscriptionEnum)


// 
