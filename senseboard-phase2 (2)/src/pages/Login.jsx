import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser, registerUser } from "../api/axios";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setServerError("");
  };

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = "Username is required";
    if (mode === "register") {
      if (!form.email.trim()) errs.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email";
      if (!form.password) errs.password = "Password is required";
      else if (form.password.length < 6) errs.password = "Min 6 characters";
      if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    } else {
      if (!form.password) errs.password = "Password is required";
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
        login(res.data.token, form.username);
        navigate("/connection");
      } else {
        await registerUser({ username: form.username, email: form.email, password: form.password });
        setMode("login");
        setForm({ username: form.username, email: "", password: "", confirmPassword: "" });
        setServerError("Registered! Please log in.");
      }
    } catch (err) {
      setServerError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sb-login-wrapper d-flex align-items-center justify-content-center">
      <div className="sb-login-card card shadow-lg border-0">
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <div className="sb-logo-icon mx-auto mb-3">
              <i className="bi bi-cpu-fill"></i>
            </div>
            <h4 className="sb-brand-text">{mode === "login" ? "Welcome Back" : "Create Account"}</h4>
            <p className="text-muted small">{mode === "login" ? "Sign in to SenseBoard" : "Register to get started"}</p>
          </div>

          {serverError && (
            <div className={`alert ${serverError.includes("Registered") ? "alert-success" : "alert-danger"} py-2 small`}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label sb-form-label">Username</label>
              <input
                type="text"
                name="username"
                className={`form-control sb-input ${errors.username ? "is-invalid" : ""}`}
                placeholder="Enter username"
                value={form.username}
                onChange={handleChange}
              />
              {errors.username && <div className="invalid-feedback">{errors.username}</div>}
            </div>

            {mode === "register" && (
              <div className="mb-3">
                <label className="form-label sb-form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className={`form-control sb-input ${errors.email ? "is-invalid" : ""}`}
                  placeholder="Enter email"
                  value={form.email}
                  onChange={handleChange}
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>
            )}

            <div className="mb-3">
              <label className="form-label sb-form-label">Password</label>
              <input
                type="password"
                name="password"
                className={`form-control sb-input ${errors.password ? "is-invalid" : ""}`}
                placeholder="Enter password"
                value={form.password}
                onChange={handleChange}
              />
              {errors.password && <div className="invalid-feedback">{errors.password}</div>}
            </div>

            {mode === "register" && (
              <div className="mb-3">
                <label className="form-label sb-form-label">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className={`form-control sb-input ${errors.confirmPassword ? "is-invalid" : ""}`}
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                />
                {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
              </div>
            )}

            <button type="submit" className="btn sb-primary-btn w-100 mt-2" disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
              {mode === "login" ? "Sign In" : "Register"}
            </button>
          </form>

          <div className="text-center mt-3">
            {mode === "login" ? (
              <p className="small text-muted mb-0">
                Not registered?{" "}
                <button className="btn btn-link sb-link-btn p-0" onClick={() => { setMode("register"); setErrors({}); setServerError(""); }}>
                  Register here
                </button>
              </p>
            ) : (
              <p className="small text-muted mb-0">
                Already have an account?{" "}
                <button className="btn btn-link sb-link-btn p-0" onClick={() => { setMode("login"); setErrors({}); setServerError(""); }}>
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
