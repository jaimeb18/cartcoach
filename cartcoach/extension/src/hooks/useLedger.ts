import { useState, useCallback } from "react";
import { API_BASE_URL } from "@shared/constants";
import type { LedgerEntry, LedgerMonth, SpendingHistory } from "@shared/types";

export function useLedger(userId: string | null) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableMonths, setAvailableMonths] = useState<LedgerMonth[]>([]);

  // Fetch entries for a specific month/year
  const loadMonth = useCallback(
    async (year: number, month: number) => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/ledger/${userId}/${year}/${month}`
        );
        if (!res.ok) throw new Error("Failed to load ledger");
        const data = await res.json();
        setEntries(data.entries || []);
      } catch (e) {
        setError((e as Error).message);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  // Save entries for current month
  const saveMonth = useCallback(
    async (entriesToSave: LedgerEntry[]) => {
      if (!userId) return;
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/ledger/${userId}/${year}/${month}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries: entriesToSave }),
          }
        );
        if (!res.ok) throw new Error("Failed to save ledger");
        return await res.json();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [userId, currentMonth]
  );

  // Delete a single entry
  const deleteEntry = useCallback(
    async (entryId: string) => {
      if (!userId) return;
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/ledger/${userId}/${year}/${month}/${entryId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to delete entry");
        setEntries(entries.filter((e) => e.id !== entryId));
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [userId, currentMonth, entries]
  );

  // Sync Chrome local storage history into the ledger (idempotent via log_{id})
  const syncHistoryToLedger = useCallback(
    async (history: SpendingHistory[]) => {
      if (!userId) return;
      // Only purchased and saved_later get ledger entries
      const relevant = history.filter(
        (h) => h.action === "purchased" || h.action === "saved_later"
      );
      // Group by year/month
      const byMonth: Record<string, { year: number; month: number; entries: LedgerEntry[] }> = {};
      for (const h of relevant) {
        const d = new Date(h.timestamp);
        const key = `${d.getFullYear()}_${d.getMonth() + 1}`;
        if (!byMonth[key]) {
          byMonth[key] = { year: d.getFullYear(), month: d.getMonth() + 1, entries: [] };
        }
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        byMonth[key].entries.push({
          id: `log_${h.id}`,
          date: dateStr,
          description: h.action === "purchased" ? h.product.productName : "Item Skipped - Cash Transfer",
          category: h.action === "purchased" ? h.product.category : "Savings",
          inflow: null,
          outflow: h.product.price,
          notes: h.product.site,
          source: "auto",
        });
      }
      // POST each month's entries
      await Promise.all(
        Object.values(byMonth).map(({ year, month, entries }) =>
          fetch(`${API_BASE_URL}/api/ledger/${userId}/${year}/${month}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries }),
          })
        )
      );
    },
    [userId]
  );

  // Fetch available months for the user
  const loadAvailableMonths = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/ledger/${userId}/months`);
      if (!res.ok) throw new Error("Failed to fetch available months");
      const data = await res.json();
      setAvailableMonths(data.available_months || []);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [userId]);

  return {
    entries,
    setEntries,
    loading,
    error,
    currentMonth,
    setCurrentMonth,
    loadMonth,
    saveMonth,
    deleteEntry,
    availableMonths,
    loadAvailableMonths,
    syncHistoryToLedger,
  };
}
