import { z } from "zod";

export const expenseSchema = z.object({
    title: z.string().trim().min(1, "Description is required"),
    category: z.string().min(1, "Category is required"),
    amount: z.number().min(1, "Amount must be greater than 0"),
    date: z.string().refine((val) => {
        // Avoid timezone offset issues by directly comparing YYYY-MM-DD strings in local time
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        return val <= todayStr;
    }, {
        message: "FUTURE DATES ARE NOT ALLOWED",
        path: ["date"],
    }),
    pg_id: z.string().nullable().optional(),
    vendor_name: z.string().optional(),
    notes: z.string().optional(),
});
