import { users, tickets, ticketComments, type User, type InsertUser, type Ticket, type InsertTicket, type TicketComment, type InsertTicketComment, UserRole, type TicketStatusType } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import * as bcrypt from "bcryptjs";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  setRememberToken(id: number, token: string): Promise<void>;
  setResetToken(id: number, token: string): Promise<void>;
  updatePassword(id: number, password: string): Promise<void>;

  // Ticket methods
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  getTicket(id: number): Promise<Ticket | undefined>;
  getTicketsByUser(userId: number): Promise<Ticket[]>;
  getTicketsByAssignee(assigneeId: number): Promise<Ticket[]>;
  updateTicketStatus(id: number, status: TicketStatusType): Promise<Ticket | undefined>;
  deleteTicket(id: number): Promise<void>;

  // Ticket comments
  createTicketComment(comment: InsertTicketComment): Promise<TicketComment>;
  getTicketComments(ticketId: number): Promise<TicketComment[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.resetPasswordToken, token));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);

    // Create a new user object with the correct types
    const newUser = {
      ...insertUser,
      password: hashedPassword,
      role: insertUser.role || UserRole.CUSTOMER, // Default role
      // Initialize optional fields as undefined instead of null
      companyName: insertUser.companyName || undefined,
      department: insertUser.department || undefined,
      designation: insertUser.designation || undefined,
      phoneNumber: insertUser.phoneNumber || undefined,
      rememberToken: undefined,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
    };

    const [user] = await db
      .insert(users)
      .values(newUser)
      .returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    // Convert null values to undefined
    const updateData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === null ? undefined : value])
    );

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async setRememberToken(id: number, token: string): Promise<void> {
    await db
      .update(users)
      .set({ rememberToken: token })
      .where(eq(users.id, id));
  }

  async setResetToken(id: number, token: string): Promise<void> {
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token expires in 1 hour
    await db
      .update(users)
      .set({
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      })
      .where(eq(users.id, id));
  }

  async updatePassword(id: number, password: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined,
      })
      .where(eq(users.id, id));
  }

  // Ticket methods
  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [newTicket] = await db
      .insert(tickets)
      .values(ticket)
      .returning();
    return newTicket;
  }

  async getTicket(id: number): Promise<Ticket | undefined> {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id));
    return ticket;
  }

  async getTicketsByUser(userId: number): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt));
  }

  async getTicketsByAssignee(assigneeId: number): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.assignedToId, assigneeId))
      .orderBy(desc(tickets.createdAt));
  }

  async updateTicketStatus(id: number, status: TicketStatusType): Promise<Ticket | undefined> {
    const [ticket] = await db
      .update(tickets)
      .set({ status })
      .where(eq(tickets.id, id))
      .returning();
    return ticket;
  }

  async deleteTicket(id: number): Promise<void> {
    await db.delete(tickets).where(eq(tickets.id, id));
  }

  // Ticket comment methods
  async createTicketComment(comment: InsertTicketComment): Promise<TicketComment> {
    const [newComment] = await db
      .insert(ticketComments)
      .values(comment)
      .returning();
    return newComment;
  }

  async getTicketComments(ticketId: number): Promise<TicketComment[]> {
    return db
      .select()
      .from(ticketComments)
      .where(eq(ticketComments.ticketId, ticketId))
      .orderBy(desc(ticketComments.createdAt));
  }
}

export const storage = new DatabaseStorage();