import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "https://smartlibrarymanagement-production.up.railway.app";

export default function ChangePassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [show, setShow] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const token = localStorage.getItem("token");

  const logoutForInvalidToken = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role_id");
    navigate("/");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.current_password || !form.new_password || !form.confirm_password) {
      setError("Please complete all password fields.");
      return;
    }

    if (form.new_password.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (form.current_password === form.new_password) {
      setError("New password must be different from current password.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.put(
        `${API_BASE_URL}/users/me/password`,
        {
          current_password: form.current_password,
          new_password: form.new_password,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess(response.data?.message || "Password changed successfully.");
      setForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      if (err?.response?.status === 401) {
        logoutForInvalidToken();
        return;
      }

      setError(
        err?.response?.data?.detail ||
          "Unable to change password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setForm({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
    setError("");
    setSuccess("");
  };

  return (
    <div className="change-password-page">
      <style>{`
        .change-password-page {
          width: 100%;
          color: #1f2937;
          box-sizing: border-box;
        }

        .change-password-header {
          margin-bottom: 22px;
        }

        .change-password-header h1 {
          margin: 0;
          color: #111827;
          font-size: 34px;
          line-height: 1.15;
          font-weight: 700;
        }

        .change-password-header p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .change-password-grid {
          display: grid;
          grid-template-columns: minmax(0, 620px) minmax(260px, 1fr);
          gap: 18px;
          align-items: start;
        }

        .password-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 22px;
          box-shadow: 0 3px 10px rgba(15,23,42,0.04);
        }

        .password-title {
          margin: 0;
          color: #111827;
          font-size: 18px;
          font-weight: 700;
        }

        .password-subtitle {
          margin: 5px 0 20px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
        }

        .password-message {
          padding: 10px 12px;
          border-radius: 7px;
          margin-bottom: 16px;
          font-size: 12px;
          border: 1px solid transparent;
        }

        .password-error {
          background: #fee2e2;
          color: #991b1b;
          border-color: #fecaca;
        }

        .password-success {
          background: #dcfce7;
          color: #166534;
          border-color: #bbf7d0;
        }

        .password-group {
          margin-bottom: 15px;
        }

        .password-group label {
          display: block;
          color: #475569;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .password-input-wrap {
          position: relative;
        }

        .password-input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 7px;
          padding: 10px 48px 10px 11px;
          background: #fff;
          color: #334155;
          box-sizing: border-box;
          font-size: 12px;
          outline: none;
        }

        .password-input:focus {
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
        }

        .password-toggle {
          position: absolute;
          right: 7px;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          font-size: 10px;
          font-weight: 700;
          padding: 5px;
        }

        .password-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 21px;
          padding-top: 16px;
          border-top: 1px solid #eef2f7;
        }

        .password-secondary,
        .password-primary {
          border-radius: 7px;
          padding: 9px 14px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .password-secondary {
          border: 1px solid #d1d5db;
          background: #f8fafc;
          color: #475569;
        }

        .password-primary {
          border: none;
          background: #2563eb;
          color: #fff;
        }

        .password-primary:hover {
          background: #1d4ed8;
        }

        .password-primary:disabled,
        .password-secondary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .password-info-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 20px;
          margin-bottom: 14px;
        }

        .password-rules {
          margin: 0;
          padding-left: 18px;
          color: #475569;
          font-size: 12px;
          line-height: 1.9;
        }

        @media (max-width: 950px) {
          .change-password-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .change-password-header h1 {
            font-size: 28px;
          }

          .password-card {
            padding: 17px;
          }

          .password-actions {
            flex-direction: column-reverse;
          }

          .password-secondary,
          .password-primary {
            width: 100%;
          }
        }
      `}</style>

      <div className="change-password-header">
        <h1>Change Password</h1>
        <p>Update the password used to access your Smart Library account.</p>
      </div>

      <div className="change-password-grid">
        <form className="password-card" onSubmit={handleSubmit}>
          <h2 className="password-title">Account Security</h2>
          <p className="password-subtitle">
            Enter your current password and choose a different password for your account.
          </p>

          {error && <div className="password-message password-error">{error}</div>}
          {success && <div className="password-message password-success">{success}</div>}

          <PasswordField
            label="Current Password"
            name="current_password"
            value={form.current_password}
            visible={show.current}
            onChange={handleChange}
            onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
            autoComplete="current-password"
          />

          <PasswordField
            label="New Password"
            name="new_password"
            value={form.new_password}
            visible={show.new}
            onChange={handleChange}
            onToggle={() => setShow((s) => ({ ...s, new: !s.new }))}
            autoComplete="new-password"
          />

          <PasswordField
            label="Confirm New Password"
            name="confirm_password"
            value={form.confirm_password}
            visible={show.confirm}
            onChange={handleChange}
            onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
            autoComplete="new-password"
          />

          <div className="password-actions">
            <button
              type="button"
              className="password-secondary"
              onClick={clearForm}
              disabled={loading}
            >
              Clear
            </button>

            <button
              type="submit"
              className="password-primary"
              disabled={loading}
            >
              {loading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>

        <div className="password-card">
          <div className="password-info-icon">⚿</div>
          <h2 className="password-title">Password Guidelines</h2>
          <p className="password-subtitle">
            Use a password that is difficult for others to guess and different
            from your current password.
          </p>

          <ul className="password-rules">
            <li>Use at least 6 characters.</li>
            <li>Do not reuse your current password.</li>
            <li>Keep your password private.</li>
            <li>Sign out on shared or public computers.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  name,
  value,
  visible,
  onChange,
  onToggle,
  autoComplete,
}) {
  return (
    <div className="password-group">
      <label>{label}</label>
      <div className="password-input-wrap">
        <input
          className="password-input"
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={`Enter ${label.toLowerCase()}`}
          autoComplete={autoComplete}
          minLength={name === "current_password" ? undefined : 6}
          required
        />
        <button
          type="button"
          className="password-toggle"
          onClick={onToggle}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

