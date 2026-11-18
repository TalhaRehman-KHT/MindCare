import { useContext, useEffect, useMemo, useState } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import axios from "axios";
import { toast } from "react-toastify";
import { PageLoader } from "../../components/Spinner.jsx";
import { Badge, Button, Card, EmptyState, Input } from "../../components/ui";
import { cdnImage, cdnSrcSet } from "../../utils/cdnImage.js";

const DoctorProfile = () => {
  const {
    profileData,
    setProfileData,
    getProfileData,
    dToken,
    backendUrl,
    profileLoading,
  } = useContext(DoctorContext);

  const [isEdit, setIsEdit] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [photo, setPhoto] = useState(null);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const updateProfile = async () => {
    try {
      setIsDisabled(true);
      const fd = new FormData();
      fd.append("address", JSON.stringify(profileData.address || {}));
      fd.append("fee", profileData.fee);
      fd.append("available", profileData.available);
      fd.append("phone", profileData.phone || "");
      if (photo) fd.append("image", photo);

      const { data } = await axios.post(backendUrl + "/api/doctor/update-profile", fd, { headers: { dToken } });
      if (data.success) {
        toast.success(data.message);
        setIsEdit(false);
        setPhoto(null);
        await getProfileData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    } finally {
      setIsDisabled(false);
    }
  };

  useEffect(() => {
    if (dToken) {
      getProfileData();
    }
  }, [dToken]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profileData) {
    return profileLoading ? (
      <PageLoader text="Loading profile..." />
    ) : (
      <EmptyState text="Could not load your profile." />
    );
  }

  const setAddress = (line) => (e) =>
    setProfileData((prev) => ({ ...prev, address: { ...prev.address, [line]: e.target.value } }));

  return (
    <div className="grid max-w-5xl gap-6 md:grid-cols-[16rem_1fr]">
      <div className="anim-fade-in relative overflow-hidden rounded-2xl bg-brand-soft md:self-start">
        {isEdit && (
          <label className="btn btn-light btn-sm absolute bottom-3 left-3 cursor-pointer shadow-md">
            Change photo
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > 5 * 1024 * 1024) return toast.error("Image must be 5 MB or smaller");
                setPhoto(f || null);
              }}
            />
          </label>
        )}
        <img
          src={preview || cdnImage(profileData.image, 512)}
          srcSet={preview ? undefined : cdnSrcSet(profileData.image, [256, 512])}
          sizes="(max-width: 768px) 100vw, 16rem"
          alt={profileData.name}
          width="512"
          height="512"
          decoding="async"
          className="aspect-square w-full object-cover object-top"
        />
      </div>

      <Card className="anim-fade-up p-6 sm:p-8">
        <h1 className="text-h1 font-bold">{profileData.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-ink-muted">
          <span>
            {profileData.degree} — {profileData.speciality}
          </span>
          <Badge>{profileData.experience}</Badge>
        </div>

        <h2 className="mt-6 text-small font-semibold uppercase tracking-wider text-ink-subtle">About</h2>
        <p className="mt-2 max-w-prose text-ink-muted">{profileData.about}</p>

        <dl className="mt-6 grid gap-4 border-t border-line pt-6">
          <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-center">
            <dt className="text-small font-medium text-ink-subtle">Email</dt>
            <dd className="break-all">{profileData.email}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-center">
            <dt className="text-small font-medium text-ink-subtle">Phone</dt>
            <dd>
              {isEdit ? (
                <Input
                  aria-label="Phone"
                  type="tel"
                  value={profileData.phone || ""}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="max-w-[16rem]"
                  placeholder="+92 300 0000000"
                />
              ) : (
                <span>{profileData.phone || "—"}</span>
              )}
            </dd>
          </div>
          {profileData.licenseNumber && (
            <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-center">
              <dt className="text-small font-medium text-ink-subtle">PMDC license</dt>
              <dd>{profileData.licenseNumber}</dd>
            </div>
          )}
          <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-center">
            <dt className="text-small font-medium text-ink-subtle">Appointment fee</dt>
            <dd>
              {isEdit ? (
                <Input
                  aria-label="Appointment fee"
                  type="number"
                  min="0"
                  value={profileData.fee}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, fee: e.target.value }))}
                  className="max-w-[10rem]"
                />
              ) : (
                <span className="font-semibold">{profileData.fee} rs</span>
              )}
            </dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-start">
            <dt className="text-small font-medium text-ink-subtle sm:pt-1">Address</dt>
            <dd>
              {isEdit ? (
                <div className="grid max-w-md gap-2">
                  <Input aria-label="Address line 1" type="text" value={profileData.address.line1} onChange={setAddress("line1")} />
                  <Input aria-label="Address line 2" type="text" value={profileData.address.line2} onChange={setAddress("line2")} />
                </div>
              ) : (
                <span>
                  {profileData.address.line1}
                  <br />
                  {profileData.address.line2}
                </span>
              )}
            </dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-center">
            <dt className="text-small font-medium text-ink-subtle">Availability</dt>
            <dd>
              <label className={`inline-flex min-h-11 items-center gap-2.5 ${isEdit ? "cursor-pointer" : "opacity-80"}`}>
                <input
                  onChange={() =>
                    isEdit &&
                    setProfileData((prev) => ({
                      ...prev,
                      available: !prev.available,
                    }))
                  }
                  checked={profileData.available}
                  type="checkbox"
                  className="size-5 accent-(--color-brand)"
                />
                Available
              </label>
            </dd>
          </div>
        </dl>

        <div className="mt-8">
          {isEdit ? (
            <Button onClick={updateProfile} loading={isDisabled}>
              Update
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setIsEdit(true)}>
              Edit
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DoctorProfile;
