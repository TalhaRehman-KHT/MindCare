import { createContext, useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const AdminContext = createContext();
const backendUrl = import.meta.env.VITE_BACKEND_URL;
const errMsg = (error) => error?.response?.data?.message || error.message;

const AdminContextProvider = (props) => {
  const [aToken, setAToken] = useState(localStorage.getItem("aToken") || "");
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [dashData, setDashData] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [dashLoading, setDashLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  // id of the doctor/appointment a row action is running for (per-row loaders)
  const [processingId, setProcessingId] = useState(null);

  const headers = { aToken };

  // GET DOCTORS (status: approved | removed | all)
  const getAllDoctors = async (status = "approved") => {
    setDoctorsLoading(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/all-doctors`, { headers, params: { status } });
      if (data.success) setDoctors(data.doctors);
      else toast.error(data.message);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setDoctorsLoading(false);
    }
  };

  //CHANGE AVAILABILITY (unchanged behaviour)
  const changeAvailability = async (docId, status) => {
    setProcessingId(docId);
    try {
      const { data } = await axios.post(`${backendUrl}/api/admin/change-availability`, { docId }, { headers });
      if (data.success) {
        toast.success(data.message);
        await getAllDoctors(status);
      } else toast.error(data.message);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setProcessingId(null);
    }
  };

  const getAllAppointments = async () => {
    setAppointmentsLoading(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/appointments`, { headers });
      if (data.success) setAppointments(data.appointments);
      else toast.error(data.message);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    setProcessingId(appointmentId);
    try {
      const { data } = await axios.post(`${backendUrl}/api/admin/cancel-appointment`, { appointmentId }, { headers });
      if (data.success) {
        toast.success(data.message);
        await getAllAppointments();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setProcessingId(null);
    }
  };

  const getDashData = async () => {
    setDashLoading(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/dashboard`, { headers });
      if (data.success) {
        setDashData(data.dashData);
        setPendingCount(data.dashData.pendingRequests || 0);
      } else toast.error(data.message);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setDashLoading(false);
    }
  };

  // ---- doctor approval workflow ----
  const getDoctorRequests = async (status = "pending") => {
    const { data } = await axios.get(`${backendUrl}/api/admin/doctor-requests`, { headers, params: { status } });
    if (!data.success) throw new Error(data.message);
    setPendingCount(data.pendingCount || 0);
    return data.requests;
  };

  const refreshPendingCount = useCallback(async () => {
    if (!aToken) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/doctor-requests`, { headers: { aToken }, params: { status: "pending" } });
      if (data.success) setPendingCount(data.pendingCount || 0);
    } catch {
      /* badge is best-effort */
    }
  }, [aToken]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  /** Generic POST action with per-row loader; returns true on success. */
  const doctorAction = async (path, body) => {
    setProcessingId(body.docId);
    try {
      const { data } = await axios.post(`${backendUrl}/api/admin/${path}`, body, { headers });
      if (data.success) {
        toast.success(data.message);
        refreshPendingCount();
        return true;
      }
      toast.error(data.message);
      return false;
    } catch (error) {
      toast.error(errMsg(error));
      return false;
    } finally {
      setProcessingId(null);
    }
  };

  const approveDoctor = (docId) => doctorAction("approve-doctor", { docId });
  const rejectDoctor = (docId, reason) => doctorAction("reject-doctor", { docId, reason });
  const removeDoctor = (docId, reason) => doctorAction("remove-doctor", { docId, reason });
  const deleteDoctor = (docId) => doctorAction("delete-doctor", { docId });

  const value = {
    aToken,
    setAToken,
    backendUrl,
    doctors,
    getAllDoctors,
    changeAvailability,
    appointments,
    setAppointments,
    getAllAppointments,
    cancelAppointment,
    dashData,
    getDashData,
    deleteDoctor,
    removeDoctor,
    approveDoctor,
    rejectDoctor,
    getDoctorRequests,
    pendingCount,
    refreshPendingCount,
    doctorsLoading,
    appointmentsLoading,
    dashLoading,
    processingId,
  };
  return <AdminContext.Provider value={value}>{props.children}</AdminContext.Provider>;
};

export default AdminContextProvider;
