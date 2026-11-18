import { lazy, Suspense, useLayoutEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import { PageLoader } from "./components/Spinner.jsx";
import useViewTransitions from "./hooks/useViewTransitions.js";

// Route-level code splitting: each page is its own chunk.
const Home = lazy(() => import("./pages/Home.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Doctors = lazy(() => import("./pages/Doctors.jsx"));
const MyAppointments = lazy(() => import("./pages/MyAppointments.jsx"));
const MyProfile = lazy(() => import("./pages/MyProfile.jsx"));
const Appointment = lazy(() => import("./pages/Appointment.jsx"));
const ChatBot = lazy(() => import("./pages/ChatBot.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const DoctorApplication = lazy(() => import("./pages/DoctorApplication.jsx"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail.jsx"));

const App = () => {
  const { pathname, hash } = useLocation();
  const hideLayout = pathname === "/chatbot";
  useViewTransitions();

  // start each new page at the top (hash links scroll to their target)
  useLayoutEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  const routes = (
    <Suspense fallback={<PageLoader className="min-h-[60vh]" />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctors/:speciality" element={<Doctors />} />
        <Route path="/my-appointments" element={<MyAppointments />} />
        <Route path="/appointment/:docId" element={<Appointment />} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/chatbot" element={<ChatBot />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/doctor/application" element={<DoctorApplication />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Routes>
    </Suspense>
  );

  return (
    <>
      <ToastContainer position="top-right" newestOnTop autoClose={3500} />
      {hideLayout ? (
        routes
      ) : (
        <div className="flex min-h-dvh flex-col">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-(--z-toast) focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-md"
          >
            Skip to content
          </a>
          <Navbar />
          <main id="main" className="flex-1">
            {routes}
          </main>
          <Footer />
        </div>
      )}
    </>
  );
};

export default App;
