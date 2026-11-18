import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import { PageLoader } from "../components/Spinner.jsx";
import { Avatar, Button, Card, Container, EmptyState, IconUpload, IconUser, Input, Select } from "../components/ui";

const Row = ({ label, children }) => (
  <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4">
    <dt className="text-small font-medium text-ink-subtle">{label}</dt>
    <dd className="min-w-0 break-words">{children}</dd>
  </div>
);

const MyProfile = () => {
  const {
    userData,
    setUserData,
    token,
    backendUrl,
    loadUserProfileData,
    profileLoading,
  } = useContext(AppContext);
  const [isEdit, setIsEdit] = useState(false);
  const [img, setImg] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const updateUserProfileData = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", userData.name);
      formData.append("email", userData.email);
      formData.append("phone", userData.phone);
      formData.append("address", JSON.stringify(userData.address));
      formData.append("gender", userData.gender);
      formData.append("dob", userData.dob);

      img && formData.append("img", img);

      const { data } = await axios.post(
        backendUrl + "/api/user/update-profile",
        formData,
        { headers: { token } }
      );
      if (data.success) {
        toast.success("Profile Updated Successfully");
        await loadUserProfileData();
        setIsEdit(false);
        setImg(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  // preview URL for a newly picked image (revoked when replaced/unmounted)
  const preview = useMemo(() => (img ? URL.createObjectURL(img) : null), [img]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  if (!userData) {
    return profileLoading ? (
      <PageLoader text="Loading profile..." className="min-h-[60vh]" />
    ) : (
      <EmptyState
        icon={<IconUser />}
        text={
          token
            ? "Could not load your profile. Please refresh the page."
            : "Please sign in to view your profile."
        }
        action={
          !token && (
            <Button as={Link} to="/login" size="sm">
              Sign in
            </Button>
          )
        }
      />
    );
  }

  const set = (field) => (e) => setUserData((prev) => ({ ...prev, [field]: e.target.value }));
  const setAddress = (line) => (e) =>
    setUserData((prev) => ({ ...prev, address: { ...prev.address, [line]: e.target.value } }));

  return (
    <Container className="max-w-3xl py-8 sm:py-12">
      <Card className="anim-fade-up overflow-hidden">
        <div className="h-24 bg-hero sm:h-28" aria-hidden="true" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            {isEdit ? (
              <label htmlFor="img" className="group relative cursor-pointer rounded-2xl ring-4 ring-surface">
                {preview ? (
                  <img src={preview} alt="" width="112" height="112" className="size-28 rounded-2xl object-cover" />
                ) : (
                  <Avatar src={userData.img} name={userData.name} size={112} square className="rounded-2xl!" />
                )}
                <span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/45 text-white opacity-90 transition-opacity group-hover:opacity-100">
                  <IconUpload size={28} />
                  <span className="sr-only">Upload a new photo</span>
                </span>
                <input
                  onChange={(e) => setImg(e.target.files[0])}
                  type="file"
                  accept="image/*"
                  id="img"
                  hidden
                />
              </label>
            ) : (
              <Avatar src={userData.img} name={userData.name} size={112} square className="rounded-2xl! ring-4 ring-surface" />
            )}
            <div className="flex gap-2">
              {isEdit ? (
                <Button onClick={updateUserProfileData} loading={isLoading}>
                  Save Info
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setIsEdit(true)}>
                  Edit
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5">
            {isEdit ? (
              <Input label="Full name" placeholder="Enter your name" value={userData?.name || ""} onChange={set("name")} className="max-w-sm" />
            ) : (
              <h1 className="text-h1 font-bold">{userData?.name || ""}</h1>
            )}
          </div>

          <section className="mt-8">
            <h2 className="eyebrow">Contact information</h2>
            <dl className="mt-2 divide-y divide-line">
              <Row label="Email">
                <span className="text-brand-strong">{userData?.email || "N/A"}</span>
              </Row>
              <Row label="Phone">
                {isEdit ? (
                  <Input aria-label="Phone" type="tel" placeholder="Enter your phone" value={userData?.phone || ""} onChange={set("phone")} className="max-w-xs" />
                ) : (
                  userData?.phone || "N/A"
                )}
              </Row>
              <Row label="Address">
                {isEdit ? (
                  <div className="grid max-w-md gap-2">
                    <Input aria-label="Address line 1" value={userData?.address?.line1 || ""} onChange={setAddress("line1")} />
                    <Input aria-label="Address line 2" value={userData?.address?.line2 || ""} onChange={setAddress("line2")} />
                  </div>
                ) : (
                  <span>
                    {userData?.address?.line1} <br /> {userData?.address?.line2}
                  </span>
                )}
              </Row>
            </dl>
          </section>

          <section className="mt-6">
            <h2 className="eyebrow">Basic information</h2>
            <dl className="mt-2 divide-y divide-line">
              <Row label="Gender">
                {isEdit ? (
                  <Select aria-label="Gender" value={userData?.gender || "Male"} onChange={set("gender")} className="max-w-[12rem]">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                ) : (
                  userData?.gender || "N/A"
                )}
              </Row>
              <Row label="Date of birth">
                {isEdit ? (
                  <Input
                    aria-label="Date of birth"
                    type="date"
                    value={userData?.dob ? userData.dob.split("T")[0] : ""}
                    onChange={set("dob")}
                    className="max-w-[12rem]"
                  />
                ) : userData?.dob ? (
                  new Date(userData.dob).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
                ) : (
                  "N/A"
                )}
              </Row>
            </dl>
          </section>
        </div>
      </Card>
    </Container>
  );
};

export default MyProfile;
