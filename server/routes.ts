import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, insertVolunteerSchema, insertDonationSchema, insertNewsletterSchema, insertBlogPostSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {

  // Database/storage health check
  app.get("/api/health/db", async (_req, res) => {
    try {
      const healthy = await storage.healthCheck();
      res.json({
        ok: healthy,
        storage: storage.mode,
        databaseConfigured: storage.mode === "database",
      });
    } catch (error) {
      console.error("Database health check failed:", error);
      res.status(503).json({
        ok: false,
        storage: storage.mode,
        databaseConfigured: storage.mode === "database",
        error: "Database connection failed",
      });
    }
  });

  // Contact form submission
  app.post("/api/contacts", async (req, res) => {
    try {
      const validatedData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(validatedData);
      res.json({ success: true, contact });
    } catch (error) {
      res.status(400).json({ success: false, error: "Invalid contact data" });
    }
  });

  // Volunteer application submission
  app.post("/api/volunteers", async (req, res) => {
    try {
      const validatedData = insertVolunteerSchema.parse(req.body);
      const volunteer = await storage.createVolunteer(validatedData);
      res.json({ success: true, volunteer });
    } catch (error) {
      res.status(400).json({ success: false, error: "Invalid volunteer data" });
    }
  });

  // Donation processing
  app.post("/api/donations", async (req, res) => {
    try {
      const validatedData = insertDonationSchema.parse(req.body);
      const donation = await storage.createDonation(validatedData);
      
      // UPI payments are completed directly by the donor through their UPI app or QR code.
      // The server records the donation intent; payment confirmation is not automated in this flow.
      res.json({
        success: true,
        donation,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: "Invalid donation data" });
    }
  });

  // Newsletter subscription
  app.post("/api/newsletter", async (req, res) => {
    try {
      const validatedData = insertNewsletterSchema.parse(req.body);
      
      // Check if email already exists
      const existingSubscription = await storage.getNewsletterByEmail(validatedData.email);
      if (existingSubscription) {
        return res.status(400).json({ success: false, error: "Email already subscribed" });
      }
      
      const newsletter = await storage.createNewsletter(validatedData);
      res.json({ success: true, newsletter });
    } catch (error) {
      res.status(400).json({ success: false, error: "Invalid email address" });
    }
  });

  // =================== BLOG ENDPOINTS ===================
  
  // Create new blog post (public submission)
  app.post("/api/blogs", async (req, res) => {
    try {
      const validatedData = insertBlogPostSchema.parse(req.body);
      const blogPost = await storage.createBlogPost(validatedData);
      res.json({ 
        success: true, 
        blogPost,
        message: "Your blog post has been submitted for review. We'll publish it after approval."
      });
    } catch (error) {
      console.error("Blog creation error:", error);
      res.status(400).json({ success: false, error: "Invalid blog post data" });
    }
  });

  // Get all published blog posts
  app.get("/api/blogs", async (req, res) => {
    try {
      const blogPosts = await storage.getBlogPosts("published");
      res.json({ success: true, blogPosts });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch blog posts" });
    }
  });

  // Get single blog post by ID
  app.get("/api/blogs/:id", async (req, res) => {
    try {
      const blogPost = await storage.getBlogPost(req.params.id);
      if (!blogPost) {
        return res.status(404).json({ success: false, error: "Blog post not found" });
      }
      
      // Increment view count for published posts
      if (blogPost.status === "published") {
        await storage.updateBlogPost(req.params.id, { viewCount: (blogPost.viewCount || 0) + 1 });
      }
      
      res.json({ success: true, blogPost });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch blog post" });
    }
  });

  // Get blog post by slug (SEO friendly URLs)
  app.get("/api/blogs/slug/:slug", async (req, res) => {
    try {
      const blogPost = await storage.getBlogPostBySlug(req.params.slug);
      if (!blogPost || blogPost.status !== "published") {
        return res.status(404).json({ success: false, error: "Blog post not found" });
      }
      
      // Increment view count
      await storage.updateBlogPost(blogPost.id, { viewCount: (blogPost.viewCount || 0) + 1 });
      
      res.json({ success: true, blogPost });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch blog post" });
    }
  });

  // =================== ADMIN BLOG ENDPOINTS ===================
  // (These would normally require authentication)
  
  // Get all blog posts including pending ones (admin)
  app.get("/api/admin/blogs", async (req, res) => {
    try {
      const status = req.query.status as string;
      const blogPosts = await storage.getBlogPosts(status);
      res.json({ success: true, blogPosts });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch blog posts" });
    }
  });

  // Approve blog post (admin)
  app.put("/api/admin/blogs/:id/approve", async (req, res) => {
    try {
      const blogPost = await storage.updateBlogPost(req.params.id, { status: "published" });
      if (!blogPost) {
        return res.status(404).json({ success: false, error: "Blog post not found" });
      }
      res.json({ success: true, blogPost, message: "Blog post approved and published" });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to approve blog post" });
    }
  });

  // Reject blog post (admin)
  app.put("/api/admin/blogs/:id/reject", async (req, res) => {
    try {
      const { reason } = req.body;
      const blogPost = await storage.updateBlogPost(req.params.id, { 
        status: "rejected",
        // Could add rejection reason field to schema later
      });
      if (!blogPost) {
        return res.status(404).json({ success: false, error: "Blog post not found" });
      }
      res.json({ success: true, blogPost, message: "Blog post rejected" });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to reject blog post" });
    }
  });

  // Update blog post (admin)
  app.put("/api/admin/blogs/:id", async (req, res) => {
    try {
      const updates = req.body;
      const blogPost = await storage.updateBlogPost(req.params.id, updates);
      if (!blogPost) {
        return res.status(404).json({ success: false, error: "Blog post not found" });
      }
      res.json({ success: true, blogPost, message: "Blog post updated" });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update blog post" });
    }
  });

  // Delete blog post (admin)
  app.delete("/api/admin/blogs/:id", async (req, res) => {
    try {
      const success = await storage.deleteBlogPost(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, error: "Blog post not found" });
      }
      res.json({ success: true, message: "Blog post deleted" });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete blog post" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
