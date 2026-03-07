import React, { useState } from "react";

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

// Generate years from 2020 to 2030
const YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i);

export default function LedgerTable({ onClose }: { onClose: () => void }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [rows, setRows] = useState<LedgerRow[]>([
        { id: "initial-1", date: "", description: "", category: "", inflow: "", outflow: "", balance: "", notes: "" },
        { id: "initial-2", date: "", description: "", category: "", inflow: "", outflow: "", balance: "", notes: "" },
        { id: "initial-3", date: "", description: "", category: "", inflow: "", outflow: "", balance: "", notes: "" }
    ]);
    const [editingCell, setEditingCell] = useState<{ id: string, field: keyof LedgerRow } | null>(null);

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

    // Final balance based on inflows vs outflows
    const finalBalance = rows.reduce((acc, row) => {
        const inVal = parseFloat(row.inflow) || 0;
        const outVal = parseFloat(row.outflow) || 0;
        return acc + inVal - outVal;
    }, 0);

    const handleCellClick = (id: string, field: keyof LedgerRow) => {
        setEditingCell({ id, field });
    };

    const handleChange = (id: string, field: keyof LedgerRow, value: string) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleBlur = (id: string, field: keyof LedgerRow) => {
        // Delay clearing the cell to allow a click on a new cell to take precedence
        setTimeout(() => {
            setEditingCell(current => {
                if (current?.id === id && current?.field === field) {
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
        setRows([...rows, {
            id: Date.now().toString() + Math.random().toString(),
            date: "", description: "", category: "", inflow: "", outflow: "", balance: "", notes: ""
        }]);
    };

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col h-screen overflow-hidden">
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

                <div className="flex items-center gap-4">
                    <button
                        onClick={addRow}
                        className="px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors"
                    >
                        + Add Row
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors group"
                        title="Close Ledger"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-gray-50">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 font-medium">Date</th>
                                <th className="px-4 py-3 font-medium">Description</th>
                                <th className="px-4 py-3 font-medium">Category</th>
                                <th className="px-4 py-3 font-medium">Inflow</th>
                                <th className="px-4 py-3 font-medium">Outflow</th>
                                <th className="px-4 py-3 font-medium">Balance</th>
                                <th className="px-4 py-3 font-medium">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-0">
                                    {(["date", "description", "category", "inflow", "outflow", "balance", "notes"] as const).map(field => (
                                        <td
                                            key={field}
                                            className="px-4 py-3 cursor-text relative group min-w-[100px]"
                                            onClick={() => handleCellClick(row.id, field)}
                                        >
                                            {editingCell?.id === row.id && editingCell?.field === field ? (
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    value={row[field]}
                                                    onChange={(e) => handleChange(row.id, field, e.target.value)}
                                                    onBlur={() => handleBlur(row.id, field)}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, field)}
                                                    className="w-full p-1.5 -m-1.5 border border-blue-400 rounded outline-none text-sm bg-white shadow-sm z-10 relative"
                                                />
                                            ) : (
                                                <div className="min-h-[20px] text-gray-700 break-words">
                                                    {row[field] ? (
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
                    </table>
                </div>
            </div>
        </div>
    );
}
