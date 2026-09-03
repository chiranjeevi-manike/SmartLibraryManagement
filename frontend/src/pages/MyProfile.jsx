import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function MyProfile() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
  });

  const [roleName, setRoleName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");

  const logoutForInvalidToken = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role_id");
    navigate("/");
  };

  const roleLabel = (roleId) => {
    const id = Number(roleId);
    if (id === 2) return "Administrator";
    if (id === 3) return "Librarian";
    if (id === 4) return "Member";
    return "User";
  };

  const loadProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API_BASE_URL}/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const user = response.data;

      setForm({
        full_name: user.full_name || "",
        username: user.username || "",
        email: user.email || "",
      });

      setRoleName(roleLabel(user.role_id));

      const existing = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...existing,
          ...user,
        })
      );
    } catch (err) {
      if (err?.response?.status === 401) {
        logoutForInvalidToken();
        return;
      }

      setError(
        err?.response?.data?.detail ||
          "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const fullName = form.full_name.trim();
    const email = form.email.trim();

    if (!fullName || !email) {
      setError("Full name and email address are required.");
      return;
    }

    if (fullName.length < 2) {
      setError("Full name must contain at least 2 characters.");
      return;
    }

    setSaving(true);

    try {
      const response = await axios.put(
        `${API_BASE_URL}/users/me/profile`,
        {
          full_name: fullName,
          email,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedUser = response.data?.user;

      if (updatedUser) {
        setForm({
          full_name: updatedUser.full_name || "",
          username: updatedUser.username || "",
          email: updatedUser.email || "",
        });

        setRoleName(roleLabel(updatedUser.role_id));

        const existing = JSON.parse(
          localStorage.getItem("user") || "{}"
        );

        localStorage.setItem(
          "user",
          JSON.stringify({
            ...existing,
            ...updatedUser,
          })
        );
      }

      setSuccess(
        response.data?.message ||
          "Profile updated successfully."
      );

      // Layout reads the user from localStorage.
      // Refresh once so the sidebar name/email/initials update immediately.
      window.setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err) {
      if (err?.response?.status === 401) {
        logoutForInvalidToken();
        return;
      }

      setError(
        err?.response?.data?.detail ||
          "Unable to update your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    const name =
      form.full_name.trim() ||
      form.username.trim() ||
      "User";

    const words = name.split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
      return (
        words[0][0] +
        words[words.length - 1][0]
      ).toUpperCase();
    }

    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="profile-page">
      <style>{`
        .profile-page {
          width: 100%;
          box-sizing: border-box;
          color: #1f2937;
        }

        .profile-header {
          margin-bottom: 22px;
        }

        .profile-header h1 {
          margin: 0;
          color: #111827;
          font-size: 34px;
          line-height: 1.15;
          font-weight: 700;
        }

        .profile-header p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: minmax(0, 620px) minmax(260px, 1fr);
          gap: 18px;
          align-items: start;
        }

        .profile-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 22px;
          box-shadow: 0 3px 10px rgba(15,23,42,0.04);
        }

        .profile-card-title {
          margin: 0;
          color: #111827;
          font-size: 18px;
          font-weight: 700;
        }

        .profile-card-subtitle {
          margin: 5px 0 20px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
        }

        .profile-message {
          padding: 10px 12px;
          border-radius: 7px;
          margin-bottom: 16px;
          font-size: 12px;
          border: 1px solid transparent;
        }

        .profile-error {
          background: #fee2e2;
          color: #991b1b;
          border-color: #fecaca;
        }

        .profile-success {
          background: #dcfce7;
          color: #166534;
          border-color: #bbf7d0;
        }

        .profile-group {
          margin-bottom: 15px;
        }

        .profile-group label {
          display: block;
          color: #475569;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .profile-input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          border-radius: 7px;
          padding: 10px 11px;
          background: #ffffff;
          color: #334155;
          font-size: 12px;
          outline: none;
          transition: 0.15s ease;
        }

        .profile-input:focus {
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
        }

        .profile-readonly { position: relative; }
        .profile-input-readonly {
          width: 100%; box-sizing: border-box; border: 1px solid #e2e8f0;
          border-radius: 7px; padding: 10px 42px 10px 11px;
          background: #f8fafc; color: #64748b; font-size: 12px;
          cursor: not-allowed;
        }
        .profile-lock {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%); color: #94a3b8; font-size: 13px;
        }
        .profile-help {
          margin-top: 5px; color: #94a3b8; font-size: 10px; line-height: 1.45;
        }

        .profile-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 21px;
          padding-top: 16px;
          border-top: 1px solid #eef2f7;
        }

        .profile-secondary,
        .profile-primary {
          border-radius: 7px;
          padding: 9px 14px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .profile-secondary {
          border: 1px solid #d1d5db;
          background: #f8fafc;
          color: #475569;
        }

        .profile-primary {
          border: none;
          background: #2563eb;
          color: #ffffff;
        }

        .profile-primary:hover {
          background: #1d4ed8;
        }

        .profile-primary:disabled,
        .profile-secondary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .profile-summary {
          text-align: center;
        }

        .profile-avatar {
          width: 74px;
          height: 74px;
          margin: 0 auto 14px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1d4ed8;
          color: #ffffff;
          font-size: 22px;
          font-weight: 700;
          box-shadow: 0 5px 14px rgba(37,99,235,0.22);
        }

        .profile-summary h2 {
          margin: 0;
          color: #111827;
          font-size: 18px;
          font-weight: 700;
        }

        .profile-summary-email {
          margin-top: 5px;
          color: #64748b;
          font-size: 12px;
          word-break: break-word;
        }

        .profile-role {
          display: inline-flex;
          margin-top: 13px;
          padding: 6px 13px;
          border-radius: 20px;
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
          font-size: 11px;
          font-weight: 700;
        }

        .profile-security-box {
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid #eef2f7;
          text-align: left;
        }

        .profile-security-box h3 {
          margin: 0 0 6px;
          color: #111827;
          font-size: 14px;
        }

        .profile-security-box p {
          margin: 0 0 12px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
        }

        .profile-password-link {
          width: 100%;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 7px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .profile-loading {
          padding: 40px 20px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
        }

        @media (max-width: 950px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .profile-header h1 {
            font-size: 28px;
          }

          .profile-card {
            padding: 17px;
          }

          .profile-actions {
            flex-direction: column-reverse;
          }

          .profile-secondary,
          .profile-primary {
            width: 100%;
          }
        }
      `}</style>

      <div className="profile-header">
        <h1>My Profile</h1>
        <p>
          View and update your Smart Library account information.
        </p>
      </div>

      {loading ? (
        <div className="profile-card profile-loading">
          Loading profile...
        </div>
      ) : (
        <div className="profile-grid">
          <form className="profile-card" onSubmit={handleSubmit}>
            <h2 className="profile-card-title">
              Personal Information
            </h2>

            <p className="profile-card-subtitle">
              Update your full name and email address. Your login identity and role are protected.
            </p>

            {error && (
              <div className="profile-message profile-error">
                {error}
              </div>
            )}

            {success && (
              <div className="profile-message profile-success">
                {success}
              </div>
            )}

            <div className="profile-group">
              <label>Full Name</label>
              <input
                className="profile-input"
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="profile-group">
              <label>Username</label>
              <div className="profile-readonly">
                <input
                  className="profile-input-readonly"
                  type="text"
                  value={form.username}
                  readOnly
                  aria-readonly="true"
                />
                <span className="profile-lock" title="Username cannot be changed">🔒</span>
              </div>
              <div className="profile-help">
                Username is your login identity and cannot be changed from My Profile.
              </div>
            </div>

            <div className="profile-group">
              <label>Role</label>
              <div className="profile-readonly">
                <input
                  className="profile-input-readonly"
                  type="text"
                  value={roleName}
                  readOnly
                  aria-readonly="true"
                />
                <span className="profile-lock" title="Role is managed by an administrator">🔒</span>
              </div>
              <div className="profile-help">
                Account roles are managed through authorized administration controls.
              </div>
            </div>

            <div className="profile-group">
              <label>Email Address</label>
              <input
                className="profile-input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter email address"
                autoComplete="email"
                required
              />
            </div>

            <div className="profile-actions">
              <button
                type="button"
                className="profile-secondary"
                onClick={loadProfile}
                disabled={saving}
              >
                Reset
              </button>

              <button
                type="submit"
                className="profile-primary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

          <div className="profile-card profile-summary">
            <div className="profile-avatar">
              {getInitials()}
            </div>

            <h2>
              {form.full_name || form.username || "User"}
            </h2>

            <div className="profile-summary-email">
              {form.email}
            </div>

            <div className="profile-role">
              {roleName}
            </div>

            <div className="profile-security-box">
              <h3>Account Security</h3>
              <p>
                Keep your account secure by changing your password
                whenever necessary.
              </p>

              <button
                type="button"
                className="profile-password-link"
                onClick={() => navigate("/change-password")}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
