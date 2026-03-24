import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch, Redirect } from "wouter";
import Login from "./pages/login";
import AdminLayout from "./components/AdminLayout";
import Home from "./pages/home";
import CustomerList from "./pages/customerList";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, onLogout }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
    setLoading(false);
    
    if (!loggedIn) {
      window.location.href = '/';
    }
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <AdminLayout onLogout={onLogout}>
      <Component />
    </AdminLayout>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
    setLoading(false);
  }, []);

  const handleLogin = () => {
    localStorage.setItem('isLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
    window.location.href = '/';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Switch>
          <Route path="/admin/orders">
            <ProtectedRoute component={Home} onLogout={handleLogout} />
          </Route>
          <Route path="/admin/customers">
            <ProtectedRoute component={CustomerList} onLogout={handleLogout} />
          </Route>
          <Route path="/">
            {isLoggedIn ? (
              <Redirect to="/admin/orders" />
            ) : (
              <Login onLogin={handleLogin} />
            )}
          </Route>
        </Switch>
      </Router>
    </QueryClientProvider>
  );
}

export default App;