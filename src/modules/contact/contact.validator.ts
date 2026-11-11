import { z } from "zod";

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().email("Please enter a valid email address"),
  subject: z.string().trim().min(2, "Subject is required").max(200),
  message: z.string().trim().min(5, "Message must be at least 5 characters").max(5000),
  category: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).optional(),
});
