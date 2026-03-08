import { cacheDirectory, EncodingType, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { expenseAPI, paymentAPI, pgAPI, tenantAPI } from './api';

const ExportService = {
    /**
     * Export all system data to an Excel file
     */
    async exportToExcel() {
        try {
            // 1. Fetch all data
            const [pgs, tenants, payments, expenses] = await Promise.all([
                pgAPI.getAll(),
                tenantAPI.getAll(),
                paymentAPI.getAll(),
                expenseAPI.getAll()
            ]);

            // 2. Create Workbook
            const wb = XLSX.utils.book_new();

            // 3. Add Sheets
            if (Array.isArray(pgs)) {
                const ws = XLSX.utils.json_to_sheet(pgs);
                XLSX.utils.book_append_sheet(wb, ws, "Properties");
            }

            if (Array.isArray(tenants)) {
                const ws = XLSX.utils.json_to_sheet(tenants);
                XLSX.utils.book_append_sheet(wb, ws, "Residents");
            }

            if (Array.isArray(payments)) {
                const ws = XLSX.utils.json_to_sheet(payments);
                XLSX.utils.book_append_sheet(wb, ws, "Payments");
            }

            if (Array.isArray(expenses)) {
                const ws = XLSX.utils.json_to_sheet(expenses);
                XLSX.utils.book_append_sheet(wb, ws, "Expenses");
            }

            // 4. Generate Output
            const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
            const filename = `PG_Manager_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
            const uri = `${cacheDirectory}${filename}`;

            // 5. Save and Share
            await writeAsStringAsync(uri, wbout, { encoding: EncodingType.Base64 });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            } else {
                return uri;
            }
        } catch (error) {
            console.error("Export error:", error);
            throw error;
        }
    }
};

export default ExportService;
