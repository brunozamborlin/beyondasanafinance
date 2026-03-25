import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MobileLayout } from "@/components/MobileLayout";
import { PasswordGate } from "@/components/PasswordGate";

import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard/index";
import PaymentForm from "@/pages/payments/form";
import Customers from "@/pages/customers/index";
import Manage from "@/pages/more/index";
import History from "@/pages/history/index";
import MonthDetail from "@/pages/history/[month]";
import Teachers from "@/pages/teachers/index";
import TeacherDetail from "@/pages/teachers/[id]";
import OtherCosts from "@/pages/other-costs/index";
import Settings from "@/pages/settings/index";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function Router() {
  return (
    <MobileLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/payments/new" component={PaymentForm} />
        <Route path="/customers" component={Customers} />
        <Route path="/manage" component={Manage} />
        <Route path="/history" component={History} />
        <Route path="/history/:month" component={MonthDetail} />
        <Route path="/teachers" component={Teachers} />
        <Route path="/teachers/:id" component={TeacherDetail} />
        <Route path="/other-costs" component={OtherCosts} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </MobileLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PasswordGate>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </PasswordGate>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
