import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  "https://smartlibrarymanagement-production.up.railway.app";

const ROLE_OPTIONS = [
  { id: 2, name: "ADMIN" },
  { id: 3, name: "LIBRARIAN" },
  { id: 4, name: "MEMBER" },
];

export default function Users() {
  const navigate = useNavigate();

  // ==================================================
  // STATE
  // ==================================================

  const [users, setUsers] =
    useState([]);

  const [total, setTotal] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    roleFilter,
    setRoleFilter,
  ] = useState("ALL");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");

  const [
    securityFilter,
    setSecurityFilter,
  ] = useState("ALL");

  const [page, setPage] =
    useState(1);

  const [limit, setLimit] =
    useState(10);

  const [
    showAddModal,
    setShowAddModal,
  ] = useState(false);

  const [
    showEditModal,
    setShowEditModal,
  ] = useState(false);

  const [
    editingUser,
    setEditingUser,
  ] = useState(null);

  const [addForm, setAddForm] =
    useState({
      username: "",
      email: "",
      full_name: "",
      password: "",
      role_name: "MEMBER",
    });

  const [editForm, setEditForm] =
    useState({
      username: "",
      email: "",
      full_name: "",
    });

  // ==================================================
  // AUTH
  // ==================================================

  const token =
    localStorage.getItem("token");

  let storedUser = {};

  try {
    storedUser = JSON.parse(
      localStorage.getItem("user") ||
        "{}"
    );
  } catch {
    storedUser = {};
  }

  const roleId = Number(
    localStorage.getItem("role_id")
  );

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const handleAuthError = (err) => {
    // Logout ONLY for invalid/expired authentication.
    if (
      err?.response?.status === 401
    ) {
      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      localStorage.removeItem(
        "role_id"
      );

      navigate("/");

      return true;
    }

    // Do not logout for normal permission errors.
    if (
      err?.response?.status === 403
    ) {
      setError(
        err?.response?.data
          ?.detail ||
          "You do not have permission to perform this action."
      );

      return true;
    }

    return false;
  };

  // ==================================================
  // FETCH USERS
  // ==================================================

  const fetchUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const skip =
        (page - 1) * limit;

      const response =
        await axios.get(
          `${API_BASE_URL}/users/?skip=${skip}&limit=${limit}`,
          authConfig
        );

      setUsers(
        response.data.users || []
      );

      setTotal(
        response.data.total || 0
      );
    } catch (err) {
      if (
        !handleAuthError(err)
      ) {
        setError(
          err?.response?.data
            ?.detail ||
            "Unable to load users. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    if (roleId !== 2) {
      navigate("/");
      return;
    }

    fetchUsers();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  // ==================================================
  // FILTERING
  // ==================================================

  const filteredUsers =
    useMemo(() => {
      const q = searchText
        .trim()
        .toLowerCase();

      return users.filter(
        (user) => {
          const matchesSearch =
            !q ||
            String(
              user.id
            ).includes(q) ||
            (
              user.username || ""
            )
              .toLowerCase()
              .includes(q) ||
            (
              user.full_name || ""
            )
              .toLowerCase()
              .includes(q) ||
            (user.email || "")
              .toLowerCase()
              .includes(q);

          const matchesRole =
            roleFilter ===
              "ALL" ||
            user.role ===
              roleFilter;

          const matchesStatus =
            statusFilter ===
              "ALL" ||
            (statusFilter ===
              "ACTIVE" &&
              user.is_active) ||
            (statusFilter ===
              "INACTIVE" &&
              !user.is_active);

          const lockDate =
            user.locked_until
              ? new Date(
                  user.locked_until.endsWith("Z")
                    ? user.locked_until
                    : `${user.locked_until}Z`
                )
              : null;

          const isLocked =
            lockDate &&
            lockDate > new Date();

          const matchesSecurity =
            securityFilter === "ALL" ||
            (securityFilter ===
              "LOCKED" &&
              isLocked) ||
            (securityFilter ===
              "UNLOCKED" &&
              !isLocked);

          return (
            matchesSearch &&
            matchesRole &&
            matchesStatus &&
            matchesSecurity
          );
        }
      );
    }, [
      users,
      searchText,
      roleFilter,
      statusFilter,
      securityFilter,
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(total / limit)
  );

  // ==================================================
  // SUMMARY VALUES
  // ==================================================

  const activeUsers =
    users.filter(
      (user) => user.is_active
    ).length;

  const memberCount =
    users.filter(
      (user) =>
        user.role === "MEMBER"
    ).length;

  const librarianCount =
    users.filter(
      (user) =>
        user.role === "LIBRARIAN"
    ).length;

  const adminCount =
    users.filter(
      (user) =>
        user.role === "ADMIN"
    ).length;

  // ==================================================
  // MESSAGES
  // ==================================================

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  // ==================================================
  // ADD USER
  // ==================================================

  const openAddModal = () => {
    resetMessages();

    setAddForm({
      username: "",
      email: "",
      full_name: "",
      password: "",
      role_name: "MEMBER",
    });

    setShowAddModal(true);
  };

  const createUser = async (e) => {
    e.preventDefault();

    resetMessages();

    if (
      !addForm.username.trim() ||
      !addForm.email.trim() ||
      !addForm.full_name.trim() ||
      !addForm.password
    ) {
      setError(
        "Please complete all required fields."
      );

      return;
    }

    setActionLoading(true);

    try {
      const params =
        new URLSearchParams();

      params.append(
        "username",
        addForm.username.trim()
      );

      params.append(
        "email",
        addForm.email.trim()
      );

      params.append(
        "full_name",
        addForm.full_name.trim()
      );

      params.append(
        "password",
        addForm.password
      );

      params.append(
        "role_name",
        addForm.role_name
      );

      await axios.post(
        `${API_BASE_URL}/users/?${params.toString()}`,
        null,
        authConfig
      );

      setShowAddModal(false);

      setSuccess(
        "User created successfully."
      );

      setPage(1);

      await fetchUsers();
    } catch (err) {
      if (
        !handleAuthError(err)
      ) {
        setError(
          err?.response?.data
            ?.detail ||
            "Unable to create user."
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ==================================================
  // EDIT USER
  // ==================================================

  const openEditModal = (user) => {
    resetMessages();

    setEditingUser(user);

    setEditForm({
      username:
        user.username || "",

      email:
        user.email || "",

      full_name:
        user.full_name || "",
    });

    setShowEditModal(true);
  };

  const updateUser = async (e) => {
    e.preventDefault();

    if (!editingUser) {
      return;
    }

    resetMessages();

    setActionLoading(true);

    try {
      await axios.put(
        `${API_BASE_URL}/users/${editingUser.id}`,
        {
          username:
            editForm.username.trim(),

          email:
            editForm.email.trim(),

          full_name:
            editForm.full_name.trim(),
        },
        authConfig
      );

      setShowEditModal(false);

      setEditingUser(null);

      setSuccess(
        "User details updated successfully."
      );

      await fetchUsers();
    } catch (err) {
      if (
        !handleAuthError(err)
      ) {
        setError(
          err?.response?.data
            ?.detail ||
            "Unable to update user."
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ==================================================
  // CHANGE ROLE
  // ==================================================

  const changeRole = async (
    user,
    roleIdValue
  ) => {
    resetMessages();

    const newRoleId = Number(
      roleIdValue
    );

    if (
      !newRoleId ||
      newRoleId === user.role_id
    ) {
      return;
    }

    const selectedRole =
      ROLE_OPTIONS.find(
        (role) =>
          role.id === newRoleId
      );

    const ok = window.confirm(
      `Change ${user.username}'s role from ${user.role} to ${selectedRole?.name}?`
    );

    if (!ok) {
      await fetchUsers();
      return;
    }

    setActionLoading(true);

    try {
      await axios.put(
        `${API_BASE_URL}/users/${user.id}/role`,
        {
          role_id: newRoleId,
        },
        authConfig
      );

      setSuccess(
        `${user.username}'s role changed to ${selectedRole?.name}.`
      );

      await fetchUsers();
    } catch (err) {
      if (
        !handleAuthError(err)
      ) {
        setError(
          err?.response?.data
            ?.detail ||
            "Unable to change user role."
        );
      }

      await fetchUsers();
    } finally {
      setActionLoading(false);
    }
  };

  // ==================================================
  // ACTIVATE / DEACTIVATE
  // ==================================================

  const toggleStatus = async (
    user
  ) => {
    resetMessages();

    const nextStatus =
      !user.is_active;

    const ok = window.confirm(
      nextStatus
        ? `Activate ${user.username}?`
        : `Deactivate ${user.username}?`
    );

    if (!ok) {
      return;
    }

    setActionLoading(true);

    try {
      await axios.put(
        `${API_BASE_URL}/users/${user.id}/status`,
        {
          is_active: nextStatus,
        },
        authConfig
      );

      setSuccess(
        nextStatus
          ? `${user.username} activated successfully.`
          : `${user.username} deactivated successfully.`
      );

      await fetchUsers();
    } catch (err) {
      if (
        !handleAuthError(err)
      ) {
        setError(
          err?.response?.data
            ?.detail ||
            "Unable to update user status."
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ==================================================
  // UNLOCK USER ACCOUNT
  // ==================================================

  const unlockUser = async (user) => {
    resetMessages();

    const ok = window.confirm(
      `Unlock ${user.username}'s account?`
    );

    if (!ok) {
      return;
    }

    setActionLoading(true);

    try {
      await axios.put(
        `${API_BASE_URL}/users/${user.id}/unlock`,
        null,
        authConfig
      );

      setSuccess(
        `${user.username}'s account unlocked successfully.`
      );

      await fetchUsers();
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(
          err?.response?.data?.detail ||
            "Unable to unlock user account."
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ==================================================
  // ROLE BADGE
  // ==================================================

  const roleBadgeClass = (
    role
  ) => {
    if (role === "ADMIN") {
      return "users-role admin";
    }

    if (
      role === "LIBRARIAN"
    ) {
      return "users-role librarian";
    }

    return "users-role member";
  };

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <div className="users-page">
      <style>{`
        .users-page {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          color: #1f2937;
        }

        /* ==========================================
           HEADER
        ========================================== */

        .users-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }

        .users-header h1 {
          margin: 0;
          color: #111827;
          font-size: 34px;
          line-height: 1.15;
          font-weight: 700;
        }

        .users-header p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .users-primary-btn {
          border: none;
          border-radius: 7px;
          padding: 8px 13px;
          background: #2563eb;
          color: white;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          transition: 0.15s ease;
        }

        .users-primary-btn:hover {
          background: #1d4ed8;
        }

        .users-primary-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* ==========================================
           MESSAGES
        ========================================== */

        .users-message {
          padding: 10px 12px;
          border-radius: 7px;
          margin-bottom: 16px;
          font-size: 12px;
          border: 1px solid transparent;
        }

        .users-error {
          background: #fee2e2;
          color: #991b1b;
          border-color: #fecaca;
        }

        .users-success {
          background: #dcfce7;
          color: #166534;
          border-color: #bbf7d0;
        }

        /* ==========================================
           SUMMARY
        ========================================== */

        .users-summary {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(175px, 1fr));
          gap: 11px;
          margin-bottom: 18px;
        }

        .users-card {
          display: flex;
          align-items: center;
          gap: 11px;
          background: white;
          border-radius: 10px;
          padding: 13px 14px;
          border: 1px solid #e5e7eb;
          box-shadow:
            0 2px 7px rgba(15,23,42,0.035);
          min-width: 0;
        }

        .users-card-icon {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 700;
        }

        .users-icon-blue {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .users-icon-green {
          background: #dcfce7;
          color: #15803d;
        }

        .users-icon-purple {
          background: #ede9fe;
          color: #6d28d9;
        }

        .users-icon-orange {
          background: #fef3c7;
          color: #b45309;
        }

        .users-icon-red {
          background: #fee2e2;
          color: #b91c1c;
        }

        .users-card-label {
          color: #64748b;
          font-size: 10px;
          font-weight: 600;
          margin-bottom: 3px;
        }

        .users-card-value {
          color: #0f172a;
          font-size: 19px;
          line-height: 1.1;
          font-weight: 700;
        }

        /* ==========================================
           MANAGEMENT CARD
        ========================================== */

        .users-management-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 11px;
          padding: 16px;
          box-shadow:
            0 3px 10px rgba(15,23,42,0.04);
        }

        .users-management-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 13px;
        }

        .users-section-title {
          margin: 0;
          color: #111827;
          font-size: 18px;
          font-weight: 700;
        }

        .users-section-subtitle {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        .users-count-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        /* ==========================================
           TOOLBAR
        ========================================== */

        .users-toolbar {
          display: grid;
          grid-template-columns:
            minmax(220px, 2fr)
            minmax(120px, 1fr)
            minmax(120px, 1fr)
            minmax(120px, 1fr)
            minmax(105px, auto);
          gap: 9px;
          margin-bottom: 12px;
        }

        .users-input,
        .users-select {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 7px 9px;
          background: white;
          color: #334155;
          box-sizing: border-box;
          font-size: 11px;
          outline: none;
        }

        .users-input:focus,
        .users-select:focus {
          border-color: #93c5fd;
          box-shadow:
            0 0 0 2px rgba(37,99,235,0.08);
        }

        /* ==========================================
           TABLE
        ========================================== */

        .users-table-wrap {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow-x: auto;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
          font-size: 12px;
        }

        .users-table th {
          padding: 9px 9px;
          border-bottom: 1px solid #dbe2ea;
          text-align: left;
          vertical-align: middle;
          background: #f8fafc;
          color: #475569;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .users-table td {
          padding: 9px 9px;
          border-bottom: 1px solid #eef2f7;
          text-align: left;
          vertical-align: middle;
          color: #475569;
          line-height: 1.35;
        }

        .users-table tbody tr:last-child td {
          border-bottom: none;
        }

        .users-id {
          color: #1d4ed8;
          font-weight: 700;
        }

        .users-name {
          color: #1f2937;
          font-size: 12px;
          font-weight: 700;
        }

        .users-username {
          color: #64748b;
          font-size: 10px;
          margin-top: 2px;
        }

        .users-you {
          color: #2563eb;
          font-weight: 700;
        }

        .users-email {
          color: #475569;
          font-size: 11px;
        }

        /* ==========================================
           BADGES
        ========================================== */

        .users-role,
        .users-status {
          display: inline-block;
          border-radius: 10px;
          padding: 3px 7px;
          font-size: 9px;
          font-weight: 700;
          white-space: nowrap;
        }

        .users-role.admin {
          background: #fee2e2;
          color: #991b1b;
        }

        .users-role.librarian {
          background: #ede9fe;
          color: #5b21b6;
        }

        .users-role.member {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .users-status.active {
          background: #dcfce7;
          color: #166534;
        }

        .users-status.inactive {
          background: #f1f5f9;
          color: #64748b;
        }

        /* ==========================================
           ROLE SELECT
        ========================================== */

        .users-role-select {
          width: 115px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 5px 7px;
          background: white;
          color: #334155;
          font-size: 10px;
          outline: none;
        }

        /* ==========================================
           ACTION BUTTONS
        ========================================== */

        .users-actions {
          display: flex;
          gap: 5px;
          align-items: center;
          flex-wrap: wrap;
        }

        .users-action-btn {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 6px;
          padding: 5px 8px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
        }

        .users-action-btn:hover {
          background: #dbeafe;
        }

        .users-action-btn.danger {
          border-color: #fecaca;
          background: #fff1f2;
          color: #b91c1c;
        }

        .users-action-btn.danger:hover {
          background: #fee2e2;
        }

        .users-action-btn.success {
          border-color: #bbf7d0;
          background: #f0fdf4;
          color: #15803d;
        }

        .users-action-btn.success:hover {
          background: #dcfce7;
        }

        .users-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ==========================================
           EMPTY / LOADING
        ========================================== */

        .users-empty {
          text-align: center;
          padding: 28px;
          color: #64748b;
          font-size: 12px;
        }

        /* ==========================================
           PAGINATION
        ========================================== */

        .users-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 13px;
          gap: 12px;
          color: #64748b;
          font-size: 11px;
        }

        .users-pagination-controls {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .users-pagination-page {
          min-width: 26px;
          height: 26px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 6px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 10px;
          font-weight: 700;
        }

        .users-pagination button {
          border: none;
          background: #2563eb;
          color: white;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 600;
        }

        .users-pagination button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* ==========================================
           MODAL
        ========================================== */

        .users-modal-overlay {
          position: fixed;
          inset: 0;
          background:
            rgba(15,23,42,0.48);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 9999;
        }

        .users-modal {
          width: min(500px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: 12px;
          padding: 18px;
          box-shadow:
            0 20px 50px
            rgba(15,23,42,0.20);
          box-sizing: border-box;
        }

        .users-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          border-bottom:
            1px solid #eef2f7;
          padding-bottom: 11px;
          margin-bottom: 13px;
        }

        .users-modal-title {
          margin: 0;
          color: #111827;
          font-size: 19px;
          font-weight: 700;
        }

        .users-modal-subtitle {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        .users-modal-close {
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: #f1f5f9;
          color: #475569;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .users-form-group {
          margin-bottom: 11px;
        }

        .users-form-group label {
          display: block;
          color: #475569;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 5px;
        }

        .users-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 15px;
          padding-top: 12px;
          border-top:
            1px solid #eef2f7;
        }

        .users-secondary-btn {
          border:
            1px solid #d1d5db;
          background: #f8fafc;
          color: #475569;
          border-radius: 6px;
          padding: 7px 11px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
        }

        .users-secondary-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* ==========================================
           RESPONSIVE
        ========================================== */

        @media (max-width: 1050px) {
          .users-toolbar {
            grid-template-columns:
              repeat(2, minmax(0,1fr));
          }
        }

        @media (max-width: 700px) {
          .users-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .users-header h1 {
            font-size: 28px;
          }

          .users-toolbar {
            grid-template-columns: 1fr;
          }

          .users-summary {
            grid-template-columns:
              repeat(2, minmax(0,1fr));
          }

          .users-pagination {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 450px) {
          .users-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ==========================================
          HEADER
      ========================================== */}

      <div className="users-header">
        <div>
          <h1>
            User Management
          </h1>

          <p>
            Create users, edit
            details, manage roles,
            and control account
            access.
          </p>
        </div>

        <button
          className="users-primary-btn"
          onClick={openAddModal}
        >
          + Add User
        </button>
      </div>

      {/* ==========================================
          MESSAGES
      ========================================== */}

      {error && (
        <div className="users-message users-error">
          {error}
        </div>
      )}

      {success && (
        <div className="users-message users-success">
          {success}
        </div>
      )}

      {/* ==========================================
          SUMMARY
      ========================================== */}

      <div className="users-summary">
        <SummaryCard
          icon="♟"
          iconClass="users-icon-blue"
          label="Total Users"
          value={total}
        />

        <SummaryCard
          icon="✓"
          iconClass="users-icon-green"
          label="Active on This Page"
          value={activeUsers}
        />

        <SummaryCard
          icon="M"
          iconClass="users-icon-blue"
          label="Members on This Page"
          value={memberCount}
        />

        <SummaryCard
          icon="L"
          iconClass="users-icon-purple"
          label="Librarians on This Page"
          value={librarianCount}
        />

        <SummaryCard
          icon="A"
          iconClass="users-icon-red"
          label="Admins on This Page"
          value={adminCount}
        />
      </div>

      {/* ==========================================
          MANAGEMENT CARD
      ========================================== */}

      <div className="users-management-card">
        <div className="users-management-header">
          <div>
            <h2 className="users-section-title">
              Users
            </h2>

            <p className="users-section-subtitle">
              Search, filter and
              manage registered
              library accounts.
            </p>
          </div>

          <span className="users-count-badge">
            {filteredUsers.length}{" "}
            Displayed
          </span>
        </div>

        {/* ========================================
            TOOLBAR
        ======================================== */}

        <div className="users-toolbar">
          <input
            className="users-input"
            type="text"
            placeholder="Search ID, username, name or email..."
            value={searchText}
            onChange={(e) =>
              setSearchText(
                e.target.value
              )
            }
          />

          <select
            className="users-select"
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(
                e.target.value
              )
            }
          >
            <option value="ALL">
              All Roles
            </option>

            <option value="ADMIN">
              Admin
            </option>

            <option value="LIBRARIAN">
              Librarian
            </option>

            <option value="MEMBER">
              Member
            </option>
          </select>

          <select
            className="users-select"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
          >
            <option value="ALL">
              All Statuses
            </option>

            <option value="ACTIVE">
              Active
            </option>

            <option value="INACTIVE">
              Inactive
            </option>
          </select>

          <select
            className="users-select"
            value={securityFilter}
            onChange={(e) =>
              setSecurityFilter(
                e.target.value
              )
            }
          >
            <option value="ALL">
              All Security
            </option>

            <option value="LOCKED">
              Locked
            </option>

            <option value="UNLOCKED">
              Unlocked
            </option>
          </select>

          <select
            className="users-select"
            value={limit}
            onChange={(e) => {
              setLimit(
                Number(
                  e.target.value
                )
              );

              setPage(1);
            }}
          >
            <option value={5}>
              5 / page
            </option>

            <option value={10}>
              10 / page
            </option>

            <option value={20}>
              20 / page
            </option>

            <option value={50}>
              50 / page
            </option>
          </select>
        </div>

        {/* ========================================
            TABLE
        ======================================== */}

        <div className="users-table-wrap">
          {loading ? (
            <div className="users-empty">
              Loading users...
            </div>
          ) : filteredUsers.length ===
            0 ? (
            <div className="users-empty">
              No users found.
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>

                  <th>User</th>

                  <th>Email</th>

                  <th>Role</th>

                  <th>Status</th>

                  <th>Last Login</th>

                  <th>Security</th>

                  <th>
                    Change Role
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map(
                  (user) => {
                    const isCurrentUser =
                      Number(
                        storedUser?.id
                      ) ===
                      Number(
                        user.id
                      );

                    return (
                      <tr
                        key={
                          user.id
                        }
                      >
                        <td className="users-id">
                          #
                          {
                            user.id
                          }
                        </td>

                        <td>
                          <div className="users-name">
                            {user.full_name ||
                              "-"}
                          </div>

                          <div className="users-username">
                            @
                            {
                              user.username
                            }

                            {isCurrentUser && (
                              <span className="users-you">
                                {" "}
                                (You)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="users-email">
                          {
                            user.email
                          }
                        </td>

                        <td>
                          <span
                            className={roleBadgeClass(
                              user.role
                            )}
                          >
                            {
                              user.role
                            }
                          </span>
                        </td>

                        <td>
                          <span
                            className={`users-status ${
                              user.is_active
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {user.is_active
                              ? "ACTIVE"
                              : "INACTIVE"}
                          </span>
                        </td>
                        {/* LAST LOGIN */}
                        <td>
                          {user.last_login
                            ? new Date(user.last_login).toLocaleString()
                            : "Never"}
                        </td>

                        {/* SECURITY */}
                        <td>
                          {(() => {
                            if (!user.locked_until) {
                              return (
                                <span className="users-status active">
                                  UNLOCKED
                                </span>
                              );
                            }

                            const lockDate = new Date(
                              user.locked_until.endsWith("Z")
                                ? user.locked_until
                                : `${user.locked_until}Z`
                            );

                            const isLocked =
                              lockDate > new Date();

                            return (
                              <span
                                className={`users-status ${
                                  isLocked
                                    ? "inactive"
                                    : "active"
                                }`}
                              >
                                {isLocked
                                  ? "LOCKED"
                                  : "UNLOCKED"}
                              </span>
                            );
                          })()}
                        </td>

                        <td>
                          <select
                            className="users-role-select"
                            value={
                              user.role_id
                            }
                            disabled={
                              actionLoading
                            }
                            onChange={(
                              e
                            ) =>
                              changeRole(
                                user,
                                e
                                  .target
                                  .value
                              )
                            }
                          >
                            {ROLE_OPTIONS.map(
                              (
                                role
                              ) => (
                                <option
                                  key={
                                    role.id
                                  }
                                  value={
                                    role.id
                                  }
                                >
                                  {
                                    role.name
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </td>

                        <td>
                          <div className="users-actions">
                            <button
                              className="users-action-btn"
                              disabled={
                                actionLoading
                              }
                              onClick={() =>
                                openEditModal(
                                  user
                                )
                              }
                            >
                              Edit
                            </button>

                            {user.locked_until &&
                              new Date(
                                user.locked_until.endsWith("Z")
                                  ? user.locked_until
                                  : `${user.locked_until}Z`
                              ) > new Date() && (
                                <button
                                  className="users-action-btn success"
                                  disabled={
                                    actionLoading
                                  }
                                  onClick={() =>
                                    unlockUser(user)
                                  }
                                >
                                  Unlock
                                </button>
                              )}

                            <button
                              className={`users-action-btn ${
                                user.is_active
                                  ? "danger"
                                  : "success"
                              }`}
                              disabled={
                                actionLoading
                              }
                              onClick={() =>
                                toggleStatus(
                                  user
                                )
                              }
                            >
                              {user.is_active
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ========================================
            PAGINATION
        ======================================== */}

        <div className="users-pagination">
          <div>
            Showing page {page} of{" "}
            {totalPages} · {total}{" "}
            total users
          </div>

          <div className="users-pagination-controls">
            <button
              disabled={
                page <= 1 ||
                loading
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      1,
                      current -
                        1
                    )
                )
              }
            >
              ← Previous
            </button>

            <span className="users-pagination-page">
              {page}
            </span>

            <button
              disabled={
                page >=
                  totalPages ||
                loading
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.min(
                      totalPages,
                      current +
                        1
                    )
                )
              }
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================
          ADD USER MODAL
      ========================================== */}

      {showAddModal && (
        <div
          className="users-modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              setShowAddModal(
                false
              );
            }
          }}
        >
          <form
            className="users-modal"
            onSubmit={createUser}
          >
            <div className="users-modal-header">
              <div>
                <h2 className="users-modal-title">
                  Add User
                </h2>

                <p className="users-modal-subtitle">
                  Create a new
                  library account.
                </p>
              </div>

              <button
                type="button"
                className="users-modal-close"
                onClick={() =>
                  setShowAddModal(
                    false
                  )
                }
                disabled={
                  actionLoading
                }
              >
                ×
              </button>
            </div>

            <div className="users-form-group">
              <label>
                Username
              </label>

              <input
                className="users-input"
                value={
                  addForm.username
                }
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    username:
                      e.target
                        .value,
                  })
                }
                placeholder="Enter username"
                required
              />
            </div>

            <div className="users-form-group">
              <label>
                Full Name
              </label>

              <input
                className="users-input"
                value={
                  addForm.full_name
                }
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    full_name:
                      e.target
                        .value,
                  })
                }
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="users-form-group">
              <label>
                Email
              </label>

              <input
                className="users-input"
                type="email"
                value={
                  addForm.email
                }
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    email:
                      e.target
                        .value,
                  })
                }
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="users-form-group">
              <label>
                Password
              </label>

              <input
                className="users-input"
                type="password"
                value={
                  addForm.password
                }
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    password:
                      e.target
                        .value,
                  })
                }
                placeholder="Enter password"
                required
              />
            </div>

            <div className="users-form-group">
              <label>
                Role
              </label>

              <select
                className="users-select"
                value={
                  addForm.role_name
                }
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    role_name:
                      e.target
                        .value,
                  })
                }
              >
                <option value="MEMBER">
                  Member
                </option>

                <option value="LIBRARIAN">
                  Librarian
                </option>

                <option value="ADMIN">
                  Admin
                </option>
              </select>
            </div>

            <div className="users-modal-actions">
              <button
                type="button"
                className="users-secondary-btn"
                onClick={() =>
                  setShowAddModal(
                    false
                  )
                }
                disabled={
                  actionLoading
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="users-primary-btn"
                disabled={
                  actionLoading
                }
              >
                {actionLoading
                  ? "Creating..."
                  : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==========================================
          EDIT USER MODAL
      ========================================== */}

      {showEditModal &&
        editingUser && (
          <div
            className="users-modal-overlay"
            onMouseDown={(
              e
            ) => {
              if (
                e.target ===
                e.currentTarget
              ) {
                setShowEditModal(
                  false
                );

                setEditingUser(
                  null
                );
              }
            }}
          >
            <form
              className="users-modal"
              onSubmit={
                updateUser
              }
            >
              <div className="users-modal-header">
                <div>
                  <h2 className="users-modal-title">
                    Edit User
                  </h2>

                  <p className="users-modal-subtitle">
                    Update account
                    information for{" "}
                    <strong>
                      {
                        editingUser.username
                      }
                    </strong>
                    .
                  </p>
                </div>

                <button
                  type="button"
                  className="users-modal-close"
                  onClick={() => {
                    setShowEditModal(
                      false
                    );

                    setEditingUser(
                      null
                    );
                  }}
                  disabled={
                    actionLoading
                  }
                >
                  ×
                </button>
              </div>

              <div className="users-form-group">
                <label>
                  Username
                </label>

                <input
                  className="users-input"
                  value={
                    editForm.username
                  }
                  onChange={(
                    e
                  ) =>
                    setEditForm(
                      {
                        ...editForm,

                        username:
                          e
                            .target
                            .value,
                      }
                    )
                  }
                  required
                />
              </div>

              <div className="users-form-group">
                <label>
                  Full Name
                </label>

                <input
                  className="users-input"
                  value={
                    editForm.full_name
                  }
                  onChange={(
                    e
                  ) =>
                    setEditForm(
                      {
                        ...editForm,

                        full_name:
                          e
                            .target
                            .value,
                      }
                    )
                  }
                  required
                />
              </div>

              <div className="users-form-group">
                <label>
                  Email
                </label>

                <input
                  className="users-input"
                  type="email"
                  value={
                    editForm.email
                  }
                  onChange={(
                    e
                  ) =>
                    setEditForm(
                      {
                        ...editForm,

                        email:
                          e
                            .target
                            .value,
                      }
                    )
                  }
                  required
                />
              </div>

              <div className="users-modal-actions">
                <button
                  type="button"
                  className="users-secondary-btn"
                  onClick={() => {
                    setShowEditModal(
                      false
                    );

                    setEditingUser(
                      null
                    );
                  }}
                  disabled={
                    actionLoading
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="users-primary-btn"
                  disabled={
                    actionLoading
                  }
                >
                  {actionLoading
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}
    </div>
  );
}

// ==================================================
// SUMMARY CARD COMPONENT
// ==================================================

function SummaryCard({
  icon,
  iconClass,
  label,
  value,
}) {
  return (
    <div className="users-card">
      <div
        className={`users-card-icon ${iconClass}`}
      >
        {icon}
      </div>

      <div>
        <div className="users-card-label">
          {label}
        </div>

        <div className="users-card-value">
          {value}
        </div>
      </div>
    </div>
  );
}
