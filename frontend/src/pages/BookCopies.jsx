import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

import { API_BASE_URL } from "../config";

function BookCopies() {
  const [searchParams] = useSearchParams();
  const bookId = searchParams.get("book_id");

  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const loadCopies = async () => {
    try {
      setLoading(true);
      setError("");

      const endpoint = bookId
        ? `${API_BASE_URL}/book-copies/book/${bookId}`
        : `${API_BASE_URL}/book-copies/`;

      const response = await axios.get(endpoint, {
        headers,
      });

      setCopies(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load physical book copies."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCopies();
  }, [bookId]);

  const downloadLabel = async (copy, type) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/book-copies/${copy.id}/${type}`,
        {
          headers,
          responseType: "blob",
        }
      );

      const url = URL.createObjectURL(
        response.data
      );

      const link = document.createElement("a");
      link.href = url;
      link.download =
        `${copy.accession_number}_${type}.png`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        err.response?.data?.detail ||
          `Unable to download ${type}.`
      );
    }
  };

  const updateShelf = async (copy) => {
    const shelfLocation = window.prompt(
      "Enter shelf location:",
      copy.shelf_location || ""
    );

    if (shelfLocation === null) {
      return;
    }

    try {
      await axios.patch(
        `${API_BASE_URL}/book-copies/${copy.id}/shelf-location`,
        null,
        {
          headers,
          params: {
            shelf_location: shelfLocation.trim(),
          },
        }
      );

      await loadCopies();
    } catch (err) {
      alert(
        err.response?.data?.detail ||
          "Unable to update shelf location."
      );
    }
  };

  if (loading) {
    return <p>Loading physical copies...</p>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Physical Book Copies
          </h1>

          <p style={styles.subtitle}>
            Manage accession numbers, shelf locations,
            QR codes and barcodes.
          </p>
        </div>

        <button
          onClick={loadCopies}
          style={styles.refreshButton}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.count}>
          {copies.length} physical copy/copies
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>
                Accession Number
              </th>
              <th style={styles.th}>Book ID</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>
                Shelf Location
              </th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {copies.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  style={styles.empty}
                >
                  No physical copies found.
                </td>
              </tr>
            ) : (
              copies.map((copy) => (
                <tr key={copy.id}>
                  <td style={styles.td}>
                    {copy.id}
                  </td>

                  <td style={styles.accession}>
                    {copy.accession_number}
                  </td>

                  <td style={styles.td}>
                    {copy.book_id}
                  </td>

                  <td style={styles.td}>
                    <span style={styles.status}>
                      {copy.status}
                    </span>
                  </td>

                  <td style={styles.td}>
                    {copy.shelf_location || "Not assigned"}
                  </td>

                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        style={styles.qrButton}
                        onClick={() =>
                          downloadLabel(copy, "qr")
                        }
                      >
                        QR
                      </button>

                      <button
                        style={styles.barcodeButton}
                        onClick={() =>
                          downloadLabel(
                            copy,
                            "barcode"
                          )
                        }
                      >
                        Barcode
                      </button>

                      <button
                        style={styles.shelfButton}
                        onClick={() =>
                          updateShelf(copy)
                        }
                      >
                        Shelf
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  page: {
    width: "100%",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "22px",
  },
  title: {
    margin: 0,
    fontSize: "34px",
    color: "#111827",
  },
  subtitle: {
    marginTop: "6px",
    color: "#64748b",
  },
  refreshButton: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
  },
  error: {
    padding: "12px",
    marginBottom: "15px",
    background: "#fee2e2",
    color: "#b91c1c",
    borderRadius: "8px",
  },
  card: {
    padding: "20px",
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
  },
  count: {
    marginBottom: "15px",
    fontWeight: 700,
    color: "#334155",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "12px",
    textAlign: "left",
    background: "#f8fafc",
    borderBottom: "1px solid #dbe2ea",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #eef2f7",
  },
  accession: {
    padding: "12px",
    borderBottom: "1px solid #eef2f7",
    fontWeight: 700,
    color: "#1d4ed8",
  },
  status: {
    padding: "5px 9px",
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "12px",
    fontSize: "12px",
  },
  actions: {
    display: "flex",
    gap: "7px",
  },
  qrButton: {
    padding: "7px 10px",
    border: "none",
    borderRadius: "6px",
    background: "#7c3aed",
    color: "white",
    cursor: "pointer",
  },
  barcodeButton: {
    padding: "7px 10px",
    border: "none",
    borderRadius: "6px",
    background: "#0891b2",
    color: "white",
    cursor: "pointer",
  },
  shelfButton: {
    padding: "7px 10px",
    border: "none",
    borderRadius: "6px",
    background: "#d97706",
    color: "white",
    cursor: "pointer",
  },
  empty: {
    padding: "30px",
    textAlign: "center",
    color: "#64748b",
  },
};

export default BookCopies;