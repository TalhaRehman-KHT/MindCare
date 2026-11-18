import { lazy, Suspense, useContext, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { AdminContext } from "./context/AdminContext.jsx";
import { DoctorContext } from "./context/DoctorContext.jsx";
import Navbar from "./components/Navbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import { PageLoader } from "./components/Spinner.jsx";
import useViewTransitions from "./hooks/useViewTransitions.js";

// Route-level code splitting: each page is its own chunk.
const Login = lazy(() => import("./pages/Login.jsx"));
const DoctorHandoff = lazy(() => import("./pages/DoctorHandoff.jsx"));
const DoctorResetPassword = lazy(() => import("./pages/DoctorResetPassword.jsx"));
const Dashboard = lazy(() => import("./pages/Admin/Dashboard.jsx"));
const AllAppointments = lazy(() => import("./pages/Admin/AllAppointments.jsx"));
const AddDoctor = lazy(() => import("./pages/Admin/AddDoctor.jsx"));
const DoctorsList = lazy(() => import("./pages/Admin/DoctorsList.jsx"));
const DoctorRequests = lazy(() => import("./pages/Admin/DoctorRequests.jsx"));
const DoctorDashboard = lazy(() => import("./pages/Doctor/DoctorDashboard.jsx"));
const DoctorAppointments = lazy(() => import("./pages/Doctor/DoctorAppointments.jsx"));
const DoctorProfile = lazy(() => import("./pages/Doctor/DoctorProfile.jsx"));
const DoctorPatients = lazy(() => import("./pages/Doctor/DoctorPatients.jsx"));
const DoctorSchedule = lazy(() => import("./pages/Doctor/DoctorSchedule.jsx"));

const ADMIN_PATHS = ["/admin-dashboard", "/appointment-page", "/add-doctor", "/doctors-list", "/doctor-requests"];
const DOCTOR_PATHS = ["/doctor-dashboard", "/doctor-appointments", "/doctor-patients", "/doctor-schedule", "/doctor-profile"];
const isDoctorPath = (p) => DOCTOR_PATHS.some((d) => p === d || p.startsWith(`${d}/`));

// Any 401 while signed in = session expired / account deactivated -> log out.
// Registered at module load so it is active before any page's first request.
const session = { onExpired: null };
axios.interceptors.response.use(
  (r) => r,
  (error) => {
    const signedIn = localStorage.getItem("aToken") || localStorage.getItem("dToken");
    if (error?.response?.status === 401 && signedIn && session.onExpired) session.onExpired(error.response.data?.message);
    return Promise.reject(error);
  },
);

const App = () => {
  const { aToken, setAToken } = useContext(AdminContext);
  const { dToken, setdToken } = useContext(DoctorContext);
  const [navOpen, setNavOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useViewTransitions();

  session.onExpired = (message) => {
    toast.error(message === "Account not active" ? "Your account is no longer active" : "Session expired. Please sign in again.", { toastId: "session" });
    localStorage.removeItem("aToken");
    localStorage.removeItem("dToken");
    setAToken("");
    setdToken("");
    navigate("/login", { replace: true });
  };

  const toasts = <ToastContainer position="top-right" newestOnTop autoClose={3500} />;
  const home = aToken ? "/admin-dashboard" : "/doctor-dashboard";

  if (!aToken && !dToken) {
    return (
      <>
        {toasts}
        <Suspense fallback={<PageLoader className="min-h-dvh" />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/doctor/login" element={<Login initialRole="Doctor" />} />
            <Route path="/auth/doctor" element={<DoctorHandoff />} />
            <Route path="/doctor/reset-password/:token" element={<DoctorResetPassword />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </>
    );
  }

  // logged in: auth pages forward to the right dashboard; wrong-role pages too
  const wrongRole = aToken ? isDoctorPath(pathname) : ADMIN_PATHS.includes(pathname);
  if (["/login", "/doctor/login", "/auth/doctor"].includes(pathname) || wrongRole) {
    return <Navigate to={home} replace />;
  }

  return (
    <div className="flex min-h-dvh">
      {toasts}
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onMenu={() => setNavOpen(true)} />
        <main className="w-full max-w-7xl flex-1 px-(--gutter) py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-8">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to={home} replace />} />
              {aToken ? (
                <>
                  <Route path="/admin-dashboard" element={<Dashboard />} />
                  <Route path="/appointment-page" element={<AllAppointments />} />
                  <Route path="/add-doctor" element={<AddDoctor />} />
                  <Route path="/doctors-list" element={<DoctorsList />} />
                  <Route path="/doctor-requests" element={<DoctorRequests />} />
                </>
              ) : (
                <>
                  <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
                  <Route path="/doctor-appointments" element={<DoctorAppointments />} />
                  <Route path="/doctor-patients" element={<DoctorPatients />} />
                  <Route path="/doctor-patients/:userId" element={<DoctorPatients />} />
                  <Route path="/doctor-schedule" element={<DoctorSchedule />} />
                  <Route path="/doctor-profile" element={<DoctorProfile />} />
                </>
              )}
              <Route path="*" element={<Navigate to={home} replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default App;
