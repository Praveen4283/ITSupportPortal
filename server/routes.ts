import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { z } from "zod";
import { insertUserSchema, insertTicketSchema, insertTicketCommentSchema, UserRole, type User as UserType } from "@shared/schema";
import memorystore from "memorystore";
import { randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";
import { eq } from 'drizzle-orm'; // Or similar ORM import, adjust as needed.
import { users, tickets } from './db-schema'; // Or similar import for your DB schema


declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

// Update the User interface in the global namespace
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      companyName?: string;
      department?: string;
      designation?: string;
      phoneNumber?: string;
      createdAt: Date;
    }
  }
}

const MemoryStore = memorystore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(
    session({
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      secret: "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }, // set to true in production with HTTPS
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport local strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid credentials" });
          }

          // Compare password using bcrypt
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid credentials" });
          }

          // Remove sensitive data before sending to client
          const { password: _, ...safeUser } = user;
          return done(null, safeUser);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      // Remove sensitive data
      const { password: _, ...safeUser } = user;
      done(null, safeUser);
    } catch (err) {
      done(err);
    }
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      // Remove sensitive data
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    // Handle remember me
    if (req.body.rememberMe) {
      const token = randomBytes(32).toString('hex');
      storage.setRememberToken(req.user!.id, token);
      // Set a cookie that expires in 30 days
      res.cookie('remember_token', token, {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
    }
    res.json(req.user);
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie('remember_token');
    req.logout(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const token = randomBytes(32).toString('hex');
      await storage.setResetToken(user.id, token);

      // In a real application, send an email with the reset link
      // For now, we'll just return success
      res.json({ message: "Reset instructions sent" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Check if email exists for password reset
  app.post("/api/auth/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "Email found" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Reset password directly
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updatePassword(user.id, password);
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Profile routes
  app.patch("/api/me", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = await storage.updateUser(req.user.id, req.body);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Failed to update profile" });
    }
  });


  // User routes
  app.get("/api/me", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(req.user);
  });

  // Ticket routes
  app.post("/api/tickets", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const ticketData = insertTicketSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const ticket = await storage.createTicket(ticketData);
      res.json(ticket);
    } catch (error) {
      res.status(400).json({ message: "Invalid ticket data" });
    }
  });

  app.get("/api/tickets", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      let tickets;
      if (req.user.role === UserRole.CUSTOMER) {
        tickets = await storage.getTicketsByUser(req.user.id);
      } else if (req.user.role === UserRole.SUPPORT) {
        tickets = await storage.getTicketsByAssignee(req.user.id);
      } else {
        // Admin can see all tickets
        tickets = await storage.getTicketsByUser(req.user.id);
      }
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.get("/api/tickets/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const ticket = await storage.getTicket(parseInt(req.params.id));
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  app.post("/api/tickets/:id/comments", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const commentData = insertTicketCommentSchema.parse({
        ...req.body,
        ticketId: parseInt(req.params.id),
        userId: req.user.id,
      });
      const comment = await storage.createTicketComment(commentData);
      res.json(comment);
    } catch (error) {
      res.status(400).json({ message: "Invalid comment data" });
    }
  });

  app.get("/api/tickets/:id/comments", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const comments = await storage.getTicketComments(parseInt(req.params.id));
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Add this route to handle ticket deletion
  app.delete("/api/tickets/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      await storage.deleteTicket(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete ticket" });
    }
  });

  // Get support team users
  app.get("/api/users/support", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const supportUsers = await storage.getSupportUsers(); // Assuming storage has this function
      res.json(supportUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch support users" });
    }
  });

  // Assign ticket
  app.patch("/api/tickets/:id/assign", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPPORT) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const { assignedToId } = req.body;
      const ticket = await storage.assignTicket(parseInt(req.params.id), assignedToId); // Assuming storage has this function
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign ticket" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}