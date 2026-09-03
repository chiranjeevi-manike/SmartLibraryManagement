import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "https://smartlibrarymanagement-production.up.railway.app";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==================================================
  // STEP 1 - REQUEST RESET TOKEN
  // ==================================================

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/auth/forgot-password`,
        {
          email: email.trim(),
        }
      );

      setSuccess(response.data.message);

      // Development mode:
      // backend returns token directly
      if (response.data.reset_token) {
        setResetToken(response.data.reset_token);

        setStep(2);
      }
    } catch (error) {
      console.error(
        "Forgot Password Error:",
        error
      );

      setError(
        error.response?.data?.detail ||
          "Unable to process password reset request."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // STEP 2 - RESET PASSWORD
  // ==================================================

  const handleResetPassword = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!resetToken) {
      setError(
        "Password reset token is missing."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/auth/reset-password`,
        {
          token: resetToken,
          new_password: newPassword,
        }
      );

      setSuccess(response.data.message);

      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/");
      }, 1800);
    } catch (error) {
      console.error(
        "Reset Password Error:",
        error
      );

      setError(
        error.response?.data?.detail ||
          "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* BRAND */}

        <div style={brandStyle}>
          <div style={logoStyle}>
            SL
          </div>

          <div>
            <h1 style={brandTitleStyle}>
              Smart Library
            </h1>

            <p style={brandSubtitleStyle}>
              Management System
            </p>
          </div>
        </div>

        {/* STEP 1 */}

        {step === 1 && (
          <>
            <div style={headerStyle}>
              <h2 style={titleStyle}>
                Forgot Password
              </h2>

              <p style={subtitleStyle}>
                Enter your registered email address
                to reset your password.
              </p>
            </div>

            {error && (
              <div style={errorStyle}>
                {error}
              </div>
            )}

            {success && (
              <div style={successStyle}>
                {success}
              </div>
            )}

            <form
              onSubmit={
                handleForgotPassword
              }
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Email Address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter your registered email"
                  style={inputStyle}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...primaryButtonStyle,
                  opacity: loading
                    ? 0.7
                    : 1,
                }}
              >
                {loading
                  ? "Processing..."
                  : "Continue"}
              </button>
            </form>
          </>
        )}

        {/* STEP 2 */}

        {step === 2 && (
          <>
            <div style={headerStyle}>
              <h2 style={titleStyle}>
                Reset Password
              </h2>

              <p style={subtitleStyle}>
                Create a new password for
                your account.
              </p>
            </div>

            {error && (
              <div style={errorStyle}>
                {error}
              </div>
            )}

            {success && (
              <div style={successStyle}>
                {success}
              </div>
            )}

            <form
              onSubmit={
                handleResetPassword
              }
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  New Password
                </label>

                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(
                      e.target.value
                    );

                    setError("");
                  }}
                  placeholder="Enter new password"
                  style={inputStyle}
                  required
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Confirm Password
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(
                      e.target.value
                    );

                    setError("");
                  }}
                  placeholder="Confirm new password"
                  style={inputStyle}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...primaryButtonStyle,
                  opacity: loading
                    ? 0.7
                    : 1,
                }}
              >
                {loading
                  ? "Resetting..."
                  : "Reset Password"}
              </button>
            </form>
          </>
        )}

        {/* BACK TO LOGIN */}

        <div style={footerStyle}>
          <button
            type="button"
            onClick={() =>
              navigate("/")
            }
            style={backButtonStyle}
          >
            ← Back to Sign In
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
  alignItems: "center",
  justifyContent: "center",
  padding: "30px 20px",
  boxSizing: "border-box",
};

const cardStyle = {
  width: "100%",
  maxWidth: "430px",
  backgroundColor: "#ffffff",
  padding: "30px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 12px 35px rgba(15,23,42,0.08)",
};

const brandStyle = {
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
  fontSize: "12px",
  lineHeight: "1.5",
};

const fieldStyle = {
  marginBottom: "15px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#374151",
  fontSize: "11px",
  fontWeight: "600",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 11px",
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  fontSize: "12px",
  outline: "none",
};

const primaryButtonStyle = {
  width: "100%",
  padding: "10px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "7px",
  fontWeight: "700",
  fontSize: "12px",
  cursor: "pointer",
};

const errorStyle = {
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "9px 10px",
  borderRadius: "7px",
  marginBottom: "15px",
  fontSize: "11px",
};

const successStyle = {
  backgroundColor: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
  padding: "9px 10px",
  borderRadius: "7px",
  marginBottom: "15px",
  fontSize: "11px",
};

const footerStyle = {
  marginTop: "18px",
  paddingTop: "16px",
  borderTop: "1px solid #eef2f7",
  textAlign: "center",
};

const backButtonStyle = {
  border: "none",
  backgroundColor: "transparent",
  color: "#2563eb",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "11px",
};

export default ForgotPassword;
