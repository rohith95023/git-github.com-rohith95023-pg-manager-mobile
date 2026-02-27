import { z } from "zod";

export const pgSchema = z.object({
    name: z.string()
        .trim()
        .min(1, "Building Name is required")
        .min(3, "Name must be at least 3 characters")
        .max(100, "Name must be 3-100 characters")
        .regex(/^[a-zA-Z0-9\s.\-&]+$/, "Only letters, numbers, spaces, ., -, & allowed")
        .refine(val => val.trim().length > 0, "Only spaces are not allowed"),
    address: z.string()
        .trim()
        .min(1, "Address is required")
        .min(5, "Address must be at least 5 characters")
        .max(60, "Address must be max 60 characters")
        .regex(/^[a-zA-Z0-9\s-]+$/, "Only letters, numbers, spaces, and hyphens (-) allowed"),
    city: z.string()
        .trim()
        .min(1, "City is required")
        .min(2, "City must be at least 2 characters")
        .max(30, "City must be max 30 characters")
        .regex(/^[a-zA-Z\s]+$/, "Only alphabets and spaces are allowed"),
    state: z.string()
        .trim()
        .min(1, "State is required")
        .min(2, "State must be at least 2 characters")
        .max(30, "State must be max 30 characters")
        .regex(/^[a-zA-Z\s]+$/, "Only alphabets and spaces are allowed"),
    pincode: z.string()
        .min(1, "Pincode is required")
        .length(6, "Pincode must be exactly 6 digits")
        .regex(/^[0-9]{6}$/, "Pincode must be exactly 6 digits (numbers only)"),
    total_floors: z.number().int("Floors must be an integer")
        .min(1, "Minimum 1 floor required")
        .max(99, "Maximum 99 floors"),
    security_deposit: z.number().min(0, "Deposit cannot be negative"),
    maintenance_amount: z.number()
        .min(0, "Amount cannot be negative")
        .optional(),
    maintenance_type: z.enum(["one_time", "monthly"]).optional().nullable(),
    gender_type: z.enum(["MALE", "FEMALE", "CO-LIVING"]),
    amenities: z.array(z.string()).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "DELETED"]),
    description: z.string().optional(),
    support_contact: z.string()
        .trim()
        .min(1, "Support contact is required")
        .length(10, "Must be exactly 10 digits")
        .regex(/^[0-9]+$/, "Only numbers allowed"),
    owner_id: z.string().uuid(),
}).refine((data) => {
    if (data.maintenance_amount && data.maintenance_amount > 0 && !data.maintenance_type) {
        return false;
    }
    return true;
}, {
    message: "Maintenance type is required when amount is specified",
    path: ["maintenance_type"]
});
