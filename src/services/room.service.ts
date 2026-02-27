import { roomAPI } from "../api/room.api";
import { bedAPI } from "../api/bed.api";

export const roomService = {
    recalculateOccupancy: async (roomId: string) => {
        if (!roomId) return { success: false, message: "No room ID provided" };

        try {
            // 1. Get capacities
            const capacity = await bedAPI.getBedCountByStatus(roomId);
            const occupied = await bedAPI.getBedCountByStatus(roomId, "OCCUPIED");
            const maintenance = await bedAPI.getBedCountByStatus(roomId, "MAINTENANCE");

            const finalCapacity = capacity || 0;
            const finalOccupied = occupied || 0;

            // 2. Fetch current status to preserve admin states
            const room = await roomAPI.getById(roomId);

            let status = "AVAILABLE";
            const unavailableCount = finalOccupied + maintenance;

            if (unavailableCount >= finalCapacity && finalCapacity > 0) {
                status = "FULL";
            } else if (finalOccupied > 0) {
                status = "PARTIAL";
            }

            if (room && (room.status === "MAINTENANCE" || room.status === "INACTIVE")) {
                status = room.status;
            }

            // 3. Update room occupancy
            await roomAPI.updateOccupancy(roomId, finalOccupied, status);

            return { success: true };
        } catch (error) {
            console.error("[Room Service] recalculateOccupancy failed:", error);
            throw error;
        }
    }
};
