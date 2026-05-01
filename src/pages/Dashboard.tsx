import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/Footer";
import { Package, TrendingUp, FileText, Settings as SettingsIcon, RefreshCw } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/db";
import { settings as settingsTable, categories as categoriesTable, bills as billsTable, old_exchanges as oldExchangesTable } from "@/db/schema";
import { count, gte, lt, and } from "drizzle-orm";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfDay, endOfDay } from "date-fns";

const Dashboard = () => {
  // Fetch gold rate and silver rate from settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const result = await db.select().from(settingsTable).limit(1);
      if (result.length === 0) throw new Error("No settings found");
      return result[0];
    },
    refetchInterval: 3000,
  });

  // Fetch categories count
  const { data: categoriesCount, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories-count"],
    queryFn: async () => {
      const result = await db.select({ value: count() }).from(categoriesTable);
      return result[0].value || 0;
    },
    refetchInterval: 3000,
  });

  // Fetch bills count for today
  const { data: billsCount, isLoading: billsLoading } = useQuery({
    queryKey: ["bills-today-count"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await db
        .select({ value: count() })
        .from(billsTable)
        .where(
          and(
            gte(billsTable.bill_date, today),
            lt(billsTable.bill_date, tomorrow)
          )
        );
      
      return result[0].value || 0;
    },
    refetchInterval: 3000,
  });

  // Fetch old exchange bills count for today
  const { data: exchangeCount, isLoading: exchangeLoading } = useQuery({
    queryKey: ["old-exchanges-today-count"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await db
        .select({ value: count() })
        .from(oldExchangesTable)
        .where(
          and(
            gte(oldExchangesTable.created_at, today),
            lt(oldExchangesTable.created_at, tomorrow)
          )
        );
      
      return result[0].value || 0;
    },
    refetchInterval: 3000,
  });

  const quickStats = [
    { 
      label: "Gold Rate Today", 
      value: settingsLoading ? <Skeleton className="h-8 w-32" /> : `₹${settings?.gold_rate || 0}`, 
      subtitle: "per gram", 
      icon: TrendingUp 
    },
    { 
      label: "Silver Rate Today", 
      value: settingsLoading ? <Skeleton className="h-8 w-32" /> : `₹${(settings as any)?.silver_rate || 0}`, 
      subtitle: "per gram", 
      icon: TrendingUp 
    },
    { 
      label: "Categories", 
      value: categoriesLoading ? <Skeleton className="h-8 w-16" /> : categoriesCount, 
      subtitle: "active", 
      icon: Package 
    },
    { 
      label: "Bills Today", 
      value: billsLoading ? <Skeleton className="h-8 w-16" /> : billsCount, 
      subtitle: "generated", 
      icon: FileText 
    },
    { 
      label: "Old Exchange Today", 
      value: exchangeLoading ? <Skeleton className="h-8 w-16" /> : exchangeCount, 
      subtitle: "exchanges", 
      icon: RefreshCw 
    },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-accent/20 to-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-4 px-6 py-4">
              <SidebarTrigger className="hover:bg-accent hover:text-accent-foreground rounded-md transition-all duration-200" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-[#F59E0B] to-[#D97706] bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">Welcome back to your billing system</p>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 animate-fade-in">
              {quickStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card 
                    key={index} 
                    className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-scale-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardDescription className="text-xs uppercase tracking-wider">
                          {stat.label}
                        </CardDescription>
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                      <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <CardHeader>
                <CardTitle className="text-2xl">Quick Actions</CardTitle>
                <CardDescription>Manage your jewellery business efficiently</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link to="/billing" className="group">
                    <Card className="border-2 border-transparent hover:border-primary transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-lg">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:rotate-12">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-1">Create New Bill</h3>
                            <p className="text-sm text-muted-foreground">
                              Generate bills with automatic calculations based on current rates
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/settings" className="group">
                    <Card className="border-2 border-transparent hover:border-primary transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-lg">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:rotate-12">
                            <SettingsIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-1">Manage Settings</h3>
                            <p className="text-sm text-muted-foreground">
                              Update gold rates, seikuli, and manage product categories
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </main>
          
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
