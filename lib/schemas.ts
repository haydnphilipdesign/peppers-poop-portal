import { z } from "zod";

const userNameSchema = z.enum(["Chris", "Debbie", "Haydn"]);
const logTypeSchema = z.enum(["poop", "pee"]);
const activityTypeSchema = z.enum(["toys", "dinner"]);
const reminderTypeSchema = z.enum(["simparica", "grooming", "vet"]);
const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid datetime");
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected yyyy-MM-dd)");

export const walkCreateSchema = z
  .object({
    userName: userNameSchema,
    createdAt: isoDateTimeSchema.optional(),
    poop: z.boolean(),
    pee: z.boolean(),
  })
  .refine((data) => data.poop || data.pee, {
    message: "A walk must include at least one log type",
    path: ["poop"],
  });

export const walkUpdateSchema = z
  .object({
    logIds: z.array(uuidSchema).min(1, "At least one log id is required"),
    userName: userNameSchema,
    createdAt: isoDateTimeSchema,
    poop: z.boolean(),
    pee: z.boolean(),
  })
  .refine((data) => data.poop || data.pee, {
    message: "A walk must include at least one log type",
    path: ["poop"],
  });

export const walkDeleteSchema = z.object({
  logIds: z.array(uuidSchema).min(1, "At least one log id is required"),
});

export const activityCreateSchema = z.object({
  type: activityTypeSchema,
  loggedBy: userNameSchema,
  assignedTo: userNameSchema,
  createdAt: isoDateTimeSchema.optional(),
});

export const reminderLogSchema = z.object({
  type: reminderTypeSchema,
  dueDate: isoDateSchema,
  completedBy: userNameSchema.optional(),
  completedAt: isoDateTimeSchema.optional(),
  notes: z.string().max(500).optional(),
});

export const reminderCompleteSchema = z.object({
  id: uuidSchema,
  completedBy: userNameSchema,
  completedAt: isoDateTimeSchema.optional(),
});

export const unlockSchema = z.object({
  pin: z.string().min(4).max(64),
});

export const logTypeEnum = logTypeSchema;
export const userNameEnum = userNameSchema;
