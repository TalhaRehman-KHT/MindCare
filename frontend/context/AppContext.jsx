import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";

import axios from "axios";
export const AppContext = createContext();

// Registered once at module load so it applies to the very first requests too.
let onPatientSessionExpired = null;
axios.interceptors.response.use(
  (r) => r,
  (error) => {
    const sentToken = error?.config?.headers?.get?.("token") ?? error?.config?.headers?.token;
    if (error?.response?.status === 401 && sentToken && onPatientSessionExpired) onPatientSessionExpired();
    return Promise.reject(error);
  },
);

const AppContextProvider = (props) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [doctors, setDoctors] = useState([]);
  const [token, setToken] = useState(
    localStorage.getItem("token") ? localStorage.getItem("token") : ""
  );

  const [userData, setUserData] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  // true on first render when a token exists, so pages show a loader instead of an empty state
  const [profileLoading, setProfileLoading] = useState(
    () => !!localStorage.getItem("token")
  );

  const getDoctorsData = async () => {
    setDoctorsLoading(true);
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/list");
      if (data.success) {
        setDoctors(data.doctors);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const loadUserProfileData = async () => {
    setProfileLoading(true);
    try {
      const { data } = await axios.get(backendUrl + "/api/user/get-profile", {
        headers: { token },
      });
      if (data.success) {
        setUserData(data.userData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const value = {
    doctors,
    doctorsLoading,
    profileLoading,
    getDoctorsData,
    token,
    setToken,
    backendUrl,
    userData,
    setUserData,
    loadUserProfileData,
  };

  useEffect(() => {
    getDoctorsData();
  }, []);

  // expired / invalid patient session -> sign out (interceptor registered at module load)
  onPatientSessionExpired = () => {
    localStorage.removeItem("token");
    setToken("");
    toast.error("Session expired. Please sign in again.", { toastId: "session" });
  };

  useEffect(() => {
    if (token) {
      loadUserProfileData();
    } else {
      setUserData(false);
    }
  }, [token]);

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;
