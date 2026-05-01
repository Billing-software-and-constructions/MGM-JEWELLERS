import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Filter, Eye, Printer } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfDay, endOfDay, setYear, getYear, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { db } from "@/db";
import { bills as billsTable, bill_items as billItemsTable, old_exchanges as oldExchangesTable } from "@/db/schema";
import { eq, and, or, gte, lte, desc, ilike, isNotNull, notInArray, notExists } from "drizzle-orm";
import toast from "react-hot-toast";
import { PrintableBill } from "@/components/PrintableBill";
import DatePicker from "@/components/modern-ui/date-picker";

// Helper function to get current date in IST
const getISTDate = () => {
  const istDateString = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(istDateString);
};

interface Bill {
  id: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  customer_gst_pan?: string;
  bill_date: Date | string;
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  gold_rate?: number;
  gst_percentage?: number;
  invoice_number?: string;
  discount_amount?: number;
  credited_amount?: number;
}

interface BillItem {
  id: string;
  category_name: string;
  subcategory_name?: string;
  weight: number;
  gold_amount: number;
  seikuli_amount: number;
  seikuli_rate: number;
}

interface OldExchange {
  id: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  customer_gst_pan?: string;
  created_at: Date | string;
  category_name: string;
  subcategory_name?: string;
  initial_weight: number;
  final_weight: number;
  exchange_value: number;
  metal_rate: number;
  exchange_type: string;
  bill_id?: string;
  invoice_number?: string;
  credited_amount?: number;
}

