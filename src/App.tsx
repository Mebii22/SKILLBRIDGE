import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import { fetchMeAsync } from "./redux/slices/userSlice";

import Loader from "./components/Loader";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import AdminLayout from "./components/AdminLayout";

import Home from "./pages/Home";
import About from "./pages/About";
import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/dashboard/Dashboard";
import Discover from "./pages/dashboard/Discover";
import Profile from "./pages/dashboard/Profile";
import Exchanges from "./pages/dashboard/Exchanges";
import ExchangeDetails from "./pages/dashboard/ExchangeDetails";
import Messages from "./pages/dashboard/Messages";
import Sessions from "./pages/dashboard/Sessions";
import SavedProfiles from "./pages/dashboard/SavedProfiles";
import Notifications from "./pages/dashboard/Notifications";
import MyProfile from "./pages/dashboard/MyProfile";
import Settings from "./pages/dashboard/Settings";
import ShareSkill from "./pages/dashboard/ShareSkill";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/Users";
import AdminSkillListings from "./pages/admin/SkillListings";
import AdminExchanges from "./pages/admin/AdminExchanges";
import AdminSessions from "./pages/admin/AdminSessions";
import AdminActivity from "./pages/admin/AdminActivity";
import AdminReports from "./pages/admin/Reports";

/* Public pages share the navbar + footer */
function PublicLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      store.dispatch(fetchMeAsync());
    }
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loader />;

  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* ---------- public ---------- */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<About />} />
            <Route path="/contact" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* ---------- protected user routes ---------- */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/exchanges" element={<Exchanges />} />
            <Route path="/exchanges/:id" element={<ExchangeDetails />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/saved" element={<SavedProfiles />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/share-skill" element={<ShareSkill />} />
            <Route path="/my-profile" element={<MyProfile />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* ---------- private admin routes (not linked anywhere public) ---------- */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/skills" element={<AdminSkillListings />} />
            <Route path="/admin/exchanges" element={<AdminExchanges />} />
            <Route path="/admin/sessions" element={<AdminSessions />} />
            <Route path="/admin/activity" element={<AdminActivity />} />
            <Route path="/admin/reports" element={<AdminReports />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}
