import { z } from "every-plugin/zod";
export declare const ProjectCommentSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    author: z.ZodString;
    authorNpub: z.ZodString;
    content: z.ZodString;
    createdAt: z.ZodNumber;
    replyTo: z.ZodNullable<z.ZodString>;
    reactions: z.ZodNumber;
}, z.core.$strip>;
export declare const NewsPostSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    type: z.ZodEnum<{
        update: "update";
        milestone: "milestone";
        funding: "funding";
        announcement: "announcement";
    }>;
    title: z.ZodString;
    body: z.ZodString;
    author: z.ZodString;
    authorNpub: z.ZodString;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, z.core.$strip>;
export declare const contract: {
    listComments: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        projectId: z.ZodString;
        limit: z.ZodDefault<z.ZodNumber>;
        cursor: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        data: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            projectId: z.ZodString;
            author: z.ZodString;
            authorNpub: z.ZodString;
            content: z.ZodString;
            createdAt: z.ZodNumber;
            replyTo: z.ZodNullable<z.ZodString>;
            reactions: z.ZodNumber;
        }, z.core.$strip>>;
        meta: z.ZodObject<{
            total: z.ZodNumber;
            hasMore: z.ZodBoolean;
            oldestCreatedAt: z.ZodNullable<z.ZodNumber>;
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
    createComment: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        projectId: z.ZodString;
        content: z.ZodOptional<z.ZodString>;
        replyTo: z.ZodOptional<z.ZodString>;
        event: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            pubkey: z.ZodString;
            created_at: z.ZodNumber;
            kind: z.ZodLiteral<1>;
            tags: z.ZodArray<z.ZodArray<z.ZodString>>;
            content: z.ZodString;
            sig: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        projectId: z.ZodString;
        author: z.ZodString;
        authorNpub: z.ZodString;
        content: z.ZodString;
        createdAt: z.ZodNumber;
        replyTo: z.ZodNullable<z.ZodString>;
        reactions: z.ZodNumber;
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
    listNews: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        projectId: z.ZodString;
        type: z.ZodOptional<z.ZodEnum<{
            update: "update";
            milestone: "milestone";
            funding: "funding";
            announcement: "announcement";
        }>>;
        limit: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        data: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            projectId: z.ZodString;
            type: z.ZodEnum<{
                update: "update";
                milestone: "milestone";
                funding: "funding";
                announcement: "announcement";
            }>;
            title: z.ZodString;
            body: z.ZodString;
            author: z.ZodString;
            authorNpub: z.ZodString;
            createdAt: z.ZodNumber;
            updatedAt: z.ZodNumber;
        }, z.core.$strip>>;
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
    publishNews: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        projectId: z.ZodString;
        title: z.ZodString;
        content: z.ZodString;
        newsType: z.ZodEnum<{
            update: "update";
            milestone: "milestone";
            funding: "funding";
            announcement: "announcement";
        }>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        projectId: z.ZodString;
        type: z.ZodEnum<{
            update: "update";
            milestone: "milestone";
            funding: "funding";
            announcement: "announcement";
        }>;
        title: z.ZodString;
        body: z.ZodString;
        author: z.ZodString;
        authorNpub: z.ZodString;
        createdAt: z.ZodNumber;
        updatedAt: z.ZodNumber;
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
    ping: import("@orpc/contract").ContractProcedure<import("@orpc/contract").Schema<unknown, unknown>, z.ZodObject<{
        status: z.ZodLiteral<"ok">;
        relay: z.ZodString;
        timestamp: z.ZodString;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, Record<never, never>>, Record<never, never>>;
};
export type ContractType = typeof contract;
