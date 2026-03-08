import React, { useState, useEffect, useRef } from "react";
import { useLedger } from "../hooks/useLedger";
import type { SpendingHistory } from "@shared/types";

export type LedgerRow = {
    id: string;
    date: string;
    description: string;
    category: string;
    inflow: string;
    outflow: string;
    balance: string;
    notes: string;
};

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function historyToRow(item: SpendingHistory): LedgerRow {
    const d = new Date(item.timestamp);
    const date = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    const isPurchase = item.action === "purchased";
    return {
        id: item.id,
        date,
        description: item.product.productName,
        category: item.product.category,
        inflow: isPurchase ? "" : item.product.price.toString(),
        outflow: isPurchase ? item.product.price.toString() : "",
        balance: "",
        notes: item.product.site,
    };
}

// Generate years from 2020 to 2030
const YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i);

const CATEGORIES = [
    "Grocery", "Income", "Transportation", "Utilities", "Housing", "Discretionary Spending", "Savings"
];

export default function LedgerTable({ history = [], userId = null, onDeleteHistory }: { history?: SpendingHistory[], userId?: string | null, onDeleteHistory?: (id: string) => void }) {
    const { entries, setEntries, loading, error, currentMonth, setCurrentMonth, loadMonth, saveMonth, deleteEntry, syncHistoryToLedger } = useLedger(userId);
    const [editingCell, setEditingCell] = useState<{ id: string, field: keyof LedgerRow } | null>(null);
    const [suggestion, setSuggestion] = useState<string>("");
    const prevDateRef = useRef(currentMonth);
    const saveTimeoutRef = useRef<number | null>(null);
    const isLoadingRows = useRef(false);

    // Helper to format currentMonth as 'Month Day, Year'
    function getDateString(date: Date) {
        return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    function normalizeDate(raw: string): string {
        if (!raw) return "";
        // Already "Month Day, Year" format
        if (/^[A-Za-z]/.test(raw)) return raw;
        // ISO format YYYY-MM-DD
        const [year, month, day] = raw.split("-").map(Number);
        if (year && month && day) {
            return `${MONTHS[month - 1]} ${day}, ${year}`;
        }
        return raw;
    }

    // Convert backend entries to LedgerRow
    function entryToRow(entry: any): LedgerRow {
        return {
            id: entry.id,
            date: normalizeDate(entry.date),
            description: entry.description,
            category: entry.category,
            inflow: entry.inflow?.toString() ?? "",
            outflow: entry.outflow?.toString() ?? "",
            balance: "",
            notes: entry.notes ?? "",
        };
    }
    function rowToEntry(row: LedgerRow) {
        return {
            id: row.id,
            date: row.date,
            description: row.description,
            category: row.category,
            inflow: row.inflow ? parseFloat(row.inflow) : null,
            outflow: row.outflow ? parseFloat(row.outflow) : null,
            notes: row.notes,
        };
    }

    // State for UI rows
    const [rows, setRows] = useState<LedgerRow[]>([]);

    // Sync Chrome history to ledger once on mount
    useEffect(() => {
        if (history.length > 0) syncHistoryToLedger(history);
    }, []);

    // Load month when currentMonth changes
    useEffect(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        loadMonth(year, month);
    }, [currentMonth, loadMonth]);

    // Convert loaded entries to rows
    useEffect(() => {
        isLoadingRows.current = true;
        setRows(entries.map(entryToRow));
    }, [entries]);

    // Debounced save when rows change
    useEffect(() => {
        if (isLoadingRows.current) {
            isLoadingRows.current = false;
            return;
        }
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            const entriesToSave = rows.map(rowToEntry);
            saveMonth(entriesToSave);
        }, 1000);
        return () => {
            if (saveTimeoutRef.current !== null) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [rows, saveMonth]);

    // Calendar Navigation Handlers
    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1));
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentMonth(new Date(parseInt(e.target.value), currentMonth.getMonth(), 1));
    };

    // Compute running balances for all rows
    const computedRows = React.useMemo(() => {
        let runningBalance: number | null = 0;
        return rows.map((row, idx) => {
            const inflow = row.inflow.trim() === "" ? null : parseFloat(row.inflow);
            const outflow = row.outflow.trim() === "" ? null : parseFloat(row.outflow);
            if (inflow === null && outflow === null) {
                // No input for this row, so no balance
                return { ...row, balance: "" };
            }
            // If first row, start from 0 if missing
            if (runningBalance === null) runningBalance = 0;
            runningBalance += (inflow || 0) - (outflow || 0);
            return { ...row, balance: runningBalance.toFixed(2) };
        });
    }, [rows]);

    const finalBalance = computedRows.length > 0 ? parseFloat(computedRows[computedRows.length - 1].balance) : 0;

    const handleCellClick = (id: string, field: keyof LedgerRow) => {
        setEditingCell({ id, field });
    };

    const handleChange = (id: string, field: keyof LedgerRow, value: string) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));

        if (field === 'category') {
            if (value.trim() === "") {
                setSuggestion("");
                return;
            }
            const match = CATEGORIES.find(c => c.toLowerCase().startsWith(value.toLowerCase()));
            if (match && match.toLowerCase() !== value.toLowerCase()) {
                setSuggestion(match);
            } else {
                setSuggestion("");
            }
        }
    };

    const handleBlur = (id: string, field: keyof LedgerRow) => {
        // Delay clearing the cell to allow a click on a new cell to take precedence
        setTimeout(() => {
            setEditingCell(current => {
                if (current?.id === id && current?.field === field) {
                    setSuggestion("");
                    return null; // Only clear if we haven't already moved to a new cell
                }
                return current;
            });
        }, 100);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string, field: keyof LedgerRow) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const rowIndex = rows.findIndex(r => r.id === id);
            if (rowIndex < rows.length - 1) {
                setEditingCell({ id: rows[rowIndex + 1].id, field });
            } else {
                setEditingCell(null);
            }
        } else if (e.key === "Tab") {
            if (field === 'category' && suggestion) {
                e.preventDefault();
                handleChange(id, field, suggestion);
                setSuggestion("");
                return;
            }
            e.preventDefault();
            const fields: (keyof LedgerRow)[] = ["date", "description", "category", "inflow", "outflow", "balance", "notes"];
            const fieldIndex = fields.indexOf(field);

            if (e.shiftKey) {
                // Shift+Tab: go left
                if (fieldIndex > 0) {
                    setEditingCell({ id, field: fields[fieldIndex - 1] });
                } else {
                    const rowIndex = rows.findIndex(r => r.id === id);
                    if (rowIndex > 0) {
                        setEditingCell({ id: rows[rowIndex - 1].id, field: fields[fields.length - 1] });
                    }
                }
            } else {
                // Tab: go right
                if (fieldIndex < fields.length - 1) {
                    setEditingCell({ id, field: fields[fieldIndex + 1] });
                } else {
                    const rowIndex = rows.findIndex(r => r.id === id);
                    if (rowIndex < rows.length - 1) {
                        setEditingCell({ id: rows[rowIndex + 1].id, field: fields[0] });
                    } else {
                        setEditingCell(null);
                    }
                }
            }
        }
    };

    const addRow = () => {
        const dateString = getDateString(currentMonth);
        setRows([...rows, {
            id: Date.now().toString() + Math.random().toString(),
            date: dateString, description: "", category: "", inflow: "", outflow: "", balance: "", notes: ""
        }]);
    };

    // Debug overlay
    const debugInfo = (
        <div style={{ position: "absolute", top: 8, right: 16, zIndex: 1000, background: "rgba(0,0,0,0.7)", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontFamily: "monospace" }}>
            <div>userId: {userId || "(none)"}</div>
            <div>loading: {String(loading)}</div>
            <div>error: {error ? error.toString() : "none"}</div>
            <div>rows: {rows.length}</div>
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white" style={{ position: "relative" }}>
            {debugInfo}
            {/* Header and Calendar Controls */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-6">
                    <h2 className="text-xl font-bold text-gray-900">Personal Accounting Ledger</h2>

                    {/* Calendar System */}
                    <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                        <button
                            onClick={handlePrevMonth}
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>

                        <div className="flex items-center gap-1">
                            <select
                                value={currentMonth.getMonth()}
                                onChange={handleMonthChange}
                                className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer appearance-none hover:bg-gray-200 p-1 rounded transition-colors"
                            >
                                {MONTHS.map((month, index) => (
                                    <option key={month} value={index}>{month}</option>
                                ))}
                            </select>

                            <select
                                value={currentMonth.getFullYear()}
                                onChange={handleYearChange}
                                className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer appearance-none hover:bg-gray-200 p-1 rounded transition-colors"
                            >
                                {YEARS.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleNextMonth}
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-gray-50">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <table className="w-full table-fixed text-left text-sm text-gray-600">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 font-medium w-[10%]">Date</th>
                                <th className="px-4 py-3 font-medium w-[30%]">Description</th>
                                <th className="px-4 py-3 font-medium w-[12%]">Category</th>
                                <th className="px-4 py-3 font-medium w-[12%]">Inflow</th>
                                <th className="px-4 py-3 font-medium w-[12%]">Outflow</th>
                                <th className="px-4 py-3 font-medium w-[12%]">Balance</th>
                                <th className="px-4 py-3 font-medium w-[12%]">Notes</th>
                                <th className="px-2 py-3 font-medium w-[4%]"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {computedRows.map((row) => (
                                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-0">
                                    {(["date", "description", "category", "inflow", "outflow", "balance", "notes"] as const).map(field => (
                                        <td
                                            key={field}
                                            className="px-4 py-3 cursor-text relative group truncate"
                                            onClick={() => field !== 'balance' && handleCellClick(row.id, field)}
                                        >
                                            {editingCell?.id === row.id && editingCell?.field === field && field !== 'balance' ? (
                                                <div className="relative w-full h-full flex items-center">
                                                    {field === 'category' && suggestion && (
                                                        <div className="absolute left-1.5 text-sm text-gray-400 pointer-events-none whitespace-pre">
                                                            <span className="opacity-0">{row[field]}</span>
                                                            {suggestion.substring(row[field].length)}
                                                        </div>
                                                    )}
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={row[field]}
                                                        onChange={(e) => handleChange(row.id, field, e.target.value)}
                                                        onBlur={() => handleBlur(row.id, field)}
                                                        onKeyDown={(e) => handleKeyDown(e, row.id, field)}
                                                        onFocus={(e) => {
                                                            if (field === 'date') {
                                                                const commaIndex = e.target.value.indexOf(',');
                                                                if (commaIndex !== -1) {
                                                                    // Position cursor right before the comma
                                                                    const pos = e.target.value.indexOf(',');
                                                                    e.target.setSelectionRange(pos, pos);
                                                                }
                                                            }
                                                        }}
                                                        className="w-full p-1 border border-blue-400 rounded outline-none text-sm bg-transparent shadow-sm z-10 relative"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="min-h-[20px] text-gray-700 truncate">
                                                    {field === 'date' && row.date.includes(' , ') && !/\d+/.test(row.date.split(',')[0]) ? (
                                                        <>
                                                            {row.date.split(' , ')[0]}
                                                            <span className="inline-block w-6 h-5 bg-gray-100 rounded mx-1 align-middle"></span>
                                                            , {row.date.split(' , ')[1]}
                                                        </>
                                                    ) : row[field] ? (
                                                        (field === 'inflow' || field === 'outflow' || field === 'balance') ? (
                                                            field === 'outflow' && row[field] ? `-$${parseFloat(row[field]).toFixed(2)}` : `$${parseFloat(row[field] || '0').toFixed(2)}`
                                                        ) : row[field]
                                                    ) : (
                                                        <span className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity select-none">--</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-2 py-3">
                                        <button
                                            onClick={() => {
                                                deleteEntry(row.id);
                                                setRows(rows.filter(r => r.id !== row.id));
                                                if (row.id.startsWith("log_")) {
                                                    onDeleteHistory?.(row.id.slice(4));
                                                }
                                            }}
                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1 transition-colors"
                                            title="Delete row"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t border-gray-200">
                            <tr>
                                <td colSpan={7} className="p-0">
                                    <button
                                        onClick={addRow}
                                        className="w-full py-3 text-sm font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Add Row
                                    </button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
