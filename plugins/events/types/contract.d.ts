import { z } from "every-plugin/zod";
export declare const contract: {
    listEvents: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        ownerId: z.ZodOptional<z.ZodString>;
        visibility: z.ZodOptional<z.ZodEnum<{
            private: "private";
            unlisted: "unlisted";
            public: "public";
        }>>;
        status: z.ZodOptional<z.ZodEnum<{
            active: "active";
            cancelled: "cancelled";
        }>>;
        limit: z.ZodOptional<z.ZodNumber>;
        cursor: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        data: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            ownerId: z.ZodString;
            slug: z.ZodString;
            title: z.ZodString;
            description: z.ZodNullable<z.ZodString>;
            content: z.ZodNullable<z.ZodString>;
            status: z.ZodEnum<{
                active: "active";
                cancelled: "cancelled";
            }>;
            visibility: z.ZodEnum<{
                private: "private";
                unlisted: "unlisted";
                public: "public";
            }>;
            lumaUrl: z.ZodNullable<z.ZodString>;
            startAt: z.ZodISODateTime;
            endAt: z.ZodNullable<z.ZodISODateTime>;
            location: z.ZodNullable<z.ZodString>;
            participantCount: z.ZodNumber;
            createdAt: z.ZodISODateTime;
            updatedAt: z.ZodISODateTime;
        }, z.core.$strip>>;
        meta: z.ZodObject<{
            total: z.ZodNumber;
            hasMore: z.ZodBoolean;
            nextCursor: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
        BAD_REQUEST: {
            readonly status: 400;
            readonly data: z.ZodObject<{
                invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    message: z.ZodString;
                    code: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
            }, z.core.$strip>;
        };
    }>>, Record<never, never>>;
    getEvent: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        data: z.ZodObject<{
            id: z.ZodString;
            ownerId: z.ZodString;
            slug: z.ZodString;
            title: z.ZodString;
            description: z.ZodNullable<z.ZodString>;
            content: z.ZodNullable<z.ZodString>;
            status: z.ZodEnum<{
                active: "active";
                cancelled: "cancelled";
            }>;
            visibility: z.ZodEnum<{
                private: "private";
                unlisted: "unlisted";
                public: "public";
            }>;
            lumaUrl: z.ZodNullable<z.ZodString>;
            startAt: z.ZodISODateTime;
            endAt: z.ZodNullable<z.ZodISODateTime>;
            location: z.ZodNullable<z.ZodString>;
            participantCount: z.ZodNumber;
            createdAt: z.ZodISODateTime;
            updatedAt: z.ZodISODateTime;
        }, z.core.$strip>;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
        NOT_FOUND: {
            readonly status: 404;
            readonly data: z.ZodObject<{
                resource: z.ZodOptional<z.ZodString>;
                resourceId: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>>, Record<never, never>>;
    listEventParticipants: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        eventId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        data: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            eventId: z.ZodString;
            userId: z.ZodString;
            walletAddress: z.ZodNullable<z.ZodString>;
            displayName: z.ZodNullable<z.ZodString>;
            role: z.ZodEnum<{
                participant: "participant";
                organizer: "organizer";
            }>;
            createdAt: z.ZodISODateTime;
            updatedAt: z.ZodISODateTime;
        }, z.core.$strip>>;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
        NOT_FOUND: {
            readonly status: 404;
            readonly data: z.ZodObject<{
                resource: z.ZodOptional<z.ZodString>;
                resourceId: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>>, Record<never, never>>;
    joinEvent: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        eventId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        data: z.ZodObject<{
            id: z.ZodString;
            eventId: z.ZodString;
            userId: z.ZodString;
            walletAddress: z.ZodNullable<z.ZodString>;
            displayName: z.ZodNullable<z.ZodString>;
            role: z.ZodEnum<{
                participant: "participant";
                organizer: "organizer";
            }>;
            createdAt: z.ZodISODateTime;
            updatedAt: z.ZodISODateTime;
        }, z.core.$strip>;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
        UNAUTHORIZED: {
            readonly status: 401;
            readonly data: z.ZodObject<{
                apiKeyProvided: z.ZodBoolean;
                provider: z.ZodOptional<z.ZodString>;
                authType: z.ZodOptional<z.ZodEnum<{
                    apiKey: "apiKey";
                    oauth: "oauth";
                    token: "token";
                }>>;
            }, z.core.$strip>;
        };
        NOT_FOUND: {
            readonly status: 404;
            readonly data: z.ZodObject<{
                resource: z.ZodOptional<z.ZodString>;
                resourceId: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
        BAD_REQUEST: {
            readonly status: 400;
            readonly data: z.ZodObject<{
                invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    message: z.ZodString;
                    code: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
            }, z.core.$strip>;
        };
    }>>, Record<never, never>>;
    leaveEvent: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        eventId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        deleted: z.ZodBoolean;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
        UNAUTHORIZED: {
            readonly status: 401;
            readonly data: z.ZodObject<{
                apiKeyProvided: z.ZodBoolean;
                provider: z.ZodOptional<z.ZodString>;
                authType: z.ZodOptional<z.ZodEnum<{
                    apiKey: "apiKey";
                    oauth: "oauth";
                    token: "token";
                }>>;
            }, z.core.$strip>;
        };
        NOT_FOUND: {
            readonly status: 404;
            readonly data: z.ZodObject<{
                resource: z.ZodOptional<z.ZodString>;
                resourceId: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>>, Record<never, never>>;
    createEvent: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        slug: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
        visibility: z.ZodOptional<z.ZodEnum<{
            private: "private";
            unlisted: "unlisted";
            public: "public";
        }>>;
        status: z.ZodOptional<z.ZodEnum<{
            active: "active";
            cancelled: "cancelled";
        }>>;
        lumaUrl: z.ZodOptional<z.ZodString>;
        startAt: z.ZodISODateTime;
        endAt: z.ZodOptional<z.ZodISODateTime>;
        location: z.ZodOptional<z.ZodString>;
        ownerId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        ownerId: z.ZodString;
        slug: z.ZodString;
        title: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        content: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<{
            active: "active";
            cancelled: "cancelled";
        }>;
        visibility: z.ZodEnum<{
            private: "private";
            unlisted: "unlisted";
            public: "public";
        }>;
        lumaUrl: z.ZodNullable<z.ZodString>;
        startAt: z.ZodISODateTime;
        endAt: z.ZodNullable<z.ZodISODateTime>;
        location: z.ZodNullable<z.ZodString>;
        participantCount: z.ZodNumber;
        createdAt: z.ZodISODateTime;
        updatedAt: z.ZodISODateTime;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
        UNAUTHORIZED: {
            readonly status: 401;
            readonly data: z.ZodObject<{
                apiKeyProvided: z.ZodBoolean;
                provider: z.ZodOptional<z.ZodString>;
                authType: z.ZodOptional<z.ZodEnum<{
                    apiKey: "apiKey";
                    oauth: "oauth";
                    token: "token";
                }>>;
            }, z.core.$strip>;
        };
        FORBIDDEN: {
            readonly status: 403;
            readonly data: z.ZodObject<{
                requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                action: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
        BAD_REQUEST: {
            readonly status: 400;
            readonly data: z.ZodObject<{
                invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    message: z.ZodString;
                    code: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
            }, z.core.$strip>;
        };
    }>>, Record<never, never>>;
    updateEvent: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
        visibility: z.ZodOptional<z.ZodEnum<{
            private: "private";
            unlisted: "unlisted";
            public: "public";
        }>>;
        status: z.ZodOptional<z.ZodEnum<{
            active: "active";
            cancelled: "cancelled";
        }>>;
        lumaUrl: z.ZodOptional<z.ZodString>;
        startAt: z.ZodOptional<z.ZodISODateTime>;
        endAt: z.ZodOptional<z.ZodISODateTime>;
        location: z.ZodOptional<z.ZodString>;
        ownerId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        ownerId: z.ZodString;
        slug: z.ZodString;
        title: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        content: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<{
            active: "active";
            cancelled: "cancelled";
        }>;
        visibility: z.ZodEnum<{
            private: "private";
            unlisted: "unlisted";
            public: "public";
        }>;
        lumaUrl: z.ZodNullable<z.ZodString>;
        startAt: z.ZodISODateTime;
        endAt: z.ZodNullable<z.ZodISODateTime>;
        location: z.ZodNullable<z.ZodString>;
        participantCount: z.ZodNumber;
        createdAt: z.ZodISODateTime;
        updatedAt: z.ZodISODateTime;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
        UNAUTHORIZED: {
            readonly status: 401;
            readonly data: z.ZodObject<{
                apiKeyProvided: z.ZodBoolean;
                provider: z.ZodOptional<z.ZodString>;
                authType: z.ZodOptional<z.ZodEnum<{
                    apiKey: "apiKey";
                    oauth: "oauth";
                    token: "token";
                }>>;
            }, z.core.$strip>;
        };
        NOT_FOUND: {
            readonly status: 404;
            readonly data: z.ZodObject<{
                resource: z.ZodOptional<z.ZodString>;
                resourceId: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
        FORBIDDEN: {
            readonly status: 403;
            readonly data: z.ZodObject<{
                requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                action: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
        BAD_REQUEST: {
            readonly status: 400;
            readonly data: z.ZodObject<{
                invalidFields: z.ZodOptional<z.ZodArray<z.ZodString>>;
                validationErrors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    field: z.ZodString;
                    message: z.ZodString;
                    code: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
            }, z.core.$strip>;
        };
    }>>, Record<never, never>>;
    deleteEvent: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        deleted: z.ZodBoolean;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
        UNAUTHORIZED: {
            readonly status: 401;
            readonly data: z.ZodObject<{
                apiKeyProvided: z.ZodBoolean;
                provider: z.ZodOptional<z.ZodString>;
                authType: z.ZodOptional<z.ZodEnum<{
                    apiKey: "apiKey";
                    oauth: "oauth";
                    token: "token";
                }>>;
            }, z.core.$strip>;
        };
        NOT_FOUND: {
            readonly status: 404;
            readonly data: z.ZodObject<{
                resource: z.ZodOptional<z.ZodString>;
                resourceId: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
        FORBIDDEN: {
            readonly status: 403;
            readonly data: z.ZodObject<{
                requiredPermissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
                action: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        };
    }>>, Record<never, never>>;
};
export type ContractType = typeof contract;
