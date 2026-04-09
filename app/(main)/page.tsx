"use client";

import * as React from "react";
import { format, subMonths, isSameMonth, parseISO, getDaysInMonth, getDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Spreadsheet, type Entries, type EntryValue } from "@/components/spreadsheet";
import { Modal } from "@/components/ui/modal";
import { TrendingDown, TrendingUp, DollarSign, LayoutPanelLeft, Download, Upload, PieChart, Target, Flame, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const INITIAL_CATEGORIES = ["식비", "교통", "쇼핑", "공과금", "문화생활"];

export default function Page() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [categories, setCategories] = React.useState<string[]>(INITIAL_CATEGORIES);
  const [entries, setEntries] = React.useState<Entries>({});
  const [mounted, setMounted] = React.useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(true);
  const [budget, setBudget] = React.useState<number>(0);
  const [budgetModalOpen, setBudgetModalOpen] = React.useState(false);
  const [budgetInput, setBudgetInput] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load from LocalStorage
  React.useEffect(() => {
    try {
      const savedEntries = localStorage.getItem("moneysheet-entries");
      const savedCategories = localStorage.getItem("moneysheet-categories");
      const savedDate = localStorage.getItem("moneysheet-current-date");

      if (savedEntries) setEntries(JSON.parse(savedEntries));
      if (savedCategories) setCategories(JSON.parse(savedCategories));
      if (savedDate) {
        const parsed = new Date(savedDate);
        if (!isNaN(parsed.getTime())) setCurrentDate(parsed);
      }
      const savedBudget = localStorage.getItem("moneysheet-budget");
      if (savedBudget) setBudget(Number(savedBudget));
    } catch {
      console.warn("저장된 데이터를 불러오는 데 실패했습니다. 기본값을 사용합니다.");
    }
    setMounted(true);
  }, []);

  // Save to LocalStorage
  React.useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("moneysheet-entries", JSON.stringify(entries));
    localStorage.setItem("moneysheet-categories", JSON.stringify(categories));
    localStorage.setItem("moneysheet-current-date", currentDate.toISOString());
    localStorage.setItem("moneysheet-budget", String(budget));
  }, [entries, categories, currentDate, mounted, budget]);

  const handleAddCategory = React.useCallback((name: string) => {
    setCategories((prev) => [...prev, name]);
  }, []);

  const handleRemoveCategory = React.useCallback((name: string) => {
    setCategories((prev) => prev.filter((c) => c !== name));
  }, []);

  const handleUpdateEntry = React.useCallback((dateStr: string, category: string, value: Partial<EntryValue>) => {
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
  }, []);

  // Statistics (memoized)
  const getMonthTotal = React.useCallback((date: Date) => {
    let total = 0;
    Object.entries(entries).forEach(([dateStr, dayEntries]) => {
      if (isSameMonth(parseISO(dateStr), date)) {
        Object.values(dayEntries).forEach((entry) => {
          total += entry.amount;
        });
      }
    });
    return total;
  }, [entries]);

  const thisMonthTotal = React.useMemo(() => getMonthTotal(currentDate), [getMonthTotal, currentDate]);
  const lastMonthTotal = React.useMemo(() => getMonthTotal(subMonths(currentDate, 1)), [getMonthTotal, currentDate]);
  const diff = thisMonthTotal - lastMonthTotal;
  const diffPercent = lastMonthTotal === 0 ? 0 : ((diff / lastMonthTotal) * 100).toFixed(1);

  const averageDailySpend = React.useMemo(() => {
    const today = new Date();
    const isCurrentMonth = isSameMonth(currentDate, today);
    const daysPassed = isCurrentMonth ? today.getDate() : getDaysInMonth(currentDate);
    return daysPassed > 0 ? (thisMonthTotal / daysPassed).toFixed(0) : "0";
  }, [currentDate, thisMonthTotal]);

  const recordedDays = React.useMemo(
    () => Object.keys(entries).filter(d => isSameMonth(parseISO(d), currentDate)).length,
    [entries, currentDate]
  );

  // Category totals for current month
  const categoryTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    categories.forEach(cat => { totals[cat] = 0; });
    Object.entries(entries).forEach(([dateStr, dayEntries]) => {
      if (isSameMonth(parseISO(dateStr), currentDate)) {
        categories.forEach(cat => {
          totals[cat] += dayEntries[cat]?.amount || 0;
        });
      }
    });
    return totals;
  }, [entries, categories, currentDate]);

  // Top spending category
  const topCategory = React.useMemo(() => {
    let max = 0;
    let name = "-";
    Object.entries(categoryTotals).forEach(([cat, total]) => {
      if (total > max) { max = total; name = cat; }
    });
    return { name, amount: max };
  }, [categoryTotals]);

  // Highest spending day
  const highestDay = React.useMemo(() => {
    let max = 0;
    let date = "";
    Object.entries(entries).forEach(([dateStr, dayEntries]) => {
      if (isSameMonth(parseISO(dateStr), currentDate)) {
        const dayTotal = Object.values(dayEntries).reduce((sum, e) => sum + e.amount, 0);
        if (dayTotal > max) { max = dayTotal; date = dateStr; }
      }
    });
    return { date, amount: max };
  }, [entries, currentDate]);

  // Day-of-week average spending
  const dayOfWeekStats = React.useMemo(() => {
    const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
    const sums = Array(7).fill(0);
    const counts = Array(7).fill(0);
    Object.entries(entries).forEach(([dateStr, dayEntries]) => {
      if (isSameMonth(parseISO(dateStr), currentDate)) {
        const dow = getDay(parseISO(dateStr));
        const total = Object.values(dayEntries).reduce((sum, e) => sum + e.amount, 0);
        if (total > 0) {
          sums[dow] += total;
          counts[dow] += 1;
        }
      }
    });
    return DAY_NAMES.map((name, i) => ({
      name,
      avg: counts[i] > 0 ? Math.round(sums[i] / counts[i]) : 0,
    }));
  }, [entries, currentDate]);

  const dayOfWeekMax = React.useMemo(() => Math.max(...dayOfWeekStats.map(d => d.avg), 1), [dayOfWeekStats]);

  // Budget helpers
  const budgetRemaining = budget > 0 ? budget - thisMonthTotal : 0;
  const budgetPercent = budget > 0 ? Math.min((thisMonthTotal / budget) * 100, 100) : 0;

  const handleBudgetSave = React.useCallback(() => {
    const val = parseInt(budgetInput.replace(/,/g, ""), 10);
    if (!isNaN(val) && val >= 0) setBudget(val);
    setBudgetModalOpen(false);
    setBudgetInput("");
  }, [budgetInput]);

  // Export data as JSON file
  const handleExport = React.useCallback(() => {
    const data = { entries, categories, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `moneysheet-backup-${format(new Date(), "yyyyMMdd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries, categories]);

  // Import data from JSON file
  const handleImport = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.entries) setEntries(data.entries);
        if (data.categories) setCategories(data.categories);
      } catch {
        alert("올바른 백업 파일이 아닙니다.");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be imported again
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6">
        <header className="flex flex-col gap-4 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-xl pr-6">
              <button
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="p-2 hover:bg-primary/10 hover:text-primary rounded-full transition-all duration-200 active:scale-90 cursor-pointer"
                title={isCalendarOpen ? "달력 숨기기" : "달력 보기"}
              >
                <LayoutPanelLeft className={cn("h-5 w-5 transition-transform", !isCalendarOpen && "text-muted-foreground")} />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">MoneySheet</h1>
                <p className="text-muted-foreground text-xs">엑셀 스타일로 관리하는 나만의 가계부</p>
              </div>
            </div>

            {/* Data management buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-md hover:bg-accent transition-colors cursor-pointer"
                title="데이터 내보내기"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">내보내기</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-md hover:bg-accent transition-colors cursor-pointer"
                title="데이터 가져오기"
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">가져오기</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </div>
          </div>

          {/* Top Stats Cards */}
          <div className="grid grid-cols-2 gap-3 md:flex md:gap-4">
            <div className="bg-card border rounded-lg p-3 md:p-4 shadow-sm md:min-w-[200px]">
              <div className="text-xs md:text-sm font-medium text-muted-foreground">이번 달 지출</div>
              <div className="text-lg md:text-2xl font-bold">{thisMonthTotal.toLocaleString()}원</div>
            </div>
            <div className="bg-card border rounded-lg p-3 md:p-4 shadow-sm md:min-w-[200px]">
              <div className="text-xs md:text-sm font-medium text-muted-foreground">지난 달 대비</div>
              <div className="flex items-center gap-1">
                <div className={cn("text-sm md:text-base", diff > 0 ? "text-red-500" : "text-green-500")}>
                  {diff > 0 ? <TrendingUp className="h-3.5 w-3.5 inline mr-0.5" /> : <TrendingDown className="h-3.5 w-3.5 inline mr-0.5" />}
                  {Math.abs(diff).toLocaleString()}원 ({Math.abs(Number(diffPercent))}%)
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                지난 달: {lastMonthTotal.toLocaleString()}원
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Left Sidebar: Calendar */}
          {isCalendarOpen && (
            <div className="lg:col-span-3 space-y-4 md:space-y-6">
              <Calendar
                currentDate={currentDate}
                onMonthChange={setCurrentDate}
                className="w-full"
              />

              {/* Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  요약
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">기록된 날짜</span>
                    <span className="font-medium">{recordedDays}일</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">일 평균 지출</span>
                    <span className="font-medium">{Number(averageDailySpend).toLocaleString()}원</span>
                  </div>
                </div>
              </div>

              {/* Budget */}
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-primary" />
                  월 예산
                </h3>
                {budget > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">예산</span>
                      <span className="font-medium">{budget.toLocaleString()}원</span>
                    </div>
                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          budgetPercent >= 100 ? "bg-red-500" : budgetPercent >= 80 ? "bg-yellow-500" : "bg-green-500"
                        )}
                        style={{ width: `${budgetPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{budgetPercent.toFixed(0)}% 사용</span>
                      <span className={cn(budgetRemaining < 0 ? "text-red-500 font-medium" : "")}>
                        {budgetRemaining >= 0 ? `${budgetRemaining.toLocaleString()}원 남음` : `${Math.abs(budgetRemaining).toLocaleString()}원 초과`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">예산을 설정하면 지출 현황을 추적할 수 있어요.</p>
                )}
                <button
                  onClick={() => {
                    setBudgetInput(budget > 0 ? String(budget) : "");
                    setBudgetModalOpen(true);
                  }}
                  className="mt-3 w-full text-xs px-3 py-1.5 border rounded-md hover:bg-accent transition-colors cursor-pointer"
                >
                  {budget > 0 ? "예산 수정" : "예산 설정"}
                </button>
              </div>

              {/* Category Breakdown */}
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                  <PieChart className="h-4 w-4 text-primary" />
                  카테고리별 지출
                </h3>
                {thisMonthTotal > 0 ? (
                  <div className="space-y-2">
                    {categories
                      .filter(cat => categoryTotals[cat] > 0)
                      .sort((a, b) => categoryTotals[b] - categoryTotals[a])
                      .map((cat) => {
                        const pct = (categoryTotals[cat] / thisMonthTotal) * 100;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{cat}</span>
                              <span className="text-muted-foreground">
                                {categoryTotals[cat].toLocaleString()}원 ({pct.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary/70 rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">이번 달 지출 데이터가 없습니다.</p>
                )}
              </div>

              {/* Top Stats */}
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                  <Flame className="h-4 w-4 text-orange-500" />
                  이번 달 하이라이트
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">최다 지출 카테고리</div>
                    <div className="font-medium">
                      {topCategory.amount > 0 ? `${topCategory.name} (${topCategory.amount.toLocaleString()}원)` : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">가장 많이 쓴 날</div>
                    <div className="font-medium">
                      {highestDay.amount > 0
                        ? `${format(parseISO(highestDay.date), "M/d (eee)", { locale: ko })} (${highestDay.amount.toLocaleString()}원)`
                        : "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Day of Week Pattern */}
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  요일별 평균 지출
                </h3>
                <div className="flex items-end justify-between gap-1 h-20">
                  {dayOfWeekStats.map((d) => (
                    <div key={d.name} className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className={cn(
                          "w-full rounded-t transition-all duration-300",
                          d.avg > 0 ? "bg-primary/60" : "bg-muted"
                        )}
                        style={{ height: `${d.avg > 0 ? Math.max((d.avg / dayOfWeekMax) * 56, 4) : 4}px` }}
                        title={`${d.name}: ${d.avg.toLocaleString()}원`}
                      />
                      <span className="text-[10px] text-muted-foreground">{d.name}</span>
                    </div>
                  ))}
                </div>
                {dayOfWeekStats.some(d => d.avg > 0) && (
                  <div className="mt-2 text-[10px] text-muted-foreground text-center">
                    가장 많이 쓰는 요일: {dayOfWeekStats.reduce((a, b) => a.avg > b.avg ? a : b).name}요일
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Content: Spreadsheet */}
          <div className={cn("transition-all duration-300", isCalendarOpen ? "lg:col-span-9" : "lg:col-span-12")}>
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

        {/* Budget Modal */}
        <Modal isOpen={budgetModalOpen} onClose={() => setBudgetModalOpen(false)} title="월 예산 설정">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">이번 달 예산 (원)</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                placeholder="예: 1,000,000"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={(e) => { if (e.key === "Enter") handleBudgetSave(); }}
                autoFocus
              />
              {budgetInput && (
                <p className="text-xs text-muted-foreground mt-1">
                  {Number(budgetInput).toLocaleString()}원
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBudgetModalOpen(false)}
                className="px-4 py-2 text-sm border rounded-md hover:bg-accent cursor-pointer"
              >
                취소
              </button>
              {budget > 0 && (
                <button
                  onClick={() => { setBudget(0); setBudgetModalOpen(false); }}
                  className="px-4 py-2 text-sm border border-destructive text-destructive rounded-md hover:bg-destructive/10 cursor-pointer"
                >
                  초기화
                </button>
              )}
              <button
                onClick={handleBudgetSave}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 cursor-pointer"
              >
                저장
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
