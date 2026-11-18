import jwt from "jsonwebtoken";

//User AUTHENTICATION MIDDLEWARE
const authUser = async (req, res, next) => {
  try {
    const { token } = req.headers;
    if (!token) {
      return res.status(401).json({ success: false, message: "NOT AUTHORIZED LOGIN AGAIN" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // doctor / applicant / admin tokens are not patient tokens
    if (decoded.role) {
      return res.status(401).json({ success: false, message: "NOT AUTHORIZED LOGIN AGAIN" });
    }
    req.userId = decoded.id;
    next();
  } catch (error) {
    const expired = error?.name === "TokenExpiredError";
    res.status(401).json({ success: false, message: expired ? "Session expired" : "NOT AUTHORIZED LOGIN AGAIN" });
  }
};

export default authUser;
