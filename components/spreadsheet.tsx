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

  // Category modal states
  const [addCategoryModalOpen, setAddCategoryModalOpen] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [deleteCategoryModalOpen, setDeleteCategoryModalOpen] = React.useState(false);
  const [categoryToDelete, setCategoryToDelete] = React.useState("");

  const daysInMonth = getDaysInMonth(currentDate);
  const days = React.useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => setDate(currentDate, i + 1)),
    [currentDate, daysInMonth]
  );

  // Pre-calculate accumulated totals with useMemo instead of mutable variable during render
  const { dailyTotals, accumulatedTotals, categoryTotals, monthTotal } = React.useMemo(() => {
    const dailyTotals: Record<string, number> = {};
    const accumulatedTotals: Record<string, number> = {};
    const categoryTotals: Record<string, number> = {};
    let running = 0;

    for (const cat of categories) {
      categoryTotals[cat] = 0;
    }

    for (const day of days) {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayEntries = entries[dateStr] || {};
      const total = categories.reduce((sum, cat) => {
        const amount = dayEntries[cat]?.amount || 0;
        categoryTotals[cat] += amount;
        return sum + amount;
      }, 0);
      running += total;
      dailyTotals[dateStr] = total;
      accumulatedTotals[dateStr] = running;
    }

    return { dailyTotals, accumulatedTotals, categoryTotals, monthTotal: running };
  }, [days, entries, categories]);

  // Memo handling
  const handleCellDoubleClick = React.useCallback((dateStr: string, category: string) => {
    const entry = entries[dateStr]?.[category];
    setCurrentMemo(entry?.memo || "");
    setEditingCell({ dateStr, category });
    setMemoModalOpen(true);
  }, [entries]);

  const saveMemo = React.useCallback(() => {
    if (editingCell) {
      onUpdateEntry(editingCell.dateStr, editingCell.category, { memo: currentMemo });
    }
    setMemoModalOpen(false);
    setEditingCell(null);
  }, [editingCell, currentMemo, onUpdateEntry]);

  const handleAmountChange = React.useCallback((dateStr: string, category: string, amountStr: string) => {
    const cleanValue = amountStr.replace(/,/g, "");
    const amount = cleanValue === "" ? 0 : parseInt(cleanValue, 10);
    if (!isNaN(amount)) {
      onUpdateEntry(dateStr, category, { amount });
    }
  }, [onUpdateEntry]);

  // Category add via modal
  const handleAddCategorySubmit = React.useCallback(() => {
    const trimmed = newCategoryName.trim();
    if (trimmed && !categories.includes(trimmed)) {
      onAddCategory(trimmed);
    }
    setNewCategoryName("");
    setAddCategoryModalOpen(false);
  }, [newCategoryName, categories, onAddCategory]);

  // Category delete via modal
  const handleDeleteCategoryConfirm = React.useCallback(() => {
    if (categoryToDelete) {
      onRemoveCategory(categoryToDelete);
    }
    setCategoryToDelete("");
    setDeleteCategoryModalOpen(false);
  }, [categoryToDelete, onRemoveCategory]);

  const closeMemoModal = React.useCallback(() => setMemoModalOpen(false), []);
  const closeAddModal = React.useCallback(() => {
    setAddCategoryModalOpen(false);
    setNewCategoryName("");
  }, []);
  const closeDeleteModal = React.useCallback(() => {
    setDeleteCategoryModalOpen(false);
    setCategoryToDelete("");
  }, []);

  return (
    <div className="overflow-auto max-h-[75vh] border rounded-lg bg-card shadow-sm relative hide-scrollbar">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="text-muted-foreground">
          <tr>
            <th className="p-2 font-medium w-24 sticky left-0 top-0 bg-slate-100 dark:bg-slate-900 z-30 shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">날짜</th>
            {categories.map((cat) => (
              <th key={cat} className="p-2 border-l font-medium min-w-[80px] group relative sticky top-0 bg-slate-100 dark:bg-slate-900 z-20">
                <div className="flex items-center justify-between">
                  <span>{cat}</span>
                  <button
                    onClick={() => {
                      setCategoryToDelete(cat);
                      setDeleteCategoryModalOpen(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </th>
            ))}
            <th
              className="p-2 border-l font-medium w-10 sticky top-0 bg-slate-100 dark:bg-slate-900 z-20 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800"
              onClick={() => setAddCategoryModalOpen(true)}
            >
              <div className="flex items-center justify-center w-full h-full">
                <Plus className="h-4 w-4" />
              </div>
            </th>
            <th className="p-2 border-l font-medium w-24 sticky top-0 bg-slate-100 dark:bg-slate-900 z-20">일계</th>
            <th className="p-2 border-l font-medium w-24 sticky top-0 bg-slate-100 dark:bg-slate-900 z-20">누계</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayEntries = entries[dateStr] || {};
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
                <td className="p-2 border-t border-l text-right font-medium text-muted-foreground">{dailyTotals[dateStr].toLocaleString()}</td>
                <td className="p-2 border-t border-l text-right font-bold">{accumulatedTotals[dateStr].toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 dark:bg-slate-900 font-semibold">
            <td className="p-2 border-t sticky left-0 bg-slate-100 dark:bg-slate-900 z-10">합계</td>
            {categories.map((cat) => (
              <td key={`total-${cat}`} className="p-2 border-t border-l text-right">
                {categoryTotals[cat]?.toLocaleString() || 0}
              </td>
            ))}
            <td className="p-2 border-t border-l"></td>
            <td className="p-2 border-t border-l text-right">{monthTotal.toLocaleString()}</td>
            <td className="p-2 border-t border-l"></td>
          </tr>
        </tfoot>
      </table>

      {/* Memo Modal */}
      <Modal
        isOpen={memoModalOpen}
        onClose={closeMemoModal}
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
              onClick={closeMemoModal}
              className="px-4 py-2 text-sm border rounded-md hover:bg-accent cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={saveMemo}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 cursor-pointer"
            >
              저장
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        isOpen={addCategoryModalOpen}
        onClose={closeAddModal}
        title="새 카테고리 추가"
      >
        <div className="space-y-4">
          <input
            type="text"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            placeholder="카테고리 이름을 입력하세요"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddCategorySubmit();
            }}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={closeAddModal}
              className="px-4 py-2 text-sm border rounded-md hover:bg-accent cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={handleAddCategorySubmit}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 cursor-pointer"
            >
              추가
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Category Confirm Modal */}
      <Modal
        isOpen={deleteCategoryModalOpen}
        onClose={closeDeleteModal}
        title="카테고리 삭제"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            &ldquo;{categoryToDelete}&rdquo; 카테고리를 삭제하시겠습니까?<br />
            해당 카테고리의 모든 데이터가 유지되지만, 표에서 더 이상 표시되지 않습니다.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={closeDeleteModal}
              className="px-4 py-2 text-sm border rounded-md hover:bg-accent cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={handleDeleteCategoryConfirm}
              className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 cursor-pointer"
            >
              삭제
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
