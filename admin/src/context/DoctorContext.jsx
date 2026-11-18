import { createContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const DoctorContext = createContext();
const backendUrl = import.meta.env.VITE_BACKEND_URL;
const errMsg = (error) => error?.response?.data?.message || error.message;

const DoctorContextProvider = (props) => {
  const [dToken, setdToken] = useState(localStorage.getItem("dToken") || "");
  const [appointments, setAppointments] = useState([]);
  const [apptMeta, setApptMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [dashData, setDashData] = useState(false);
  const [profileData, setProfileData] = useState(false);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [dashLoading, setDashLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  // id of the appointment a row action is running for (per-row loaders)
  const [processingId, setProcessingId] = useState(null);
  const headers = { dToken };

  // range: today | upcoming | past ; status: booked | completed | cancelled | no_show | ""
  const getAppointments = async ({ range = "today", status = "", page = 1 } = {}) => {
    setAppointmentsLoading(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/doctor/appointments`, { headers, params: { range, status: status || undefined, page } });
      if (data.success) {
        setAppointments(data.appointments);
        setApptMeta({ page: data.page, totalPages: data.totalPages, total: data.total });
      } else toast.error(data.message);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setAppointmentsLoading(false);
    }
  };

  /** POST an appointment action with a row loader, then run `after` (refresh). */
  const act = async (path, appointmentId, after, extra = {}) => {
    setProcessingId(appointmentId);
    try {
      const { data } = await axios.post(`${backendUrl}/api/doctor/${path}`, { appointmentId, ...extra }, { headers });
      if (data.success) {
        toast.success(data.message);
        if (after) await after();
        return true;
      }
      toast.error(data.message);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setProcessingId(null);
    }
    return false;
  };
  const completeAppointment = (id, after) => act("complete-appointment", id, after);
  const cancelAppointment = (id, after, reason) => act("cancel-appointment", id, after, reason ? { reason } : {});
  const noShowAppointment = (id, after) => act("no-show-appointment", id, after);

  const getDashData = async () => {
    setDashLoading(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/doctor/dashboard`, { headers });
      if (data.success) setDashData(data.dashData);
      else toast.error(data.message);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setDashLoading(false);
    }
  };

  const getProfileData = async () => {
    setProfileLoading(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/doctor/profile`, { headers });
      if (data.success) setProfileData(data.profileData);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setProfileLoading(false);
    }
  };

  // Thin GET/PUT/POST/DELETE helper for pages that keep their own state (patients, schedule).
  const api = async (method, path, body, params) => {
    const { data } = await axios({ method, url: `${backendUrl}/api/doctor/${path}`, data: body, params, headers });
    return data;
  };

  const value = {
    dToken,
    setdToken,
    backendUrl,
    appointments,
    setAppointments,
    apptMeta,
    getAppointments,
    completeAppointment,
    cancelAppointment,
    noShowAppointment,
    getDashData,
    dashData,
    setDashData,
    profileData,
    setProfileData,
    getProfileData,
    appointmentsLoading,
    dashLoading,
    profileLoading,
    processingId,
    api,
    errMsg,
  };

  return <DoctorContext.Provider value={value}>{props.children}</DoctorContext.Provider>;
};

export default DoctorContextProvider;
