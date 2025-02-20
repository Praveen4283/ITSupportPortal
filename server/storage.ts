import { users, tickets, ticketComments, type User, type InsertUser, type Ticket, type InsertTicket, type TicketComment, type InsertTicketComment, UserRole, type TicketStatusType } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Ticket methods
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  getTicket(id: number): Promise<Ticket | undefined>;
  getTicketsByUser(userId: number): Promise<Ticket[]>;
  getTicketsByAssignee(assigneeId: number): Promise<Ticket[]>;
  updateTicketStatus(id: number, status: TicketStatusType): Promise<Ticket | undefined>;

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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
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