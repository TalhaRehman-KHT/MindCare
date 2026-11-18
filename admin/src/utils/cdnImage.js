// Adds Cloudinary delivery transforms (auto format, auto quality, width) to
// Cloudinary URLs. Non-Cloudinary URLs are returned unchanged.
const MARK = "/image/upload/";

export const cdnImage = (url, width) => {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com")) return url;
  const i = url.indexOf(MARK);
  if (i === -1) return url;
  const rest = url.slice(i + MARK.length);
  // skip if a transform segment already exists (e.g. "w_300,c_fill/...")
  if (/^[a-z]{1,3}_[^/]+\//.test(rest) && !/^v\d+\//.test(rest)) return url;
  const t = ["f_auto", "q_auto", width && `w_${width}`, width && "c_limit"]
    .filter(Boolean)
    .join(",");
  return `${url.slice(0, i + MARK.length)}${t}/${rest}`;
};

export const cdnSrcSet = (url, widths = [240, 480]) => {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com")) return undefined;
  return widths.map((w) => `${cdnImage(url, w)} ${w}w`).join(", ");
};