const BillHistory = () => {
  const todayIST = getISTDate();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(todayIST));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(todayIST));
  const [selectedYear, setSelectedYear] = useState<number>(getYear(todayIST));
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [appliedInvoiceNumber, setAppliedInvoiceNumber] = useState<string>("");
  const [appliedPhoneNumber, setAppliedPhoneNumber] = useState<string>("");
  const [pageBills, setPageBills] = useState(1);
  const [pageExchanges, setPageExchanges] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("bills");
  const [selectedExchange, setSelectedExchange] = useState<OldExchange | null>(null);
  const [isExchangeDialogOpen, setIsExchangeDialogOpen] = useState(false);
  const [exchangeBill, setExchangeBill] = useState<Bill | null>(null);
  const [exchangeBillItems, setExchangeBillItems] = useState<BillItem[]>([]);

  // Generate year options from 2020 to 2099
  const yearOptions = Array.from({ length: 80 }, (_, i) => 2020 + i);

  const { data: bills = [], isLoading: isLoadingBills, isFetching: isFetchingBills } = useQuery({
    queryKey: ['bills', startDate.toISOString(), endDate.toISOString(), appliedInvoiceNumber, appliedPhoneNumber, pageBills],
    queryFn: async () => {
      const startOfDayISO = startOfDay(startDate).toISOString();
      const endOfDayISO = endOfDay(endDate).toISOString();

      const conditions = [
        gte(billsTable.bill_date, new Date(startOfDayISO)),
        lte(billsTable.bill_date, new Date(endOfDayISO)),
        notExists(
          db.select()
            .from(oldExchangesTable)
            .where(eq(oldExchangesTable.bill_id, billsTable.id))
        )
      ];

      if (appliedInvoiceNumber.trim()) {
        conditions.push(ilike(billsTable.invoice_number, `%${appliedInvoiceNumber.trim()}%`));
      }

      if (appliedPhoneNumber.trim()) {
        conditions.push(ilike(billsTable.customer_phone, `%${appliedPhoneNumber.trim()}%`));
      }

      const data = await db
        .select()
        .from(billsTable)
        .where(and(...conditions))
        .orderBy(desc(billsTable.bill_date))
        .limit(ITEMS_PER_PAGE)
        .offset((pageBills - 1) * ITEMS_PER_PAGE);

      return data;
    },
    refetchInterval: 3000,
    placeholderData: keepPreviousData,
  });

  const { data: oldExchanges = [], isLoading: isLoadingExchanges, isFetching: isFetchingExchanges } = useQuery({
    queryKey: ['oldExchanges', startDate.toISOString(), endDate.toISOString(), appliedInvoiceNumber, appliedPhoneNumber, pageExchanges],
    queryFn: async () => {
      const startOfDayISO = startOfDay(startDate).toISOString();
      const endOfDayISO = endOfDay(endDate).toISOString();

      const conditions = [
        gte(oldExchangesTable.created_at, new Date(startOfDayISO)),
        lte(oldExchangesTable.created_at, new Date(endOfDayISO))
      ];

      if (appliedInvoiceNumber.trim()) {
        conditions.push(
          or(
            ilike(oldExchangesTable.invoice_number, `%${appliedInvoiceNumber.trim()}%`),
            ilike(billsTable.invoice_number, `%${appliedInvoiceNumber.trim()}%`)
          )
        );
      }

      if (appliedPhoneNumber.trim()) {
        conditions.push(ilike(oldExchangesTable.customer_phone, `%${appliedPhoneNumber.trim()}%`));
      }

      const data = await db
        .select({
          exchange: oldExchangesTable,
          invoice_number: billsTable.invoice_number
        })
        .from(oldExchangesTable)
        .leftJoin(billsTable, eq(oldExchangesTable.bill_id, billsTable.id))
        .where(and(...conditions))
        .orderBy(desc(oldExchangesTable.created_at))
        .limit(ITEMS_PER_PAGE)
        .offset((pageExchanges - 1) * ITEMS_PER_PAGE);

      let mappedData = data.map(({ exchange, invoice_number }) => ({
        ...exchange,
        invoice_number: exchange.invoice_number || invoice_number || null,
      }));

      return mappedData;
    },
    refetchInterval: 3000,
    placeholderData: keepPreviousData,
  });

  const handleApplyFilter = () => {
    setAppliedInvoiceNumber(invoiceNumber);
    setAppliedPhoneNumber(phoneNumber);
    setPageBills(1);
    setPageExchanges(1);
  };

  const handleDateChange = (date: Date | undefined, isStartDate: boolean) => {
    if (date) {
      if (isStartDate) {
        setStartDate(date);
      } else {
        setEndDate(date);
      }
      setPageBills(1);
      setPageExchanges(1);
      // Automatically update year dropdown when date changes
      const yearFromDate = getYear(date);
      if (yearFromDate !== selectedYear) {
        setSelectedYear(yearFromDate);
      }
    }
  };

  const handleResetFilter = () => {
    const today = getISTDate();
    setStartDate(startOfMonth(today));
    setEndDate(endOfMonth(today));
    setSelectedYear(getYear(today));
    setInvoiceNumber("");
    setPhoneNumber("");
    setAppliedInvoiceNumber("");
    setAppliedPhoneNumber("");
  };

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year);
    setSelectedYear(newYear);
    // Update dates to the selected year
    const newStartDate = setYear(startDate, newYear);
    const newEndDate = setYear(endDate, newYear);
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const handleViewDetails = async (bill: Bill) => {
    setSelectedBill(bill);
    setIsDialogOpen(true);
    setLoadingDetails(true);

    try {
      const data = await db
        .select()
        .from(billItemsTable)
        .where(eq(billItemsTable.bill_id, bill.id));

      setBillItems(data as any[]);
    } catch (error) {
      console.error('Error loading bill details:', error);
      toast.error("Failed to load bill details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewExchangeDetails = async (exchange: OldExchange) => {
    setSelectedExchange(exchange);
    setIsExchangeDialogOpen(true);

    // Reset previous bill data
    setExchangeBill(null);
    setExchangeBillItems([]);

    // If exchange type is "ornaments" and has a bill_id, fetch associated bill and items
    if (exchange.exchange_type === "ornaments" && exchange.bill_id) {
      try {
        // Fetch associated bill
        const billData = await db
          .select()
          .from(billsTable)
          .where(eq(billsTable.id, exchange.bill_id))
          .limit(1);

        if (billData.length > 0) {
          setExchangeBill(billData[0] as unknown as Bill);

          // Fetch associated bill items
          const itemsData = await db
            .select()
            .from(billItemsTable)
            .where(eq(billItemsTable.bill_id, exchange.bill_id));

          setExchangeBillItems(itemsData as any[]);
        }
      } catch (error) {
        console.error('Error loading associated bill data:', error);
      }
    }
  };

  const handlePrintBill = () => {
    window.print();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="text-2xl font-bold">Bill History</h1>
                    <p className="text-sm text-muted-foreground">View past billing records</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 bg-gradient-to-br from-background via-accent/20 to-background">
            <div className="container mx-auto px-6 py-8 max-w-6xl">
              {/* Date Filter Section */}
              <Card className="border-0 shadow-lg mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Date Filters
                  </CardTitle>
                  <CardDescription>
                    Filter bills by date range
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-end gap-4">
                      {/* Invoice Number */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-sm font-medium mb-2 block">Invoice Number</label>
                        <Input
                          placeholder="Search by invoice number..."
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleApplyFilter()}
                          className="w-full"
                        />
                      </div>

                      {/* Phone Number */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-sm font-medium mb-2 block">Phone Number</label>
                        <Input
                          placeholder="Search by phone number..."
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleApplyFilter()}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-4">
                      {/* Start Date */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-sm font-medium mb-2 block">Start Date</label>
                        <DatePicker 
                          date={startDate}
                          setDate={(date) => handleDateChange(date, true)}
                          placeholder="Pick start date"
                        />
                      </div>

                      {/* End Date */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-sm font-medium mb-2 block">End Date</label>
                        <DatePicker 
                          date={endDate}
                          setDate={(date) => handleDateChange(date, false)}
                          placeholder="Pick end date"
                        />
                      </div>

                      {/* Year Selector */}
                      <div className="flex-1 min-w-[150px]">
                        <label className="text-sm font-medium mb-2 block">Year</label>
                        <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            {yearOptions.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Filter Buttons */}
                      <div className="flex gap-2">
                        <Button
                          onClick={handleApplyFilter}
                          className="gap-2"
                        >
                          <Filter className="h-4 w-4" />
                          Apply Filter
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleResetFilter}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs for Bills and Old Exchanges */}
              <Card className="border-0 shadow-lg">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <CardHeader>
                    <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                      <TabsTrigger value="bills">Regular Bills</TabsTrigger>
                      <TabsTrigger value="old-exchanges">Old Exchange Bills</TabsTrigger>
                    </TabsList>
                  </CardHeader>

                  <CardContent>
                    <TabsContent value="bills" className="mt-0">
                      <div className="mb-4">
                        <CardDescription>
                          {isLoadingBills && bills.length === 0 ? "Loading..." : `${bills.length} bill(s) found for ${format(startDate, "PP")}`}
                          {!(isLoadingBills && bills.length === 0) && startDate.getTime() !== endDate.getTime() && ` - ${format(endDate, "PP")}`}
                        </CardDescription>
                      </div>
                      {isLoadingBills && bills.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">Loading bills...</p>
                        </div>
                      ) : bills.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground mb-4">No bills found for the selected date range</p>
                          <Link to="/billing">
                            <Button>Create New Bill</Button>
                          </Link>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {bills.map((bill) => (
                              <div
                                key={bill.id}
                                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors gap-4"
                              >
                                <div className="flex-1">
                                  <div className="font-semibold text-lg">
                                    {bill.customer_name}
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {format(new Date(bill.bill_date), "PPP")} • {format(new Date(bill.bill_date), "p")}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-muted-foreground">Grand Total</div>
                                  <div className="text-2xl font-bold text-primary">
                                    ₹{Number(bill.grand_total).toLocaleString()}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(bill)}
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </Button>
                              </div>
                            ))}
                          </div>
                          
                          {/* Pagination Controls for Bills */}
                          {bills.length > 0 && (
                            <div className="flex justify-between items-center mt-6">
                              <Button 
                                variant="outline" 
                                disabled={pageBills === 1} 
                                onClick={() => setPageBills(p => p - 1)}
                              >
                                Previous
                              </Button>
                              <span className="text-sm text-muted-foreground">Page {pageBills}</span>
                              <Button 
                                variant="outline" 
                                disabled={bills.length < ITEMS_PER_PAGE} 
                                onClick={() => setPageBills(p => p + 1)}
                              >
                                Next
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="old-exchanges" className="mt-0">
                      <div className="mb-4">
                        <CardDescription>
                          {isLoadingExchanges && oldExchanges.length === 0 ? "Loading..." : `${oldExchanges.length} exchange(s) found for ${format(startDate, "PP")}`}
                          {!(isLoadingExchanges && oldExchanges.length === 0) && startDate.getTime() !== endDate.getTime() && ` - ${format(endDate, "PP")}`}
                        </CardDescription>
                      </div>
                      {isLoadingExchanges && oldExchanges.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">Loading old exchanges...</p>
                        </div>
                      ) : oldExchanges.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground mb-4">No old exchanges found for the selected date range</p>
                          <Link to="/old-gold-exchange">
                            <Button>Create New Exchange</Button>
                          </Link>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {oldExchanges.map((exchange) => (
                              <div
                                key={exchange.id}
                                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors gap-4"
                              >
                                <div className="flex-1">
                                  <div className="font-semibold text-lg">
                                    {exchange.customer_name}
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {format(new Date(exchange.created_at), "PPP")} • {format(new Date(exchange.created_at), "p")}
                                  </div>
                                  <div className="text-sm mt-2">
                                    <span className="font-medium">{exchange.category_name}</span>
                                    {exchange.subcategory_name && <span className="text-muted-foreground"> - {exchange.subcategory_name}</span>}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-muted-foreground mb-1">
                                    {exchange.initial_weight}g → {exchange.final_weight}g
                                  </div>
                                  <div className="text-xs text-muted-foreground mb-1">
                                    {exchange.exchange_type} • ₹{exchange.metal_rate}/g
                                  </div>
                                  <div className="text-2xl font-bold text-primary">
                                    ₹{Number(exchange.exchange_value).toLocaleString()}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewExchangeDetails(exchange)}
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </Button>
                              </div>
                            ))}
                          </div>

                          {/* Pagination Controls for Old Exchanges */}
                          {oldExchanges.length > 0 && (
                            <div className="flex justify-between items-center mt-6">
                              <Button 
                                variant="outline" 
                                disabled={pageExchanges === 1} 
                                onClick={() => setPageExchanges(p => p - 1)}
                              >
                                Previous
                              </Button>
                              <span className="text-sm text-muted-foreground">Page {pageExchanges}</span>
                              <Button 
                                variant="outline" 
                                disabled={oldExchanges.length < ITEMS_PER_PAGE} 
                                onClick={() => setPageExchanges(p => p + 1)}
                              >
                                Next
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>
          </main>

          <Footer />
        </div>
      </div>

      {/* Bill Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Bill Details</span>
              <Button onClick={handlePrintBill} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Bill
              </Button>
            </DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading details...</p>
            </div>
          ) : selectedBill ? (
            <div className="space-y-4">
              {/* Bill Header Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Bill Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    {selectedBill.invoice_number && (
                      <div>
                        <p className="text-sm text-muted-foreground">Invoice Number</p>
                        <p className="font-semibold">{selectedBill.invoice_number}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Customer Name</p>
                      <p className="font-semibold">{selectedBill.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bill Date</p>
                      <p className="font-medium">{format(new Date(selectedBill.bill_date), "PPP")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium">{format(new Date(selectedBill.bill_date), "p")}</p>
                    </div>
                    {selectedBill.gold_rate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Gold Rate</p>
                        <p className="font-medium">₹{selectedBill.gold_rate}/g</p>
                      </div>
                    )}
                    {selectedBill.gst_percentage && (
                      <div>
                        <p className="text-sm text-muted-foreground">GST Rate</p>
                        <p className="font-medium">{selectedBill.gst_percentage}%</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bill Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Bill Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {billItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No items found</p>
                  ) : (
                    <div className="space-y-4">
                      {billItems.map((item, index) => (
                        <div key={item.id} className="border-b last:border-0 pb-4 last:pb-0">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold">Item #{index + 1}</p>
                              <p className="text-sm text-muted-foreground">{item.category_name}</p>
                            </div>
                            <p className="text-lg font-bold">₹{(item.gold_amount + item.seikuli_amount).toLocaleString()}</p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Weight</p>
                              <p className="font-medium">{item.weight}g</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Gold Amount</p>
                              <p className="font-medium">₹{item.gold_amount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Seikuli Rate</p>
                              <p className="font-medium">₹{item.seikuli_rate}/g</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Seikuli Amount</p>
                              <p className="font-medium">₹{item.seikuli_amount.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bill Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Bill Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-lg">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₹{Number(selectedBill.subtotal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-muted-foreground">GST ({selectedBill.gst_percentage}%)</span>
                    <span className="font-semibold">₹{Number(selectedBill.gst_amount).toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-xl">
                      <span className="font-bold">Grand Total</span>
                      <span className="font-bold text-primary">₹{Number(selectedBill.grand_total).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Printable Bill - Hidden, only shows when printing */}
      {selectedBill && billItems.length > 0 && (
        <PrintableBill
          customerName={selectedBill.customer_name}
          customerPhone={selectedBill.customer_phone || ""}
          customerAddress={selectedBill.customer_address || ""}
          customerGstPan={selectedBill.customer_gst_pan || ""}
          billItems={billItems.map(item => ({
            categoryName: item.category_name,
            subcategoryName: item.subcategory_name || "",
            weight: item.weight,
            goldAmount: item.gold_amount,
            seikuliAmount: item.seikuli_amount,
            seikuliRate: item.seikuli_rate,
            gstApplicable: (selectedBill.gst_amount || 0) > 0,
          }))}
          oldOrnaments={[]}
          goldRate={selectedBill.gold_rate || 0}
          gstPercentage={selectedBill.gst_percentage || 0}
          subtotal={selectedBill.subtotal}
          gstAmount={selectedBill.gst_amount}
          discountAmount={selectedBill.discount_amount || 0}
          grandTotal={selectedBill.grand_total}
          exchangeType="buy-ornaments"
          invoiceNumber={selectedBill.invoice_number}
          billDate={selectedBill.bill_date}
          creditedAmount={selectedBill.credited_amount || 0}
          remainingAmount={selectedBill.grand_total - (selectedBill.credited_amount || 0)}
        />
      )}

      {/* Old Exchange Details Dialog */}
      <Dialog open={isExchangeDialogOpen} onOpenChange={setIsExchangeDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Exchange Details</span>
              <Button onClick={handlePrintBill} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Bill
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedExchange ? (
            <div className="space-y-4">
              {/* Exchange Header Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Exchange Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    {selectedExchange.invoice_number && (
                      <div>
                        <p className="text-sm text-muted-foreground">Invoice Number</p>
                        <p className="font-semibold">{selectedExchange.invoice_number}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Customer Name</p>
                      <p className="font-semibold">{selectedExchange.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Exchange Date</p>
                      <p className="font-medium">{format(new Date(selectedExchange.created_at), "PPP")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium">{format(new Date(selectedExchange.created_at), "p")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Exchange Type</p>
                      <p className="font-medium capitalize">{selectedExchange.exchange_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Metal Rate</p>
                      <p className="font-medium">₹{selectedExchange.metal_rate}/g</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Exchange Item Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Item Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Category</p>
                    <p className="font-semibold text-lg">{selectedExchange.category_name}</p>
                    {selectedExchange.subcategory_name && (
                      <>
                        <p className="text-sm text-muted-foreground mt-2 mb-1">Subcategory</p>
                        <p className="font-medium">{selectedExchange.subcategory_name}</p>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Initial Weight</p>
                      <p className="text-2xl font-bold">{selectedExchange.initial_weight}g</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Final Weight (After Deduction)</p>
                      <p className="text-2xl font-bold text-primary">{selectedExchange.final_weight}g</p>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Calculation</p>
                    <p className="font-mono text-lg">
                      {selectedExchange.final_weight}g × ₹{selectedExchange.metal_rate}/g = ₹{Number(selectedExchange.exchange_value).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Exchange Value Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Exchange Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                    <span className="text-xl font-bold">Cash Amount</span>
                    <span className="text-3xl font-bold text-primary">₹{Number(selectedExchange.exchange_value).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Printable Exchange Bill - Hidden, only shows when printing */}
      {selectedExchange && (
        <PrintableBill
          customerName={selectedExchange.customer_name}
          customerPhone={selectedExchange.customer_phone || ""}
          customerAddress={selectedExchange.customer_address || ""}
          customerGstPan={selectedExchange.customer_gst_pan || ""}
          billItems={
            selectedExchange.exchange_type === "ornaments" && exchangeBillItems.length > 0
              ? exchangeBillItems.map(item => ({
                // For new records: category_name has actual category, subcategory_name has subcategory
                // For old records: category_name had subcategory, subcategory_name was null
                categoryName: item.subcategory_name ? item.category_name : (selectedExchange.category_name || item.category_name),
                subcategoryName: item.subcategory_name || item.category_name,
                weight: item.weight,
                goldAmount: item.gold_amount,
                seikuliAmount: item.seikuli_amount,
                seikuliRate: item.seikuli_rate,
                gstApplicable: (exchangeBill?.gst_amount || 0) > 0,
              }))
              : []
          }
          oldOrnaments={[{
            categoryName: selectedExchange.category_name,
            subcategoryName: selectedExchange.subcategory_name || "",
            initialWeight: selectedExchange.initial_weight,
            finalWeight: selectedExchange.final_weight,
            ratePerGram: selectedExchange.metal_rate,
            value: selectedExchange.exchange_value,
          }]}
          goldRate={exchangeBill?.gold_rate || selectedExchange.metal_rate}
          gstPercentage={exchangeBill?.gst_percentage || 0}
          subtotal={exchangeBill?.subtotal || 0}
          gstAmount={exchangeBill?.gst_amount || 0}
          discountAmount={exchangeBill?.discount_amount || 0}
          grandTotal={
            selectedExchange.exchange_type === "ornaments" && exchangeBill
              ? exchangeBill.grand_total
              : selectedExchange.exchange_type === "cash"
                ? 0
                : selectedExchange.exchange_value
          }
          exchangeType={selectedExchange.exchange_type === "ornaments" ? "buy-ornaments" : selectedExchange.exchange_type}
          invoiceNumber={selectedExchange.invoice_number}
          billDate={selectedExchange.created_at}
          creditedAmount={
            selectedExchange.exchange_type === "ornaments" && exchangeBill
              ? (exchangeBill.credited_amount || 0)
              : selectedExchange.exchange_type === "cash"
                ? (selectedExchange.credited_amount || selectedExchange.exchange_value)
                : (selectedExchange.credited_amount || 0)
          }
          remainingAmount={
            selectedExchange.exchange_type === "ornaments" && exchangeBill
              ? (exchangeBill.grand_total - (exchangeBill.credited_amount || 0))
              : selectedExchange.exchange_type === "cash"
                ? (selectedExchange.exchange_value - (selectedExchange.credited_amount || selectedExchange.exchange_value))
                : 0
          }
        />
      )}
    </SidebarProvider>
  );
};

export default BillHistory;
