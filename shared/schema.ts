import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const UserRole = {
  CUSTOMER: 'customer',
  SUPPORT: 'support',
  ADMIN: 'admin'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const TicketStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
} as const;

export type TicketStatusType = typeof TicketStatus[keyof typeof TicketStatus];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  companyName: text("company_name"),
  department: text("department"),
  role: text("role").$type<UserRoleType>().notNull().default(UserRole.CUSTOMER),
  designation: text("designation"),
  phoneNumber: text("phone_number"),
  createdAt: timestamp("created_at").defaultNow(),
  // Authentication fields
  rememberToken: text("remember_token"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  companyName: true,
  department: true,
  role: true,
  designation: true,
  phoneNumber: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").$type<TicketStatusType>().notNull().default(TicketStatus.OPEN),
  priority: text("priority").notNull().default('medium'),
  userId: serial("user_id").references(() => users.id),
  assignedToId: serial("assigned_to_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTicketSchema = createInsertSchema(tickets).pick({
  title: true,
  description: true,
  priority: true,
  userId: true,
  assignedToId: true,
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export const ticketComments = pgTable("ticket_comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  ticketId: serial("ticket_id").references(() => tickets.id),
  userId: serial("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTicketCommentSchema = createInsertSchema(ticketComments).pick({
  content: true,
  ticketId: true,
  userId: true,
});

export type InsertTicketComment = z.infer<typeof insertTicketCommentSchema>;
export type TicketComment = typeof ticketComments.$inferSelect;