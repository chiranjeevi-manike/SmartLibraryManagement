import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "https://smartlibrarymanagement-production.up.railway.app";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ==================================================
  // LOGIN
  // ==================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      // ==============================================
      // STEP 1: LOGIN
      // ==============================================

      const formData = new URLSearchParams();

      formData.append("username", username.trim());
      formData.append("password", password);

      const response = await axios.post(
        `${API_URL}/auth/login`,
        formData,
        {
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
        }
      );

      const token = response.data.access_token;

      if (!token) {
        setMessage(
          "Login failed: token not received."
        );
        return;
      }

      // Save JWT token
      localStorage.setItem("token", token);

      // ==============================================
      // STEP 2: GET CURRENT USER
      // ==============================================

      const userResponse = await axios.get(
        `${API_URL}/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const user = userResponse.data;

      // Save current user
      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      localStorage.setItem(
        "role_id",
        String(user.role_id)
      );

      // ==============================================
      // STEP 3: ROLE BASED REDIRECTION
      // ==============================================

      /*
  role_id 2 = ADMIN
  role_id 3 = LIBRARIAN
  role_id 4 = MEMBER
*/

      if (Number(user.role_id) === 2) {
  navigate("/dashboard");

} else if (Number(user.role_id) === 3) {
  navigate("/librarian-dashboard");

} else if (Number(user.role_id) === 4) {
  navigate("/member-dashboard");

      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role_id");

        setMessage(
          `Unknown user role: ${user.role_id}`
        );
      }

    } catch (error) {
      console.error("Login Error:", error);

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role_id");

      setMessage(
        error.response?.data?.detail ||
          "Login failed. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <div style={pageStyle}>
      <div style={loginCardStyle}>

        {/* BRAND */}

        <div style={brandSectionStyle}>
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

        {/* HEADER */}

        <div style={headerStyle}>
          <h2 style={titleStyle}>
            Welcome Back
          </h2>

          <p style={subtitleStyle}>
            Sign in to continue to your library
            account.
          </p>
        </div>

        {/* ERROR */}

        {message && (
          <div style={errorStyle}>
            {message}
          </div>
        )}

        {/* LOGIN FORM */}

        <form onSubmit={handleLogin}>

          {/* USERNAME */}

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setMessage("");
              }}
              placeholder="Enter your username"
              style={inputStyle}
              autoComplete="username"
              required
            />
          </div>

          {/* PASSWORD */}

          <div style={passwordFieldStyle}>
            <label style={labelStyle}>
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setMessage("");
              }}
              placeholder="Enter your password"
              style={inputStyle}
              autoComplete="current-password"
              required
            />
          </div>

          {/* FORGOT PASSWORD */}

          <div style={forgotPasswordContainerStyle}>
            <button
              type="button"
              onClick={() =>
                navigate("/forgot-password")
              }
              style={forgotPasswordButtonStyle}
            >
              Forgot Password?
            </button>
          </div>

          {/* SIGN IN */}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...loginButtonStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Signing In..."
              : "Sign In"}
          </button>

        </form>

        {/* REGISTER */}

        <div style={registerSectionStyle}>
          <span>
            New to Smart Library?
          </span>

          <button
            type="button"
            onClick={() =>
              navigate("/register")
            }
            style={createAccountButtonStyle}
          >
            Create an account
          </button>
        </div>

        {/* FOOTER */}

        <div style={footerStyle}>
          Smart Library Management System
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


const loginCardStyle = {
  width: "100%",
  maxWidth: "410px",
  backgroundColor: "#ffffff",
  borderRadius: "14px",
  padding: "30px",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 12px 35px rgba(15,23,42,0.08)",
};


// ==================================================
// BRAND
// ==================================================

const brandSectionStyle = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
  marginBottom: "27px",
};


const logoStyle = {
  width: "42px",
  height: "42px",
  minWidth: "42px",
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


// ==================================================
// HEADER
// ==================================================

const headerStyle = {
  marginBottom: "22px",
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


// ==================================================
// FORM
// ==================================================

const fieldStyle = {
  marginBottom: "15px",
};


const passwordFieldStyle = {
  marginBottom: "7px",
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
  backgroundColor: "#ffffff",
  color: "#111827",
  fontSize: "12px",
  outline: "none",
};


// ==================================================
// FORGOT PASSWORD
// ==================================================

const forgotPasswordContainerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: "15px",
};


const forgotPasswordButtonStyle = {
  padding: 0,
  border: "none",
  backgroundColor: "transparent",
  color: "#2563eb",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "600",
};


// ==================================================
// LOGIN BUTTON
// ==================================================

const loginButtonStyle = {
  width: "100%",
  marginTop: "3px",
  padding: "10px",
  border: "none",
  borderRadius: "7px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "700",
};


// ==================================================
// REGISTER
// ==================================================

const registerSectionStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "5px",
  flexWrap: "wrap",
  marginTop: "20px",
  paddingTop: "17px",
  borderTop: "1px solid #eef2f7",
  color: "#64748b",
  fontSize: "11px",
};


const createAccountButtonStyle = {
  padding: 0,
  border: "none",
  backgroundColor: "transparent",
  color: "#2563eb",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "700",
};


// ==================================================
// MESSAGE
// ==================================================

const errorStyle = {
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "7px",
  padding: "9px 10px",
  marginBottom: "16px",
  fontSize: "11px",
};


// ==================================================
// FOOTER
// ==================================================

const footerStyle = {
  marginTop: "22px",
  textAlign: "center",
  color: "#94a3b8",
  fontSize: "9px",
};


export default Login;
