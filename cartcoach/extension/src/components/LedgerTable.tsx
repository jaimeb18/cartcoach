import React, { useState, useEffect, useRef } from "react";
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
    const isSaved = item.action === "saved_later";
    return {
        id: item.id,
        date,
        description: item.product.productName,
        category: isSaved ? "Savings" : item.product.category,
        inflow: "",
        outflow: (isPurchase || isSaved) ? item.product.price.toString() : "",
        balance: "",
        notes: isSaved ? "transferred to savings" : item.product.site,
    };
}

// Generate years from 2020 to 2030
const YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i);

const CATEGORIES = [
    "Grocery", "Income", "Transportation", "Utilities", "Housing", "Discretionary Spending", "Savings"
];

export default function LedgerTable({ history = [] }: { history?: SpendingHistory[] }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [editingCell, setEditingCell] = useState<{ id: string, field: keyof LedgerRow } | null>(null);
    const [suggestion, setSuggestion] = useState<string>("");
    const prevDateRef = useRef(currentDate);

    const getDateString = (date: Date) => `${MONTHS[date.getMonth()]} , ${date.getFullYear()}`;

    const [rows, setRows] = useState<LedgerRow[]>(() => [
        ...history.filter(h => h.action !== "skipped").map(historyToRow),
        ...Array.from({ length: 5 }).map((_, i) => ({
            id: `empty-${i}`, date: getDateString(new Date()), description: "", category: "", inflow: "", outflow: "", balance: "", notes: ""
        })),
    ]);

    // Sync dates when calendar month/year changes
    useEffect(() => {
        const prevDate = prevDateRef.current;
        if (prevDate.getMonth() !== currentDate.getMonth() || prevDate.getFullYear() !== currentDate.getFullYear()) {
            const oldMonth = MONTHS[prevDate.getMonth()];
            const oldYear = prevDate.getFullYear().toString();
            const newMonth = MONTHS[currentDate.getMonth()];
            const newYear = currentDate.getFullYear().toString();

            setRows(prevRows => prevRows.map(row => {
                let newDate = row.date;
                if (newDate.includes(oldMonth)) {
                    newDate = newDate.replace(oldMonth, newMonth);
                }
                if (newDate.includes(oldYear)) {
                    newDate = newDate.replace(oldYear, newYear);
                }
                return { ...row, date: newDate };
            }));
        }
        prevDateRef.current = currentDate;
    }, [currentDate]);

    // Calendar Navigation Handlers
    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentDate(new Date(currentDate.getFullYear(), parseInt(e.target.value), 1));
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentDate(new Date(parseInt(e.target.value), currentDate.getMonth(), 1));
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
        const dateString = getDateString(currentDate);
        setRows([...rows, {
            id: Date.now().toString() + Math.random().toString(),
            date: dateString, description: "", category: "", inflow: "", outflow: "", balance: "", notes: ""
        }]);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
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
                                value={currentDate.getMonth()}
                                onChange={handleMonthChange}
                                className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer appearance-none hover:bg-gray-200 p-1 rounded transition-colors"
                            >
                                {MONTHS.map((month, index) => (
                                    <option key={month} value={index}>{month}</option>
                                ))}
                            </select>

                            <select
                                value={currentDate.getFullYear()}
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
                                                            `$${parseFloat(row[field] || '0').toFixed(2)}`
                                                        ) : row[field]
                                                    ) : (
                                                        <span className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity select-none">--</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    ))}
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
