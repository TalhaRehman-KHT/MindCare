import { useState, useEffect, useContext, useMemo } from "react";
import { AdminContext } from "../../context/AdminContext";
import { toast } from "react-toastify";
import axios from "axios";
import PageHeader from "../../components/PageHeader.jsx";
import { Button, Card, IconUpload, Input, Select, Textarea, PasswordInput } from "../../components/ui";

const EXPERIENCE = ["1 Year", ...Array.from({ length: 9 }, (_, i) => `${i + 2} Years`), "10+ Years"];
// must match SPECIALITIES in frontend/src/config.js
const SPECIALITIES = ["Forensic", "Clinical", "Child", "Addiction", "OCD"];

const AddDoctor = () => {
  const [docImg, setDocImg] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [experience, setExperience] = useState("1 Year");
  const [fee, setFee] = useState("");
  const [about, setAbout] = useState("");
  const [Speciality, setSpeciality] = useState("Forensic");
  const [degree, setDegree] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [isDisabled, setIsDisabled] = useState(false);

  const { backendUrl, aToken } = useContext(AdminContext);

  // live password validation
  useEffect(() => {
    if (password || confirmPassword) {
      if (password.length < 8) {
        setPasswordError("Password must be at least 8 characters long.");
      } else if (password !== confirmPassword) {
        setPasswordError("Passwords do not match.");
      } else {
        setPasswordError("");
      }
    } else {
      setPasswordError("");
    }
  }, [password, confirmPassword]);

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (passwordError) {
      return toast.error("Please ensure passwords match and are valid.");
    }

    try {
      if (!docImg) {
        return toast.error("IMAGE NOT UPLOADED");
      }
      const formData = new FormData();

      formData.append("image", docImg);
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("experience", experience);
      formData.append("fee", Number(fee));
      formData.append("about", about);
      formData.append("speciality", Speciality);
      formData.append("degree", degree);
      formData.append(
        "address",
        JSON.stringify({ line1: address1, line2: address2 })
      );

      setIsDisabled(true); // prevents double submit

      const { data } = await axios.post(
        backendUrl + "/api/admin/add-doctor",
        formData,
        { headers: { aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        setDocImg(false);
        setName("");
        setPassword("");
        setConfirmPassword("");
        setAbout("");
        setEmail("");
        setAddress1("");
        setAddress2("");
        setDegree("");
        setFee("");
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

  const preview = useMemo(() => (docImg ? URL.createObjectURL(docImg) : null), [docImg]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  return (
    <form onSubmit={onSubmitHandler} className="w-full max-w-4xl">
      <PageHeader title="Add Doctor" subtitle="Create a profile patients can book." />

      <Card className="anim-fade-up p-5 sm:p-8">
        <label htmlFor="doc-img" className="group mb-8 flex w-fit cursor-pointer items-center gap-4">
          <span className="grid size-20 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-line-strong bg-surface-2 text-ink-subtle transition-colors group-hover:border-brand group-hover:text-brand">
            {preview ? (
              <img src={preview} alt="" width="80" height="80" className="size-full object-cover" />
            ) : (
              <IconUpload size={26} />
            )}
          </span>
          <span className="text-small text-ink-muted">
            <span className="block font-semibold text-ink">Upload doctor image</span>
            PNG or JPG, square works best
          </span>
          <input accept="image/*" type="file" id="doc-img" hidden onChange={(e) => setDocImg(e.target.files[0])} />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Doctor Name" onChange={(e) => setName(e.target.value)} value={name} type="text" placeholder="Name" required />
          <Input label="Doctor Email" onChange={(e) => setEmail(e.target.value)} value={email} type="email" placeholder="Email" autoComplete="off" required />
          <PasswordInput
            label="Doctor Password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            required
          />
          <PasswordInput
            label="Confirm Password"
            onChange={(e) => setConfirmPassword(e.target.value)}
            value={confirmPassword}
            placeholder="Re-enter password"
            autoComplete="new-password"
            error={passwordError || undefined}
            required
          />
          <Select label="Experience" onChange={(e) => setExperience(e.target.value)} value={experience}>
            {EXPERIENCE.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
          <Input label="Doctor Fee" onChange={(e) => setFee(e.target.value)} value={fee} type="number" min="0" placeholder="Fee" required />
          <Select label="Speciality" onChange={(e) => setSpeciality(e.target.value)} value={Speciality}>
            {SPECIALITIES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
          <Input label="Education" onChange={(e) => setDegree(e.target.value)} value={degree} type="text" placeholder="Education" required />
          <Input label="Address line 1" onChange={(e) => setAddress1(e.target.value)} value={address1} type="text" placeholder="Address 1" required />
          <Input label="Address line 2" onChange={(e) => setAddress2(e.target.value)} value={address2} type="text" placeholder="Address 2" required />
          <Textarea
            label="About Doctor"
            onChange={(e) => setAbout(e.target.value)}
            value={about}
            placeholder="Write about the doctor"
            rows={5}
            required
            className="md:col-span-2"
          />
        </div>

        <Button type="submit" size="lg" loading={isDisabled} disabled={!!passwordError} className="mt-8">
          Add Doctor
        </Button>
      </Card>
    </form>
  );
};

export default AddDoctor;
