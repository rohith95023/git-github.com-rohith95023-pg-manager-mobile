import { z } from "zod";

export const PROFESSION_OPTIONS = [
    "Software Engineer",
    "IT Professional",
    "Student",
    "Business Owner",
    "Sales/Marketing",
    "Medical Professional",
    "Government Employee",
    "Hospitallity",
    "Freelancer",
    "Teacher/Professor",
    "Other"
];

export const personalDetailsSchema = z.object({
    fullName: z.string().min(3, "Name must be at least 3 characters").regex(/^[a-zA-Z\s.]+$/, "Only letters, spaces, and dots allowed"),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid 10-digit phone number"),
    email: z.string().regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, "Please enter a valid email address").optional().or(z.literal("")),
    gender: z.enum(["MALE", "FEMALE"]),
    dob: z.string().refine((val) => {
        const year = new Date(val).getFullYear();
        return year >= 1900 && year <= 2099;
    }, "Year must be between 1900 and 2099."),
    profession: z.string().min(2, "Profession is required"),
    guardianName: z.string().optional().or(z.literal("")),
    guardianPhone: z.string().refine(val => !val || /^[6-9]\d{9}$/.test(val), "Invalid 10-digit phone number").optional().or(z.literal("")),
    idType: z.enum(["AADHAR", "PAN", "PASSPORT", "DL", "VOTER"]),
    idNumber: z.string().min(1, "ID Number is required"),
}).refine((data) => {
    const age = new Date().getFullYear() - new Date(data.dob).getFullYear();
    if (age < 16 && (!data.guardianName || !data.guardianPhone)) return false;
    return true;
}, {
    message: "Guardian name and phone are required for residents under 16",
    path: ["guardianName"],
}).refine((data) => {
    if (data.guardianPhone && data.phone === data.guardianPhone) return false;
    return true;
}, {
    message: "Guardian phone cannot be same as tenant phone",
    path: ["guardianPhone"],
});

export const stayDetailsSchema = z.object({
    stayType: z.enum(["MONTHLY", "DAILY"]),
    joinedDate: z.string().min(1, "Joined Date is required").refine((val) => {
        const year = new Date(val).getFullYear();
        return year >= 1900 && year <= 2099;
    }, "Year must be between 1900 and 2099."),
    vacateDate: z.string().optional().refine((val) => {
        if (!val) return true;
        const year = new Date(val).getFullYear();
        return year >= 1900 && year <= 2099;
    }, "Year must be between 1900 and 2099."),
    rentPaymentType: z.enum(["FIXED_FIRST_DAY", "JOIN_DATE_BASED"]).optional(),
    rentAmount: z.number().min(1, "Rent amount is required"),
    securityDeposit: z.number().min(0).default(0),
}).refine((data) => {
    if (data.stayType === "DAILY") {
        if (!data.vacateDate) return false;
        return new Date(data.vacateDate) > new Date(data.joinedDate);
    }
    return true;
}, {
    message: "Vacate date must be after joined date",
    path: ["vacateDate"],
});
