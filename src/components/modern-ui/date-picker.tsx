import * as React from "react";
import { format, addMonths, subMonths, addYears, subYears, getYear, setYear, setMonth, startOfYear } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

type ViewMode = "days" | "months" | "years";

const DatePicker = ({ date, setDate, placeholder = "Pick a date", className }: DatePickerProps) => {
  const [view, setView] = React.useState<ViewMode>("days");
  const [currentMonth, setCurrentMonth] = React.useState<Date>(date || new Date());
  const [yearRangeStart, setYearRangeStart] = React.useState<number>(Math.floor(getYear(date || new Date()) / 12) * 12);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const years = Array.from({ length: 12 }, (_, i) => yearRangeStart + i);

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(currentMonth, monthIndex);
    setCurrentMonth(newDate);
    setView("days");
  };

  const handleYearSelect = (year: number) => {
    const newDate = setYear(currentMonth, year);
    setCurrentMonth(newDate);
    setView("months");
  };

  const nextYearRange = () => setYearRangeStart(yearRangeStart + 12);
  const prevYearRange = () => setYearRangeStart(yearRangeStart - 12);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <Popover onOpenChange={(open) => !open && setView("days")}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal h-11 px-4 rounded-xl border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-md group",
            !date && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-3 w-full">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <span className="flex-1 truncate font-medium">
              {date ? format(date, "MMMM do, yyyy") : <span>{placeholder}</span>}
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 border-none shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200" align="start">
        <div className="bg-background p-4">
          {/* Custom Header */}
          <div className="flex items-center justify-between mb-4 px-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg hover:bg-muted"
              onClick={() => {
                if (view === "days") prevMonth();
                else if (view === "months") setCurrentMonth(subYears(currentMonth, 1));
                else if (view === "years") prevYearRange();
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <button 
              className="text-sm font-bold hover:text-primary transition-colors cursor-pointer"
              onClick={() => {
                if (view === "days") setView("months");
                else if (view === "months") setView("years");
                else if (view === "years") setView("days");
              }}
            >
              {view === "days" && format(currentMonth, "MMMM yyyy")}
              {view === "months" && `${getYear(currentMonth)} - Months`}
              {view === "years" && `${yearRangeStart} - ${yearRangeStart + 11}`}
            </button>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg hover:bg-muted"
              onClick={() => {
                if (view === "days") nextMonth();
                else if (view === "months") setCurrentMonth(addYears(currentMonth, 1));
                else if (view === "years") nextYearRange();
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* View Content */}
          <div className="min-h-[240px]">
            {view === "days" && (
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  setDate(newDate);
                }}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                initialFocus
                className="p-0"
                classNames={{
                  months: "w-full",
                  month: "w-full space-y-4",
                  caption: "hidden",
                  head_row: "flex w-full justify-between mb-2",
                  head_cell: "text-muted-foreground w-9 font-medium text-[0.75rem] uppercase text-center",
                  row: "flex w-full justify-between mt-1",
                  cell: "h-9 w-9 text-center p-0 relative focus-within:relative focus-within:z-20",
                  day: cn(
                    "h-9 w-9 p-0 font-normal rounded-lg transition-all hover:bg-accent hover:text-accent-foreground flex items-center justify-center"
                  ),
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-lg shadow-primary/30",
                  day_today: "bg-accent text-accent-foreground font-bold",
                  day_outside: "text-muted-foreground/30 opacity-100",
                }}
              />
            )}

            {view === "months" && (
              <div className="grid grid-cols-3 gap-2">
                {months.map((month, index) => (
                  <Button
                    key={month}
                    variant="ghost"
                    className={cn(
                      "h-12 rounded-xl text-sm font-medium hover:bg-primary/10 hover:text-primary transition-all",
                      index === currentMonth.getMonth() && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-md"
                    )}
                    onClick={() => handleMonthSelect(index)}
                  >
                    {month}
                  </Button>
                ))}
              </div>
            )}

            {view === "years" && (
              <div className="grid grid-cols-3 gap-2">
                {years.map((year) => (
                  <Button
                    key={year}
                    variant="ghost"
                    className={cn(
                      "h-12 rounded-xl text-sm font-medium hover:bg-primary/10 hover:text-primary transition-all",
                      year === getYear(currentMonth) && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-md"
                    )}
                    onClick={() => handleYearSelect(year)}
                  >
                    {year}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;
