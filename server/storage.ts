import { desc, eq, sql } from "drizzle-orm";
import {
  type User,
  type InsertUser,
  type Contact,
  type InsertContact,
  type Volunteer,
  type InsertVolunteer,
  type Donation,
  type InsertDonation,
  type Newsletter,
  type InsertNewsletter,
  type BlogPost,
  type InsertBlogPost,
  users,
  contacts,
  volunteers,
  donations,
  newsletters,
  blogPosts,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { requireDb } from "./db";

export interface IStorage {
  readonly mode: "memory" | "database";
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createContact(contact: InsertContact): Promise<Contact>;
  createVolunteer(volunteer: InsertVolunteer): Promise<Volunteer>;
  createDonation(donation: InsertDonation): Promise<Donation>;
  createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter>;
  getNewsletterByEmail(email: string): Promise<Newsletter | undefined>;
  createBlogPost(blogPost: InsertBlogPost): Promise<BlogPost>;
  getBlogPosts(status?: string): Promise<BlogPost[]>;
  getBlogPost(id: string): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost | undefined>;
  deleteBlogPost(id: string): Promise<boolean>;
  healthCheck(): Promise<boolean>;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() + "-" + Date.now();
}

export class DatabaseStorage implements IStorage {
  readonly mode = "database" as const;

  async healthCheck(): Promise<boolean> {
    await requireDb().execute(sql`select 1`);
    return true;
  }

  async getUser(id: string): Promise<User | undefined> {
    const rows = await requireDb().select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await requireDb().select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const rows = await requireDb().insert(users).values(insertUser).returning();
    return rows[0];
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const rows = await requireDb().insert(contacts).values(insertContact).returning();
    return rows[0];
  }

  async createVolunteer(insertVolunteer: InsertVolunteer): Promise<Volunteer> {
    const rows = await requireDb().insert(volunteers).values({
      ...insertVolunteer,
      skills: insertVolunteer.skills || null,
    }).returning();
    return rows[0];
  }

  async createDonation(insertDonation: InsertDonation): Promise<Donation> {
    const rows = await requireDb().insert(donations).values({
      ...insertDonation,
      isMonthly: insertDonation.isMonthly || false,
      donorEmail: insertDonation.donorEmail || null,
      donorName: insertDonation.donorName || null,
      status: "pending",
    }).returning();
    return rows[0];
  }

  async createNewsletter(insertNewsletter: InsertNewsletter): Promise<Newsletter> {
    const rows = await requireDb().insert(newsletters).values({
      ...insertNewsletter,
      isActive: true,
    }).returning();
    return rows[0];
  }

  async getNewsletterByEmail(email: string): Promise<Newsletter | undefined> {
    const rows = await requireDb()
      .select()
      .from(newsletters)
      .where(eq(newsletters.email, email))
      .limit(1);
    return rows[0];
  }

  async createBlogPost(insertBlogPost: InsertBlogPost): Promise<BlogPost> {
    const rows = await requireDb().insert(blogPosts).values({
      ...insertBlogPost,
      slug: generateSlug(insertBlogPost.title),
      excerpt: insertBlogPost.excerpt || null,
      category: insertBlogPost.category || "general",
      featuredImage: insertBlogPost.featuredImage || null,
      tags: insertBlogPost.tags || null,
      status: "pending",
      viewCount: 0,
    }).returning();
    return rows[0];
  }

  async getBlogPosts(status?: string): Promise<BlogPost[]> {
    const query = requireDb().select().from(blogPosts);
    const rows = status
      ? await query.where(eq(blogPosts.status, status)).orderBy(desc(blogPosts.createdAt))
      : await query.orderBy(desc(blogPosts.createdAt));
    return rows;
  }

  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    const rows = await requireDb().select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
    return rows[0];
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const rows = await requireDb().select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
    return rows[0];
  }

  async updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost | undefined> {
    const allowedKeys: Array<keyof BlogPost> = [
      "title",
      "content",
      "excerpt",
      "authorName",
      "authorEmail",
      "status",
      "category",
      "featuredImage",
      "tags",
      "viewCount",
    ];

    const safeUpdates = Object.fromEntries(
      allowedKeys
        .filter((key) => updates[key] !== undefined)
        .map((key) => [key, updates[key]]),
    ) as Partial<BlogPost>;

    const rows = await requireDb()
      .update(blogPosts)
      .set({
        ...safeUpdates,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();

    return rows[0];
  }

  async deleteBlogPost(id: string): Promise<boolean> {
    const rows = await requireDb()
      .delete(blogPosts)
      .where(eq(blogPosts.id, id))
      .returning({ id: blogPosts.id });
    return rows.length > 0;
  }
}

export class MemStorage implements IStorage {
  readonly mode = "memory" as const;
  private users = new Map<string, User>();
  private contacts = new Map<string, Contact>();
  private volunteers = new Map<string, Volunteer>();
  private donations = new Map<string, Donation>();
  private newsletters = new Map<string, Newsletter>();
  private blogPosts = new Map<string, BlogPost>();

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = { ...insertContact, id, createdAt: new Date() };
    this.contacts.set(id, contact);
    return contact;
  }

  async createVolunteer(insertVolunteer: InsertVolunteer): Promise<Volunteer> {
    const id = randomUUID();
    const volunteer: Volunteer = {
      ...insertVolunteer,
      id,
      skills: insertVolunteer.skills || null,
      createdAt: new Date(),
    };
    this.volunteers.set(id, volunteer);
    return volunteer;
  }

  async createDonation(insertDonation: InsertDonation): Promise<Donation> {
    const id = randomUUID();
    const donation: Donation = {
      ...insertDonation,
      id,
      isMonthly: insertDonation.isMonthly || false,
      donorEmail: insertDonation.donorEmail || null,
      donorName: insertDonation.donorName || null,
      status: "pending",
      createdAt: new Date(),
    };
    this.donations.set(id, donation);
    return donation;
  }

  async createNewsletter(insertNewsletter: InsertNewsletter): Promise<Newsletter> {
    const id = randomUUID();
    const newsletter: Newsletter = {
      ...insertNewsletter,
      id,
      isActive: true,
      createdAt: new Date(),
    };
    this.newsletters.set(id, newsletter);
    return newsletter;
  }

  async getNewsletterByEmail(email: string): Promise<Newsletter | undefined> {
    return Array.from(this.newsletters.values()).find((newsletter) => newsletter.email === email);
  }

  async createBlogPost(insertBlogPost: InsertBlogPost): Promise<BlogPost> {
    const id = randomUUID();
    const blogPost: BlogPost = {
      ...insertBlogPost,
      id,
      slug: generateSlug(insertBlogPost.title),
      excerpt: insertBlogPost.excerpt || null,
      category: insertBlogPost.category || "general",
      featuredImage: insertBlogPost.featuredImage || null,
      tags: insertBlogPost.tags || null,
      status: "pending",
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.blogPosts.set(id, blogPost);
    return blogPost;
  }

  async getBlogPosts(status?: string): Promise<BlogPost[]> {
    const allPosts = Array.from(this.blogPosts.values());
    if (status) return allPosts.filter((post) => post.status === status);
    return allPosts.sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(),
    );
  }

  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    return this.blogPosts.get(id);
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    return Array.from(this.blogPosts.values()).find((post) => post.slug === slug);
  }

  async updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost | undefined> {
    const existing = this.blogPosts.get(id);
    if (!existing) return undefined;
    const updated: BlogPost = { ...existing, ...updates, updatedAt: new Date() };
    this.blogPosts.set(id, updated);
    return updated;
  }

  async deleteBlogPost(id: string): Promise<boolean> {
    return this.blogPosts.delete(id);
  }
}

export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemStorage();
