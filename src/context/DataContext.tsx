import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    bedAPI,
    expenseAPI,
    financialAPI,
    invoiceAPI,
    ledgerAPI,
    paymentAPI,
    pgAPI,
    pnlAPI,
    roomAPI,
    statsAPI,
    tenantAPI,
} from '../services/api';

/* ─── Shape ───────────────────────────────────────────────────────── */
interface DataContextType {
    pgs: any[];
    rooms: any[];
    beds: any[];
    tenants: any[];
    payments: any[];
    expenses: any[];
    invoices: any[];
    ledger: any[];
    groupedLedger: any[];
    dashboardStats: any;
    dashboardKpis: any;
    pnlSummary: any[];
    pnlCategories: any[];
    loading: boolean;
    refreshing: boolean;
    lastFetched: number | null;
    refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

/**
 * Extracts an array from any backend response shape.
 * Tries common envelope keys before falling back.
 * Never wraps a plain object into [obj] — returns [] for scalars.
 */
const ARRAY_KEYS = [
    'data', 'items', 'results', 'records',
    'pgs', 'rooms', 'beds', 'tenants', 'payments',
    'expenses', 'invoices', 'ledger', 'summary', 'categories',
];

const toArray = (res: any, label = ''): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (typeof res === 'object') {
        // Try known envelope keys
        for (const key of ARRAY_KEYS) {
            if (Array.isArray(res[key])) return res[key];
        }
        // Log so we can see unexpected shape in Expo console
        if (label) console.warn(`[DataContext] ${label} — unexpected shape:`, JSON.stringify(res).slice(0, 200));
    }
    return [];
};

/**
 * Extracts a plain object from data envelope if needed.
 */
const toObject = (res: any): any => {
    if (!res) return null;
    if (res.data && !Array.isArray(res.data)) return res.data;
    if (res.items && !Array.isArray(res.items)) return res.items; // less common for objects
    return res;
};

/* ─── Provider ────────────────────────────────────────────────────── */
export const DataProvider = ({ children }: { children: ReactNode }) => {
    const [pgs, setPgs] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [ledger, setLedger] = useState<any[]>([]);
    const [groupedLedger, setGroupedLedger] = useState<any[]>([]);
    const [dashboardStats, setDashboardStats] = useState<any>(null);
    const [dashboardKpis, setDashboardKpis] = useState<any>(null);
    const [pnlSummary, setPnlSummary] = useState<any[]>([]);
    const [pnlCategories, setPnlCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastFetched, setLastFetched] = useState<number | null>(null);

    const fetchingRef = useRef(false);

    const fetchAll = useCallback(async (isRefresh = false) => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const [
                pgsRes, roomsRes, bedsRes, tenantsRes,
                paymentsRes, expensesRes, invoicesRes, ledgerRes,
                statsRes, kpisRes, pnlSumRes, pnlCatRes, groupedLedgerRes,
                archivedPgsRes, archivedRoomsRes, archivedBedsRes, archivedTenantsRes
            ] = await Promise.allSettled([
                pgAPI.getAll(),
                roomAPI.getAll(),
                bedAPI.getAll(),
                tenantAPI.getAll(),
                paymentAPI.getAll(),
                expenseAPI.getAll(),
                invoiceAPI.getAll(),
                ledgerAPI.getAll(),
                statsAPI.getDashboardStats(),
                statsAPI.getDashboardKpis(),
                pnlAPI.getSummary(),
                pnlAPI.getCategoryStats(),
                financialAPI.getGroupedLedger(),
                pgAPI.getArchived(),
                roomAPI.getArchived(),
                bedAPI.getArchived(),
                tenantAPI.getArchived(),
            ]);

            const val = (r: PromiseSettledResult<any>) =>
                r.status === 'fulfilled' ? r.value : (
                    console.warn('[DataContext] rejected:', (r as PromiseRejectedResult).reason?.message || r),
                    null
                );

            const activePgs = toArray(val(pgsRes), 'pgs');
            const archivedPgs = toArray(val(archivedPgsRes), 'archivedPgs').map(p => ({ ...p, archived: true }));
            setPgs([...activePgs, ...archivedPgs]);

            const activeRooms = toArray(val(roomsRes), 'rooms');
            const archivedRooms = toArray(val(archivedRoomsRes), 'archivedRooms').map(r => ({ ...r, archived: true }));
            setRooms([...activeRooms, ...archivedRooms]);

            const activeBeds = toArray(val(bedsRes), 'beds');
            const archivedBeds = toArray(val(archivedBedsRes), 'archivedBeds').map(b => ({ ...b, archived: true }));
            setBeds([...activeBeds, ...archivedBeds]);

            const activeTenants = toArray(val(tenantsRes), 'tenants');
            const archivedTenants = toArray(val(archivedTenantsRes), 'archivedTenants').map(t => ({ ...t, archived: true }));
            setTenants([...activeTenants, ...archivedTenants]);

            setPayments(toArray(val(paymentsRes), 'payments'));
            setExpenses(toArray(val(expensesRes), 'expenses'));
            setInvoices(toArray(val(invoicesRes), 'invoices'));
            setLedger(toArray(val(ledgerRes), 'ledger'));

            // Stats/KPIs are plain objects (not arrays)
            setDashboardStats(toObject(val(statsRes)));
            setDashboardKpis(toObject(val(kpisRes)));

            setPnlSummary(toArray(val(pnlSumRes), 'pnlSummary'));
            setPnlCategories(toArray(val(pnlCatRes), 'pnlCategories'));
            setGroupedLedger(toArray(val(groupedLedgerRes), 'groupedLedger'));

            setLastFetched(Date.now());
        } catch (err) {
            console.error('[DataContext] Fetch error:', err);
        } finally {
            fetchingRef.current = false;
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAll(false);
    }, [fetchAll]);

    const refresh = useCallback(() => fetchAll(true), [fetchAll]);

    return (
        <DataContext.Provider
            value={{
                pgs, rooms, beds, tenants, payments, expenses, invoices, ledger, groupedLedger,
                dashboardStats, dashboardKpis, pnlSummary, pnlCategories,
                loading, refreshing, lastFetched,
                refresh,
            }}
        >
            {children}
        </DataContext.Provider>
    );
};

/* ─── Hook ────────────────────────────────────────────────────────── */
export const useData = (): DataContextType => {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useData must be used within a DataProvider');
    return ctx;
};

export default DataContext;
