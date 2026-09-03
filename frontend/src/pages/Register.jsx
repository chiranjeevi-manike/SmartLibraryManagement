import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==================================================
  // HANDLE INPUT
  // ==================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  // ==================================================
  // REGISTER
  // ==================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.full_name.trim() ||
      !form.username.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Please complete all fields.");
      return;
    }

    if (form.password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        `${API_URL}/auth/register`,
        {
          full_name: form.full_name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
        }
      );

      setSuccess(
        "Account created successfully. You can now sign in."
      );

      setForm({
        full_name: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error) {
      console.error("Registration Error:", error);

      setError(
        error.response?.data?.detail ||
          "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={registerCardStyle}>
        {/* BRAND */}

        <div style={brandSectionStyle}>
          <div style={logoStyle}>SL</div>

          <div>
            <h1 style={brandTitleStyle}>
              Smart Library
            </h1>

            <p style={brandSubtitleStyle}>
              Management System
            </p>
          </div>
        </div>

        {/* HEADER */}

        <div style={headerStyle}>
          <h2 style={titleStyle}>
            Create Account
          </h2>

          <p style={subtitleStyle}>
            Register as a new library member.
          </p>
        </div>

        {/* ERROR */}

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div style={successStyle}>
            {success}
          </div>
        )}

        {/* FORM */}

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Full Name
            </label>

            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Enter your full name"
              style={inputStyle}
              autoComplete="name"
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Username
            </label>

            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Choose a username"
              style={inputStyle}
              autoComplete="username"
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Email Address
            </label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              style={inputStyle}
              autoComplete="email"
            />
          </div>

          <div style={formGridStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Password
              </label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Create password"
                style={inputStyle}
                autoComplete="new-password"
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Confirm Password
              </label>

              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                style={inputStyle}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div style={memberInfoStyle}>
            <span style={infoIconStyle}>i</span>

            <span>
              New accounts are automatically registered
              as <strong>Library Members</strong>.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...registerButtonStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>
        </form>

        {/* LOGIN */}

        <div style={loginSectionStyle}>
          Already have an account?{" "}

          <button
            type="button"
            onClick={() => navigate("/")}
            style={loginButtonStyle}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================================================
// STYLES
// ==================================================

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#f5f7fb",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "30px 20px",
  boxSizing: "border-box",
};

const registerCardStyle = {
  width: "100%",
  maxWidth: "540px",
  backgroundColor: "#ffffff",
  borderRadius: "14px",
  padding: "30px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 12px 35px rgba(15,23,42,0.08)",
};

const brandSectionStyle = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
  marginBottom: "26px",
};

const logoStyle = {
  width: "42px",
  height: "42px",
  borderRadius: "10px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "800",
  fontSize: "15px",
};

const brandTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "17px",
  fontWeight: "700",
};

const brandSubtitleStyle = {
  margin: "2px 0 0 0",
  color: "#64748b",
  fontSize: "10px",
};

const headerStyle = {
  marginBottom: "20px",
};

const titleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "27px",
  fontWeight: "700",
};

const subtitleStyle = {
  margin: "5px 0 0 0",
  color: "#64748b",
  fontSize: "13px",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "12px",
};

const fieldStyle = {
  marginBottom: "13px",
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  color: "#374151",
  fontSize: "11px",
  fontWeight: "600",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  fontSize: "12px",
  color: "#111827",
  outline: "none",
  backgroundColor: "#ffffff",
};

const memberInfoStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "9px 10px",
  backgroundColor: "#eff6ff",
  color: "#1e40af",
  border: "1px solid #dbeafe",
  borderRadius: "7px",
  fontSize: "10px",
  marginBottom: "14px",
};

const infoIconStyle = {
  width: "18px",
  height: "18px",
  minWidth: "18px",
  borderRadius: "50%",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
  fontWeight: "700",
};

const registerButtonStyle = {
  width: "100%",
  padding: "10px",
  border: "none",
  borderRadius: "7px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "700",
};

const loginSectionStyle = {
  textAlign: "center",
  marginTop: "18px",
  paddingTop: "16px",
  borderTop: "1px solid #eef2f7",
  color: "#64748b",
  fontSize: "11px",
};

const loginButtonStyle = {
  padding: 0,
  border: "none",
  backgroundColor: "transparent",
  color: "#2563eb",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "11px",
};

const errorStyle = {
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "7px",
  padding: "9px 10px",
  marginBottom: "15px",
  fontSize: "11px",
};

const successStyle = {
  backgroundColor: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
  borderRadius: "7px",
  padding: "9px 10px",
  marginBottom: "15px",
  fontSize: "11px",
};

export default Register;