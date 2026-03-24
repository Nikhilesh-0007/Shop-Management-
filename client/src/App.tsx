import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import Login from "./pages/login";
import AdminLayout from "./components/AdminLayout";
import Home from "./pages/home";
import CustomerList from "./pages/customerList";

const queryClient = new QueryClient();

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');

  const handleLogin = () => {
    localStorage.setItem('isLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return (
      <QueryClientProvider client={queryClient}>
        <Login onLogin={handleLogin} />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AdminLayout onLogout={handleLogout}>
          <Switch>
            <Route path="/admin/orders" component={Home} />
            <Route path="/admin/customers" component={CustomerList} />
            <Route>{() => { window.location.replace('/admin/orders'); return null; }}</Route>
          </Switch>
        </AdminLayout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;