import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useEffect } from "react";
import { useAuthStore } from "./store/authStore";
import { useThemeStore } from "./store/themeStore";
import { UserRole } from "@shared/schema";
import { getDashboardRoute } from "./lib/routes";

// Pages
import Login from "@/pages/auth/Login";
import SignUp from "@/pages/auth/SignUp";
import CustomerDashboard from "@/pages/dashboard/Customer";
import SupportDashboard from "@/pages/dashboard/Support";
import AdminDashboard from "@/pages/dashboard/Admin";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";

function RootRedirect() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return null; // Show nothing while loading
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Redirect to={getDashboardRoute(user.role)} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={SignUp} />

      <Route path="/dashboard/customer">
        <AuthGuard allowedRoles={[UserRole.CUSTOMER]}>
          <CustomerDashboard />
        </AuthGuard>
      </Route>

      <Route path="/dashboard/support">
        <AuthGuard allowedRoles={[UserRole.SUPPORT]}>
          <SupportDashboard />
        </AuthGuard>
      </Route>

      <Route path="/dashboard/admin">
        <AuthGuard allowedRoles={[UserRole.ADMIN]}>
          <AdminDashboard />
        </AuthGuard>
      </Route>

      <Route path="/profile">
        <AuthGuard>
          <Profile />
        </AuthGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { theme } = useThemeStore();
  const { setUser } = useAuthStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    // Fetch initial user state
    fetch('/api/me', { credentials: 'include' })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(user => setUser(user))
      .catch(() => setUser(null));
  }, [setUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;