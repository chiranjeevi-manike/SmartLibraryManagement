import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const navigate = useNavigate();

  // ==================================================
  // TOKEN / HEADERS
  // ==================================================

  const getToken = () => {
    return localStorage.getItem("token");
  };

  const getHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
  });

  // ==================================================
  // AUTH ERROR
  // ==================================================

  const handleAuthError = (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role_id");

      navigate("/");
      return true;
    }

    return false;
  };

  // ==================================================
  // FETCH NOTIFICATIONS
  // ==================================================

  const fetchNotifications = async () => {
    try {
      setError("");

      if (!getToken()) {
        navigate("/");
        return;
      }

      const response = await axios.get(
        "http://127.0.0.1:8000/notifications/me",
        {
          headers: getHeaders(),
        }
      );

      let data = [];

      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (
        Array.isArray(response.data.notifications)
      ) {
        data = response.data.notifications;
      } else if (
        Array.isArray(response.data.items)
      ) {
        data = response.data.items;
      } else if (
        Array.isArray(response.data.results)
      ) {
        data = response.data.results;
      }

      setNotifications(data);
    } catch (error) {
      console.error(
        "Notifications Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Unable to load notifications."
      );
    }
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        await fetchNotifications();
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================================================
  // MARK ONE AS READ
  // ==================================================

  const handleMarkRead = async (notification) => {
    if (notification.is_read) {
      return;
    }

    try {
      setProcessingId(notification.id);

      await axios.put(
        `http://127.0.0.1:8000/notifications/${notification.id}/read`,
        {},
        {
          headers: getHeaders(),
        }
      );

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true,
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Mark Read Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Unable to mark notification as read."
      );
    } finally {
      setProcessingId(null);
    }
  };

  // ==================================================
  // MARK ALL AS READ
  // ==================================================

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      return;
    }

    try {
      setMarkingAll(true);

      await axios.put(
        "http://127.0.0.1:8000/notifications/me/read-all",
        {},
        {
          headers: getHeaders(),
        }
      );

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
        }))
      );
    } catch (error) {
      console.error(
        "Mark All Read Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Unable to mark all notifications as read."
      );
    } finally {
      setMarkingAll(false);
    }
  };

  // ==================================================
  // FORMAT DATE
  // ==================================================

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  // ==================================================
  // NOTIFICATION TYPE
  // ==================================================

  const getNotificationType = (notification) => {
    return (
      notification.notification_type ||
      notification.type ||
      "NOTIFICATION"
    );
  };

  // ==================================================
  // TYPE LABEL
  // ==================================================

  const getTypeLabel = (type) => {
    switch (type) {
      case "RESERVATION_READY":
        return "Reservation Ready";

      case "RESERVATION_EXPIRED":
        return "Reservation Expired";

      case "DUE_REMINDER":
        return "Due Reminder";

      case "OVERDUE":
        return "Overdue";

      case "FINE_GENERATED":
        return "Fine Generated";

      case "FINE_PAID":
        return "Fine Paid";

      case "RENEWAL_SUCCESS":
        return "Renewal";

      default:
        return type
          .replaceAll("_", " ")
          .toLowerCase()
          .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
          );
    }
  };

  // ==================================================
  // TYPE STYLE
  // ==================================================

  const getTypeStyle = (type) => {
    switch (type) {
      case "RESERVATION_READY":
        return {
          ...typeBadgeStyle,
          backgroundColor: "#dcfce7",
          color: "#166534",
        };

      case "RESERVATION_EXPIRED":
        return {
          ...typeBadgeStyle,
          backgroundColor: "#f1f5f9",
          color: "#475569",
        };

      case "DUE_REMINDER":
        return {
          ...typeBadgeStyle,
          backgroundColor: "#fef3c7",
          color: "#92400e",
        };

      case "OVERDUE":
        return {
          ...typeBadgeStyle,
          backgroundColor: "#fee2e2",
          color: "#991b1b",
        };

      case "FINE_GENERATED":
        return {
          ...typeBadgeStyle,
          backgroundColor: "#ffedd5",
          color: "#9a3412",
        };

      case "FINE_PAID":
        return {
          ...typeBadgeStyle,
          backgroundColor: "#dcfce7",
          color: "#166534",
        };

      case "RENEWAL_SUCCESS":
        return {
          ...typeBadgeStyle,
          backgroundColor: "#dbeafe",
          color: "#1d4ed8",
        };

      default:
        return typeBadgeStyle;
    }
  };

  // ==================================================
  // TYPE ICON
  // ==================================================

  const getTypeIcon = (type) => {
    switch (type) {
      case "RESERVATION_READY":
        return "✓";

      case "RESERVATION_EXPIRED":
        return "×";

      case "DUE_REMINDER":
        return "◷";

      case "OVERDUE":
        return "!";

      case "FINE_GENERATED":
        return "₹";

      case "FINE_PAID":
        return "✓";

      case "RENEWAL_SUCCESS":
        return "↻";

      default:
        return "i";
    }
  };

  const getIconStyle = (type) => {
    switch (type) {
      case "RESERVATION_READY":
      case "FINE_PAID":
        return {
          ...notificationIconStyle,
          backgroundColor: "#dcfce7",
          color: "#15803d",
        };

      case "OVERDUE":
        return {
          ...notificationIconStyle,
          backgroundColor: "#fee2e2",
          color: "#dc2626",
        };

      case "FINE_GENERATED":
        return {
          ...notificationIconStyle,
          backgroundColor: "#ffedd5",
          color: "#ea580c",
        };

      case "DUE_REMINDER":
        return {
          ...notificationIconStyle,
          backgroundColor: "#fef3c7",
          color: "#d97706",
        };

      case "RENEWAL_SUCCESS":
        return {
          ...notificationIconStyle,
          backgroundColor: "#dbeafe",
          color: "#2563eb",
        };

      default:
        return {
          ...notificationIconStyle,
          backgroundColor: "#f1f5f9",
          color: "#64748b",
        };
    }
  };

  // ==================================================
  // COUNTS
  // ==================================================

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const readCount =
    notifications.length - unreadCount;

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <div style={loadingStyle}>
        Loading notifications...
      </div>
    );
  }

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <div style={pageStyle}>
      {/* HEADER */}

      <div style={headerContainerStyle}>
        <div>
          <h1 style={pageTitleStyle}>
            Notifications
          </h1>

          <p style={subtitleStyle}>
            View important library updates,
            reminders and account activity.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <span style={unreadBadgeStyle}>
            {unreadCount} Unread
          </span>

          <button
            onClick={handleMarkAllRead}
            disabled={
              unreadCount === 0 ||
              markingAll
            }
            style={{
              ...markAllButtonStyle,
              opacity:
                unreadCount === 0 ||
                markingAll
                  ? 0.55
                  : 1,
              cursor:
                unreadCount === 0 ||
                markingAll
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {markingAll
              ? "Processing..."
              : "Mark All as Read"}
          </button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <div style={summaryGridStyle}>
        <SummaryCard
          title="Total Notifications"
          value={notifications.length}
          icon="▤"
          background="#dbeafe"
        />

        <SummaryCard
          title="Unread"
          value={unreadCount}
          icon="●"
          background="#fef3c7"
          valueColor={
            unreadCount > 0
              ? "#d97706"
              : "#0f172a"
          }
        />

        <SummaryCard
          title="Read"
          value={readCount}
          icon="✓"
          background="#dcfce7"
        />
      </div>

      {/* NOTIFICATIONS CARD */}

      <div style={recordsCardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>
              My Notifications
            </h2>

            <p style={sectionSubtitleStyle}>
              Recent library activity and
              important reminders.
            </p>
          </div>

          <span style={recordCountStyle}>
            {notifications.length} Record(s)
          </span>
        </div>

        {notifications.length === 0 ? (
          <div style={emptyStyle}>
            <div style={emptyIconStyle}>
              ✓
            </div>

            <div style={emptyTitleStyle}>
              You're all caught up
            </div>

            <div style={emptyTextStyle}>
              No notifications found.
            </div>
          </div>
        ) : (
          <div style={notificationListStyle}>
            {notifications.map(
              (notification) => {
                const type =
                  getNotificationType(
                    notification
                  );

                return (
                  <div
                    key={notification.id}
                    style={{
                      ...notificationCardStyle,

                      backgroundColor:
                        notification.is_read
                          ? "#ffffff"
                          : "#f8fbff",

                      borderColor:
                        notification.is_read
                          ? "#e5e7eb"
                          : "#bfdbfe",
                    }}
                  >
                    {/* ICON */}

                    <div
                      style={getIconStyle(
                        type
                      )}
                    >
                      {getTypeIcon(type)}
                    </div>

                    {/* CONTENT */}

                    <div
                      style={
                        notificationContentStyle
                      }
                    >
                      <div
                        style={
                          notificationTopStyle
                        }
                      >
                        <span
                          style={getTypeStyle(
                            type
                          )}
                        >
                          {getTypeLabel(type)}
                        </span>

                        {!notification.is_read && (
                          <span
                            style={
                              newBadgeStyle
                            }
                          >
                            NEW
                          </span>
                        )}
                      </div>

                      <p style={messageStyle}>
                        {notification.message ||
                          "Library notification"}
                      </p>

                      <div style={dateStyle}>
                        {formatDate(
                          notification.created_at
                        )}
                      </div>
                    </div>

                    {/* ACTION */}

                    <div style={actionStyle}>
                      {!notification.is_read ? (
                        <button
                          onClick={() =>
                            handleMarkRead(
                              notification
                            )
                          }
                          disabled={
                            processingId ===
                            notification.id
                          }
                          style={{
                            ...markReadButtonStyle,
                            opacity:
                              processingId ===
                              notification.id
                                ? 0.6
                                : 1,
                          }}
                        >
                          {processingId ===
                          notification.id
                            ? "Processing..."
                            : "Mark Read"}
                        </button>
                      ) : (
                        <span
                          style={
                            readTextStyle
                          }
                        >
                          ✓ Read
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================================================
// SUMMARY CARD
// ==================================================

function SummaryCard({
  title,
  value,
  icon,
  background,
  valueColor = "#0f172a",
}) {
  return (
    <div style={summaryCardStyle}>
      <div
        style={{
          ...summaryIconStyle,
          backgroundColor: background,
        }}
      >
        {icon}
      </div>

      <div>
        <div style={summaryLabelStyle}>
          {title}
        </div>

        <div
          style={{
            ...summaryValueStyle,
            color: valueColor,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ==================================================
// STYLES
// ==================================================

const pageStyle = {
  width: "100%",
  boxSizing: "border-box",
};

// HEADER

const headerContainerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  flexWrap: "wrap",
  marginBottom: "22px",
};

const pageTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "34px",
  fontWeight: "700",
};

const subtitleStyle = {
  margin: "5px 0 0 0",
  color: "#64748b",
  fontSize: "14px",
};

const headerActionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  flexWrap: "wrap",
};

const unreadBadgeStyle = {
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
  padding: "5px 10px",
  borderRadius: "16px",
  fontWeight: "700",
  fontSize: "11px",
};

const markAllButtonStyle = {
  padding: "8px 12px",
  border: "none",
  borderRadius: "7px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontWeight: "600",
  fontSize: "12px",
};

// SUMMARY

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "22px",
};

const summaryCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "13px",
  backgroundColor: "#ffffff",
  padding: "15px 17px",
  borderRadius: "11px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const summaryIconStyle = {
  width: "44px",
  height: "44px",
  minWidth: "44px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  fontSize: "18px",
  fontWeight: "700",
};

const summaryLabelStyle = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "600",
  marginBottom: "4px",
};

const summaryValueStyle = {
  fontSize: "23px",
  fontWeight: "700",
  lineHeight: "1.1",
};

// RECORDS CARD

const recordsCardStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "18px",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  marginBottom: "14px",
};

const sectionTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
  fontWeight: "700",
};

const sectionSubtitleStyle = {
  margin: "4px 0 0 0",
  color: "#64748b",
  fontSize: "12px",
};

const recordCountStyle = {
  backgroundColor: "#f1f5f9",
  color: "#475569",
  padding: "5px 10px",
  borderRadius: "16px",
  fontSize: "11px",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

// NOTIFICATION LIST

const notificationListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  borderTop: "1px solid #eef2f7",
  paddingTop: "12px",
};

const notificationCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 13px",
  borderRadius: "9px",
  border: "1px solid #e5e7eb",
  transition:
    "background-color 0.2s ease",
};

const notificationIconStyle = {
  width: "36px",
  height: "36px",
  minWidth: "36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "9px",
  fontSize: "15px",
  fontWeight: "700",
};

const notificationContentStyle = {
  flex: 1,
  minWidth: 0,
};

const notificationTopStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexWrap: "wrap",
};

const typeBadgeStyle = {
  display: "inline-block",
  padding: "3px 7px",
  borderRadius: "11px",
  backgroundColor: "#f1f5f9",
  color: "#475569",
  fontSize: "10px",
  fontWeight: "700",
};

const newBadgeStyle = {
  backgroundColor: "#2563eb",
  color: "#ffffff",
  padding: "2px 6px",
  borderRadius: "9px",
  fontSize: "9px",
  fontWeight: "700",
};

const messageStyle = {
  margin: "6px 0 4px 0",
  color: "#334155",
  fontSize: "13px",
  lineHeight: "1.45",
};

const dateStyle = {
  color: "#94a3b8",
  fontSize: "11px",
};

const actionStyle = {
  minWidth: "88px",
  textAlign: "right",
};

const markReadButtonStyle = {
  padding: "6px 9px",
  border: "none",
  borderRadius: "6px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "10px",
  whiteSpace: "nowrap",
};

const readTextStyle = {
  color: "#16a34a",
  fontWeight: "700",
  fontSize: "11px",
  whiteSpace: "nowrap",
};

// EMPTY

const emptyStyle = {
  padding: "32px 20px",
  textAlign: "center",
  borderTop: "1px solid #eef2f7",
};

const emptyIconStyle = {
  width: "40px",
  height: "40px",
  margin: "0 auto 9px auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  backgroundColor: "#dcfce7",
  color: "#16a34a",
  fontWeight: "700",
};

const emptyTitleStyle = {
  color: "#334155",
  fontSize: "14px",
  fontWeight: "700",
};

const emptyTextStyle = {
  color: "#94a3b8",
  fontSize: "12px",
  marginTop: "3px",
};

// MESSAGES

const errorStyle = {
  marginBottom: "18px",
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  padding: "10px 12px",
  borderRadius: "7px",
  border: "1px solid #fecaca",
  fontSize: "13px",
};

const loadingStyle = {
  padding: "35px",
  textAlign: "center",
  color: "#64748b",
  fontSize: "14px",
};

export default Notifications;