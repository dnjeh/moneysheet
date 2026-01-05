"use client";

import * as React from "react";
import { format, getDaysInMonth, setDate, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Plus, Trash2, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "./ui/modal";

export type EntryValue = {
  amount: number;
  memo: string;
};

export type Entries = Record<string, Record<string, EntryValue>>;

interface SpreadsheetProps {
  currentDate: Date;
  categories: string[];
  entries: Entries;
  onAddCategory: (name: string) => void;
  onRemoveCategory: (name: string) => void;
  onUpdateEntry: (dateStr: string, category: string, value: Partial<EntryValue>) => void;
}

export function Spreadsheet({
  currentDate,
  categories,
  entries,
  onAddCategory,
  onRemoveCategory,
  onUpdateEntry,
}: SpreadsheetProps) {
  const [editingCell, setEditingCell] = React.useState<{ dateStr: string; category: string } | null>(null);
  const [memoModalOpen, setMemoModalOpen] = React.useState(false);
  const [currentMemo, setCurrentMemo] = React.useState("");

  const daysInMonth = getDaysInMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => setDate(currentDate, i + 1));

  // Memo handling
  const handleCellDoubleClick = (dateStr: string, category: string) => {
    const entry = entries[dateStr]?.[category];
    setCurrentMemo(entry?.memo || "");
    setEditingCell({ dateStr, category });
    setMemoModalOpen(true);
  };

  const saveMemo = () => {
    if (editingCell) {
      onUpdateEntry(editingCell.dateStr, editingCell.category, { memo: currentMemo });
    }
    setMemoModalOpen(false);
    setEditingCell(null);
  };

  const handleAmountChange = (dateStr: string, category: string, amountStr: string) => {
    const cleanValue = amountStr.replace(/,/g, "");
    const amount = cleanValue === "" ? 0 : parseInt(cleanValue, 10);
    if (!isNaN(amount)) {
        onUpdateEntry(dateStr, category, { amount });
    }
  };

  // Category handling
  const handleAddCategoryClick = () => {
    const name = prompt("새로운 카테고리 이름을 입력하세요:");
    if (name && !categories.includes(name)) {
      onAddCategory(name);
    }
  };

  let accumulatedTotal = 0;

  return (
    <div className="overflow-x-auto border rounded-lg bg-card shadow-sm">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="p-2 font-medium w-24 sticky left-0 bg-muted/50 z-10">날짜</th>
            {categories.map((cat) => (
              <th key={cat} className="p-2 border-l font-medium min-w-[80px] group relative">
                <div className="flex items-center justify-between">
                    <span>{cat}</span>
                    <button
                        onClick={() => {
                            if(confirm(`"${cat}" 카테고리를 삭제하시겠습니까?`)) onRemoveCategory(cat);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
              </th>
            ))}
            <th className="p-2 border-l font-medium w-10 flex items-center justify-center cursor-pointer hover:bg-muted" onClick={handleAddCategoryClick}>
                <Plus className="h-4 w-4" />
            </th>
            <th className="p-2 border-l font-medium w-24 bg-muted/50">일계</th>
            <th className="p-2 border-l font-medium w-24 bg-muted/50">누계</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayEntries = entries[dateStr] || {};
            
            // Calculate Daily Total
            const dailyTotal = categories.reduce((sum, cat) => {
                return sum + (dayEntries[cat]?.amount || 0);
            }, 0);

            accumulatedTotal += dailyTotal;

            const isToday = isSameDay(day, new Date());

            return (
              <tr key={dateStr} className={cn("hover:bg-muted/30 transition-colors", isToday && "bg-blue-50/50 dark:bg-blue-900/10")}>
                <td className={cn("p-2 border-t font-medium sticky left-0 bg-background z-10", isToday && "text-blue-600 dark:text-blue-400")}>
                    {format(day, "MM/dd (eee)", { locale: ko })}
                </td>
                {categories.map((cat) => {
                  const entry = dayEntries[cat];
                  const amount = entry?.amount || "";
                  const hasMemo = !!entry?.memo;

                  return (
                    <td 
                        key={`${dateStr}-${cat}`} 
                        className="p-0 border-l border-t relative group"
                        onDoubleClick={() => handleCellDoubleClick(dateStr, cat)}
                    >
                      <div className="relative w-full h-full">
                        <input
                            type="text"
                            className="w-full h-full p-2 bg-transparent focus:outline-none focus:bg-accent/50 text-right appearance-none"
                            placeholder="-"
                            value={amount === "" ? "" : Number(amount).toLocaleString()}
                            onChange={(e) => handleAmountChange(dateStr, cat, e.target.value)}
                        />
                        {hasMemo && (
                            <>
                                <div className="absolute top-1 right-1">
                                    <StickyNote className="h-3 w-3 text-yellow-500 fill-yellow-500/20" />
                                </div>
                                <div className="absolute z-20 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 text-white text-xs rounded shadow-lg pointer-events-none break-words">
                                    {entry.memo}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                                </div>
                            </>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="p-2 border-t border-l bg-muted/10"></td>
                <td className="p-2 border-t border-l text-right font-medium text-muted-foreground">{dailyTotal.toLocaleString()}</td>
                <td className="p-2 border-t border-l text-right font-bold">{accumulatedTotal.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Modal
        isOpen={memoModalOpen}
        onClose={() => setMemoModalOpen(false)}
        title={`메모: ${editingCell?.category} (${editingCell?.dateStr})`}
      >
        <div className="space-y-4">
            <textarea
                className="w-full min-h-[100px] p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                placeholder="내용을 입력하세요..."
                value={currentMemo}
                onChange={(e) => setCurrentMemo(e.target.value)}
            />
            <div className="flex justify-end gap-2">
                <button
                    onClick={() => setMemoModalOpen(false)}
                    className="px-4 py-2 text-sm border rounded-md hover:bg-accent"
                >
                    취소
                </button>
                <button
                    onClick={saveMemo}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                    저장
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
