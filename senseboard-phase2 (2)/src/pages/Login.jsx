import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser, registerUser } from "../api/authapi";
import logo from "../components/assets/logo.png";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ fullName:"", email:"", contactNo:"", username:"", password:"", confirmPassword:"" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => { setForm({...form,[e.target.name]:e.target.value}); setErrors({...errors,[e.target.name]:""}); setServerError(""); };

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = "Username is required";
    if (!form.password) errs.password = "Password is required";
    if (mode === "register") {
      if (!form.fullName.trim()) errs.fullName = "Full name is required";
      if (!form.email.trim()) errs.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email";
      if (form.password.length < 6) errs.password = "Min 6 characters";
      if (!form.confirmPassword) errs.confirmPassword = "Please confirm your password";
      else if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await loginUser({ username: form.username, password: form.password });
        if (res?.accessToken && res?.refreshToken) {
          localStorage.setItem("sb_access_token", res.accessToken);
          localStorage.setItem("sb_refresh_token", res.refreshToken);
          localStorage.setItem("sb_userId", res.userId);
          localStorage.setItem("sb_username", res.username);
          // ✅ Save role from DB response
          const dbRole = (res.userRole || res.role || "user").toLowerCase();
          localStorage.setItem("sb_role", dbRole);
          login(res.accessToken, res.username);
          setServerError("Login Successful!");
          setTimeout(() => navigate("/sensors"), 1000);
          console.log("login response:", res);
        }
      } else {
        const res = await registerUser({
          username:  form.username,
          email:     form.email,
          fullName:  form.fullName,
          contactNo: form.contactNo,
          password:  form.password,
          userRole: "User",
        });
        if (res?.message) {
          setServerError(res.message);
          setMode("login");
          setForm({ fullName:"", email:"", contactNo:"", username: form.username, password:"", confirmPassword:"" });
        }
      }
    } catch (err) {
      setServerError(err.response?.data?.message || err.response?.data?.title || "Invalid credentials. Try again.");
    } finally { setLoading(false); }
  };

  const isSuccess = serverError.toLowerCase().includes("success") || serverError.toLowerCase().includes("login") || serverError.toLowerCase().includes("register");

  return (
    <div className="sb-login-wrapper d-flex align-items-center justify-content-center">
      <div className="sb-login-card card shadow-lg border-0">
        <div className="card-body p-3 p-md-4">

          <div className="text-center mb-3">
            <h2 className="sb-brand-text mb-1" style={{fontSize:"2rem",letterSpacing:"4px"}}>P.U.L.S.E</h2>
            <p className="text-muted small mb-0">{mode === "login" ? "Sign in to SenseBoard" : "Register to get started"}</p>
          </div>

          {/* ── Tabs ── */}
          <div className="d-flex mb-3" style={{borderBottom:"2px solid var(--sb-border)"}}>
            {["login","register"].map(m => (
              <button key={m} type="button"
                onClick={() => { setMode(m); setErrors({}); setServerError(""); }}
                style={{
                  flex:1, background:"none", border:"none", padding:"8px",
                  fontWeight:600, fontSize:"0.88rem", cursor:"pointer",
                  color: mode===m ? "var(--sb-accent)" : "var(--sb-muted)",
                  borderBottom: mode===m ? "2px solid var(--sb-accent)" : "2px solid transparent",
                  marginBottom:"-2px", transition:"color 0.2s"
                }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {serverError && (
            <div className="alert py-2 small mb-3" style={{
              backgroundColor: isSuccess ? "#d1e7dd" : "#f8d7da",
              color: isSuccess ? "#0a3622" : "#842029", border:"none", borderRadius:"8px"
            }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* Role toggle — register only */}
            {mode === "register" && (
              <>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label sb-form-label">Full Name <span className="text-danger">*</span></label>
                    <input type="text" name="fullName" className={`form-control sb-input ${errors.fullName?"is-invalid":""}`} placeholder="Full name" value={form.fullName} onChange={handleChange} />
                    {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
                  </div>
                  <div className="col-6">
                    <label className="form-label sb-form-label">Username <span className="text-danger">*</span></label>
                    <input type="text" name="username" className={`form-control sb-input ${errors.username?"is-invalid":""}`} placeholder="Username" value={form.username} onChange={handleChange} />
                    {errors.username && <div className="invalid-feedback">{errors.username}</div>}
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label sb-form-label">Email <span className="text-danger">*</span></label>
                  <input type="email" name="email" className={`form-control sb-input ${errors.email?"is-invalid":""}`} placeholder="Enter email" value={form.email} onChange={handleChange} />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>

                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label sb-form-label">Contact <span className="text-muted small">(opt)</span></label>
                    <input type="tel" name="contactNo" className="form-control sb-input" placeholder="Phone" value={form.contactNo} onChange={handleChange} />
                  </div>
                  <div className="col-6">
                    <label className="form-label sb-form-label">Password <span className="text-danger">*</span></label>
                    <input type="password" name="password" className={`form-control sb-input ${errors.password?"is-invalid":""}`} placeholder="Min 6 chars" value={form.password} onChange={handleChange} />
                    {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label sb-form-label">Confirm Password <span className="text-danger">*</span></label>
                  <input type="password" name="confirmPassword" className={`form-control sb-input ${errors.confirmPassword?"is-invalid":""}`} placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange} />
                  {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                </div>
              </>
            )}

            {/* Login fields */}
            {mode === "login" && (
              <>
                <div className="mb-2">
                  <label className="form-label sb-form-label">Username <span className="text-danger">*</span></label>
                  <input type="text" name="username" className={`form-control sb-input ${errors.username?"is-invalid":""}`} placeholder="Enter username" value={form.username} onChange={handleChange} />
                  {errors.username && <div className="invalid-feedback">{errors.username}</div>}
                </div>
                <div className="mb-2">
                  <label className="form-label sb-form-label">Password <span className="text-danger">*</span></label>
                  <input type="password" name="password" className={`form-control sb-input ${errors.password?"is-invalid":""}`} placeholder="Enter password" value={form.password} onChange={handleChange} />
                  {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                </div>
              </>
            )}

            <button type="submit" className="btn sb-primary-btn w-100 mt-2" disabled={loading}>
              {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
              {mode === "login" ? "Sign In" : "Register"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;