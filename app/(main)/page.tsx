"use client";

import * as React from "react";
import { addMonths, format, subMonths, isSameMonth, parseISO, getDaysInMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Spreadsheet, type Entries, type EntryValue } from "@/components/spreadsheet";
import { TrendingDown, TrendingUp, DollarSign } from "lucide-react";

const INITIAL_CATEGORIES = ["식비", "교통", "쇼핑", "공과금", "문화생활"];

export default function Page() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [categories, setCategories] = React.useState<string[]>(INITIAL_CATEGORIES);
  const [entries, setEntries] = React.useState<Entries>({});
  const [mounted, setMounted] = React.useState(false);

  // Load from LocalStorage
  React.useEffect(() => {
    const savedEntries = localStorage.getItem("moneysheet-entries");
    const savedCategories = localStorage.getItem("moneysheet-categories");
    const savedDate = localStorage.getItem("moneysheet-current-date");
    
    if (savedEntries) setEntries(JSON.parse(savedEntries));
    if (savedCategories) setCategories(JSON.parse(savedCategories));
    if (savedDate) setCurrentDate(new Date(savedDate));
    
    setMounted(true);
  }, []);

  // Save to LocalStorage
  React.useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("moneysheet-entries", JSON.stringify(entries));
    localStorage.setItem("moneysheet-categories", JSON.stringify(categories));
    localStorage.setItem("moneysheet-current-date", currentDate.toISOString());
  }, [entries, categories, currentDate, mounted]);

  const handleAddCategory = (name: string) => {
    setCategories((prev) => [...prev, name]);
  };

  const handleRemoveCategory = (name: string) => {
    setCategories((prev) => prev.filter((c) => c !== name));
  };

  const handleUpdateEntry = (dateStr: string, category: string, value: Partial<EntryValue>) => {
    setEntries((prev) => {
      const dayEntries = prev[dateStr] || {};
      const currentEntry = dayEntries[category] || { amount: 0, memo: "" };
      
      return {
        ...prev,
        [dateStr]: {
          ...dayEntries,
          [category]: { ...currentEntry, ...value },
        },
      };
    });
  };

  // Statistics
  const getMonthTotal = (date: Date) => {
    let total = 0;
    Object.entries(entries).forEach(([dateStr, dayEntries]) => {
      if (isSameMonth(parseISO(dateStr), date)) {
        Object.values(dayEntries).forEach((entry) => {
          total += entry.amount;
        });
      }
    });
    return total;
  };

  const thisMonthTotal = getMonthTotal(currentDate);
  const lastMonthTotal = getMonthTotal(subMonths(currentDate, 1));
  const diff = thisMonthTotal - lastMonthTotal;
  const diffPercent = lastMonthTotal === 0 ? 0 : ((diff / lastMonthTotal) * 100).toFixed(1);

  const getAverageDailySpend = () => {
    const today = new Date();
    const isCurrentMonth = isSameMonth(currentDate, today);
    const daysPassed = isCurrentMonth ? today.getDate() : getDaysInMonth(currentDate);
    return daysPassed > 0 ? (thisMonthTotal / daysPassed).toFixed(0) : "0";
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">MoneySheet</h1>
                <p className="text-muted-foreground">엑셀 스타일로 관리하는 나만의 가계부</p>
            </div>
            
            {/* Top Stats Card */}
            <div className="flex gap-4">
                <div className="bg-card border rounded-lg p-4 shadow-sm min-w-[200px]">
                    <div className="text-sm font-medium text-muted-foreground">이번 달 지출</div>
                    <div className="text-2xl font-bold">{thisMonthTotal.toLocaleString()}원</div>
                </div>
                <div className="bg-card border rounded-lg p-4 shadow-sm min-w-[200px]">
                    <div className="text-sm font-medium text-muted-foreground">지난 달 대비</div>
                    <div className="flex items-center gap-2">
                        <div className={diff > 0 ? "text-red-500" : "text-green-500"}>
                            {diff > 0 ? <TrendingUp className="h-4 w-4 inline mr-1" /> : <TrendingDown className="h-4 w-4 inline mr-1" />}
                            {Math.abs(diff).toLocaleString()}원 ({Math.abs(Number(diffPercent))}%)
                        </div>
                    </div>
                     <div className="text-xs text-muted-foreground mt-1">
                        지난 달: {lastMonthTotal.toLocaleString()}원
                    </div>
                </div>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar: Calendar */}
          <div className="lg:col-span-3 space-y-6">
            <Calendar
              currentDate={currentDate}
              onMonthChange={setCurrentDate}
              className="w-full"
            />
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    요약
                </h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">기록된 날짜</span>
                        <span className="font-medium">
                            {Object.keys(entries).filter(d => isSameMonth(parseISO(d), currentDate)).length}일
                        </span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">일 평균 지출</span>
                        <span className="font-medium">
                           {Number(getAverageDailySpend()).toLocaleString()}원
                        </span>
                    </div>
                </div>
            </div>
          </div>

          {/* Right Content: Spreadsheet */}
          <div className="lg:col-span-9">
            <Spreadsheet
              currentDate={currentDate}
              categories={categories}
              entries={entries}
              onAddCategory={handleAddCategory}
              onRemoveCategory={handleRemoveCategory}
              onUpdateEntry={handleUpdateEntry}
            />
          </div>
        </div>
      </div>
    </div>
  );
}