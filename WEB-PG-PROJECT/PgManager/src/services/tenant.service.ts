import { tenantAPI } from "../api/tenant.api";
import { bedAPI } from "../api/bed.api";
import { roomService } from "./room.service";
import { paymentAPI } from "../api/payment.api";
import { supabase } from "../api/supabaseClient";

export const tenantService = {
    createTenant: async (formData: any, paidNow: number) => {
        const { stayType, rentAmount, maintenanceAmount, maintenanceType, joinedDate, vacateDate } = formData;

        // 1. Calculate Initial Total Rent and Balance (Only for DAILY logic/details)
        let totalRent = null;
        let balanceAmount = null;

        if (stayType === "DAILY") {
            const start = new Date(joinedDate);
            const end = new Date(vacateDate);
            let diffDays = 1;
            if (end > start) {
                diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            }

            const rentBase = diffDays * Number(rentAmount || 0);
            const maintenanceBase = Number(maintenanceAmount || 0);
            totalRent = rentBase + maintenanceBase;
            balanceAmount = Math.max(0, totalRent - paidNow);
        }

        const { data: { user } } = await supabase.auth.getUser();

        // 2. Prepare Identity Payload (tenants table)
        // WE NO LONGER POPULATE THE 'balance' COLUMN HERE.
        const identityPayload = {
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            gender: formData.gender,
            dob: formData.dob,
            profession: formData.profession,
            guardian_name: formData.guardianName,
            guardian_phone: formData.guardianPhone,
            id_type: formData.idType,
            id_number: formData.idNumber,
            stay_type: stayType,
            rent_cycle: formData.rentPaymentType,
            move_in_date: joinedDate,
            vacate_date: stayType === "DAILY" ? vacateDate : null,
            rent_per_month: stayType === "MONTHLY" ? Number(rentAmount) : null,
            rent_per_day: stayType === "DAILY" ? Number(rentAmount) : null,
            custom_rent: stayType === "MONTHLY" ? Number(rentAmount) : null,
            maintenance_amount: Number(maintenanceAmount) || 0,
            maintenance_type: maintenanceType || null,
            total_rent: totalRent,
            security_deposit: Number(formData.securityDeposit) || 0,
            pg_id: formData.pgId,
            room_id: formData.roomId,
            bed_id: formData.bedId,
            status: "ACTIVE",
            owner_id: user?.id
        };

        // 3. Create Tenant Identity
        const tenant = await tenantAPI.createIdentity(identityPayload);
        const tenantId = tenant.id;

        // 4. Update Bed Status
        await bedAPI.update(formData.bedId, { status: "OCCUPIED", tenant_id: tenantId });
        await roomService.recalculateOccupancy(formData.roomId);

        // 5. Create Daily Details if applicable
        if (stayType === "DAILY") {
            await tenantAPI.createDailyDetails({
                tenant_id: tenantId,
                move_in_date: joinedDate,
                vacate_date: vacateDate,
                rent_per_day: Number(rentAmount) || 0,
                total_rent: totalRent || 0,
                paid_amount: paidNow || 0,
                balance_amount: balanceAmount,
                maintenance_amount: Number(maintenanceAmount) || 0,
                maintenance_type: maintenanceType || null
            });
        }

        // 6. Record Initial Payment
        if (paidNow > 0) {
            await paymentAPI.create({
                tenant_id: tenantId,
                pg_id: formData.pgId,
                amount: paidNow,
                payment_date: joinedDate,
                status: "COMPLETED",
                type: "RENT",
                payment_method: formData.paymentMethod,
                billing_month: `${joinedDate.slice(0, 7)}-01`,
                notes: `Initial onboarding payment of ₹${paidNow}`,
                owner_id: user?.id
            });
        }

        return tenant;
    },

    updateTenant: async (tenantId: string, formData: any, initialData: any, paidNow: number) => {
        const { stayType, rentAmount, maintenanceAmount, maintenanceType, joinedDate, vacateDate } = formData;
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Calculate Updated Rent and Balances (DAILY logic)
        let totalRent = null;
        let balanceAmount = null;

        if (stayType === "DAILY") {
            const start = new Date(joinedDate);
            const end = new Date(vacateDate);
            let diffDays = 1;
            if (end > start) {
                diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            }

            const rentBase = diffDays * Number(rentAmount || 0);
            const maintenanceBase = Number(maintenanceAmount || 0);
            totalRent = rentBase + maintenanceBase;

            // Get previous paid amount for daily details consistency
            const { data: currentDaily } = await supabase.from("daily_stay_details").select("paid_amount").eq("tenant_id", tenantId).maybeSingle();
            const prevPaid = Number(currentDaily?.paid_amount || 0);
            balanceAmount = Math.max(0, totalRent - (prevPaid + paidNow));
        }

        // 2. Prepare Identity Payload (tenants table)
        const payload: any = {
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            gender: formData.gender,
            dob: formData.dob,
            profession: formData.profession,
            guardian_name: formData.guardianName,
            guardian_phone: formData.guardianPhone,
            id_type: formData.idType,
            id_number: formData.idNumber,
            pg_id: formData.pgId,
            room_id: formData.roomId,
            bed_id: formData.bedId,
            stay_type: stayType,
            move_in_date: joinedDate,
            vacate_date: stayType === "DAILY" ? vacateDate : (initialData?.vacate_date || null),
            rent_per_month: stayType === "MONTHLY" ? Number(rentAmount) : null,
            rent_per_day: stayType === "DAILY" ? Number(rentAmount) : null,
            custom_rent: stayType === "MONTHLY" ? Number(rentAmount) : (initialData?.custom_rent || null),
            maintenance_amount: Number(maintenanceAmount) || 0,
            maintenance_type: maintenanceType || null,
            total_rent: totalRent,
            security_deposit: Number(formData.securityDeposit) || 0,
            updated_at: new Date().toISOString()
        };

        // 3. Update Identity
        await tenantAPI.updateIdentity(tenantId, payload);

        // 4. Update Daily Details
        if (stayType === "DAILY") {
            const { data: currentDaily } = await supabase.from("daily_stay_details").select("paid_amount").eq("tenant_id", tenantId).maybeSingle();
            const prevPaid = Number(currentDaily?.paid_amount || 0);

            await tenantAPI.updateDailyDetails(tenantId, {
                move_in_date: joinedDate,
                vacate_date: vacateDate,
                rent_per_day: Number(rentAmount) || 0,
                total_rent: totalRent || 0,
                paid_amount: prevPaid + paidNow,
                balance_amount: balanceAmount,
                maintenance_amount: Number(maintenanceAmount) || 0,
                maintenance_type: maintenanceType || null
            });
        }

        // 5. Handle Room Changes if necessary
        if (formData.bedId !== initialData.bedId) {
            // Free old bed
            await bedAPI.update(initialData.bedId, { status: "AVAILABLE", tenant_id: null });
            // Occupy new bed
            await bedAPI.update(formData.bedId, { status: "OCCUPIED", tenant_id: tenantId });
            // Recalculate occupancy for both rooms
            await roomService.recalculateOccupancy(initialData.roomId);
            await roomService.recalculateOccupancy(formData.roomId);
        }

        // 6. Record New Payment if any
        if (paidNow > 0) {
            await paymentAPI.create({
                tenant_id: tenantId,
                pg_id: formData.pgId,
                amount: paidNow,
                payment_date: new Date().toISOString().split('T')[0],
                status: "COMPLETED",
                type: "RENT",
                payment_method: formData.paymentMethod || "CASH",
                billing_month: `${joinedDate.slice(0, 7)}-01`,
                notes: `Update-time payment of ₹${paidNow}`,
                owner_id: user?.id
            });
        }

        return { id: tenantId, ...payload };
    }
};
