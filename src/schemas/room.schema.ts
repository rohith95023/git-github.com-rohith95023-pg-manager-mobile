import { z } from "zod";

export const roomSchema = z.object({
    pgId: z.string().uuid("Please select a valid property"),
    floorNumber: z.number().int().min(1, "Floor must be at least 1"),
    roomNumber: z.string()
        .trim()
        .min(1, "Room number is required")
        .max(7, "Room number cannot exceed 7 characters")
        .regex(/^[a-zA-Z0-9]+$/, "Alphanumeric characters only (no special characters)"),
    roomType: z.enum(["SINGLE", "DOUBLE", "TRIPLE", "FOUR_SHARE", "FIVE_SHARE", "OTHERS"]),
    capacity: z.number().int().min(1, "Minimum 1 bed required").max(99, "Maximum 99 beds"),
    monthlyRent: z.number()
        .min(500, "Rent must be at least ₹500")
        .max(9999999, "Rent cannot exceed 7 digits (₹99,99,999)")
        .refine(val => !isNaN(val) && val > 0, "Rent must be a positive number"),
    status: z.enum(["AVAILABLE", "FULL", "PARTIAL", "MAINTENANCE", "INACTIVE"]),
});
