import { z } from "zod";

export const paymentSchema = z.object({
    tenant_id: z.string().min(1, "Please select a resident"),
    pg_id: z.string().min(1, "Please select a property"),
    reservation_id: z.string().uuid("Please select a reservation").optional().or(z.literal("")),
    amount: z.number().min(1, "Amount must be greater than 0"),
    payment_date: z.string().min(1, "Transaction date is required"),
    billing_month: z.string().optional().or(z.literal("")),
    type: z.enum(["RENT", "DEPOSIT", "BOOKING", "ADVANCE", "REFUND", "MAINTENANCE", "UTILITIES", "OTHER"]),
    payment_method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE"]),
    status: z.enum(["COMPLETED", "PENDING", "PARTIAL", "FAILED", "PAID"]),
    notes: z.string().optional().or(z.literal("")),
}).refine(data => {
    if (data.type === "RENT" && !data.billing_month) return false;
    return true;
}, {
    message: "Billing month is required for Rent payments",
    path: ["billing_month"]
});
