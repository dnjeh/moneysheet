"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CalendarProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  className?: string;
}

export function Calendar({ currentDate, onMonthChange, className }: CalendarProps) {
  const handlePrevMonth = () => onMonthChange(subMonths(currentDate, 1));
  const handleNextMonth = () => onMonthChange(addMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Simple padding for start of week (assuming Sunday start)
  const startDayIndex = monthStart.getDay(); 
  const emptyDays = Array(startDayIndex).fill(null);

  return (
    <div className={cn("p-4 border rounded-lg shadow-sm bg-card text-card-foreground", className)}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth} className="p-1 hover:bg-accent rounded-md">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-semibold">
          {format(currentDate, "yyyy년 MMMM", { locale: ko })}
        </div>
        <button onClick={handleNextMonth} className="p-1 hover:bg-accent rounded-md">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
        <div>일</div>
        <div>월</div>
        <div>화</div>
        <div>수</div>
        <div>목</div>
        <div>금</div>
        <div>토</div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-sm">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "p-2 rounded-md text-center",
              isSameDay(day, new Date()) ? "bg-primary text-primary-foreground font-bold" : "",
            )}
          >
            {format(day, "d")}
          </div>
        ))}
      </div>
    </div>
  );
}
