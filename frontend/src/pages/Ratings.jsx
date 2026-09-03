import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "https://smartlibrarymanagement-production.up.railway.app";

function Ratings() {
  const navigate = useNavigate();

  // ==================================================
  // STATE
  // ==================================================

  const [books, setBooks] = useState([]);
  const [myRatings, setMyRatings] = useState([]);
  const [bookRatings, setBookRatings] = useState(null);

  const [selectedBookId, setSelectedBookId] = useState("");
  const [ratingValue, setRatingValue] = useState(5);
  const [review, setReview] = useState("");

  const [viewBookId, setViewBookId] = useState("");
  const [editingRatingId, setEditingRatingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==================================================
  // CURRENT USER
  // ==================================================

  let storedUser = {};

  try {
    storedUser = JSON.parse(
      localStorage.getItem("user") || "{}"
    );
  } catch {
    storedUser = {};
  }

  const roleId = Number(storedUser.role_id);
  const isMember = roleId === 4;

  // ==================================================
  // AUTH
  // ==================================================

  const getToken = () => localStorage.getItem("token");

  const getHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
  });

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
  // FETCH BOOKS
  // ==================================================

  const fetchBooks = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/books/`,
        {
          headers: getHeaders(),
        }
      );

      let data = [];

      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (Array.isArray(response.data?.books)) {
        data = response.data.books;
      } else if (Array.isArray(response.data?.items)) {
        data = response.data.items;
      } else if (Array.isArray(response.data?.results)) {
        data = response.data.results;
      }

      setBooks(data);
    } catch (error) {
      console.error("Books Error:", error);

      if (handleAuthError(error)) {
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Unable to load books."
      );
    }
  };

  // ==================================================
  // FETCH MY RATINGS
  // ==================================================

  const fetchMyRatings = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/ratings/me`,
        {
          headers: getHeaders(),
        }
      );

      setMyRatings(
        response.data?.ratings || []
      );
    } catch (error) {
      console.error("My Ratings Error:", error);

      if (handleAuthError(error)) {
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Unable to load your ratings."
      );
    }
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    const loadData = async () => {
      if (!isMember) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        await Promise.all([
          fetchBooks(),
          fetchMyRatings(),
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================================================
  // BOOK TITLE
  // ==================================================

  const getBookTitle = (bookId) => {
    const book = books.find(
      (item) =>
        Number(item.id) === Number(bookId)
    );

    return book
      ? book.title
      : `Book ID ${bookId}`;
  };

  // ==================================================
  // RESET FORM
  // ==================================================

  const resetForm = () => {
    setEditingRatingId(null);
    setSelectedBookId("");
    setRatingValue(5);
    setReview("");
  };

  // ==================================================
  // CREATE / UPDATE RATING
  // ==================================================

  const handleSubmitRating = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedBookId) {
      setError("Please select a book.");
      return;
    }

    const numericRating = Number(ratingValue);

    if (numericRating < 1 || numericRating > 5) {
      setError("Rating must be between 1 and 5.");
      return;
    }

    try {
      setSaving(true);

      if (editingRatingId) {
        await axios.put(
          `${API_URL}/ratings/${editingRatingId}`,
          {
            rating: numericRating,
            review: review.trim(),
          },
          {
            headers: getHeaders(),
          }
        );

        setSuccess(
          "Rating updated successfully."
        );
      } else {
        await axios.post(
          `${API_URL}/ratings/`,
          {
            book_id: Number(selectedBookId),
            rating: numericRating,
            review: review.trim(),
          },
          {
            headers: getHeaders(),
          }
        );

        setSuccess(
          "Rating submitted successfully."
        );
      }

      const ratedBookId = selectedBookId;

      resetForm();

      await fetchMyRatings();

      if (
        viewBookId &&
        Number(viewBookId) === Number(ratedBookId)
      ) {
        await fetchBookRatings(viewBookId);
      }
    } catch (error) {
      console.error("Save Rating Error:", error);

      if (handleAuthError(error)) {
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Unable to save rating."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // EDIT
  // ==================================================

  const handleEditRating = (rating) => {
    setError("");
    setSuccess("");

    setEditingRatingId(rating.id);
    setSelectedBookId(String(rating.book_id));
    setRatingValue(Number(rating.rating));
    setReview(rating.review || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ==================================================
  // DELETE
  // ==================================================

  const handleDeleteRating = async (rating) => {
    const confirmed = window.confirm(
      `Delete your rating for "${getBookTitle(
        rating.book_id
      )}"?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await axios.delete(
        `${API_URL}/ratings/${rating.id}`,
        {
          headers: getHeaders(),
        }
      );

      if (editingRatingId === rating.id) {
        resetForm();
      }

      setSuccess(
        "Rating deleted successfully."
      );

      await fetchMyRatings();

      if (
        viewBookId &&
        Number(viewBookId) === Number(rating.book_id)
      ) {
        await fetchBookRatings(viewBookId);
      }
    } catch (error) {
      console.error("Delete Rating Error:", error);

      if (handleAuthError(error)) {
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Unable to delete rating."
      );
    }
  };

  // ==================================================
  // FETCH RATINGS FOR BOOK
  // ==================================================

  const fetchBookRatings = async (bookId) => {
    if (!bookId) {
      setBookRatings(null);
      return;
    }

    try {
      setViewLoading(true);

      const response = await axios.get(
        `${API_URL}/ratings/book/${bookId}`
      );

      setBookRatings(response.data);
    } catch (error) {
      console.error("Book Ratings Error:", error);

      setError(
        error.response?.data?.detail ||
          "Unable to load book ratings."
      );

      setBookRatings(null);
    } finally {
      setViewLoading(false);
    }
  };

  const handleViewBookRatings = async (e) => {
    e.preventDefault();

    setError("");

    if (!viewBookId) {
      setError("Please select a book.");
      return;
    }

    await fetchBookRatings(viewBookId);
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
  // STARS
  // ==================================================

  const renderStars = (value, size = 14) => {
    const numericValue = Math.max(
      0,
      Math.min(5, Math.round(Number(value || 0)))
    );

    return (
      <span
        style={{
          ...starsStyle,
          fontSize: `${size}px`,
        }}
      >
        {"★".repeat(numericValue)}

        <span style={emptyStarsStyle}>
          {"★".repeat(5 - numericValue)}
        </span>
      </span>
    );
  };

  // ==================================================
  // RATEABLE BOOKS
  // ==================================================

  const ratedBookIds = myRatings.map(
    (rating) => Number(rating.book_id)
  );

  const rateableBooks = books.filter((book) => {
    if (
      editingRatingId &&
      Number(book.id) === Number(selectedBookId)
    ) {
      return true;
    }

    return !ratedBookIds.includes(
      Number(book.id)
    );
  });

  // ==================================================
  // SUMMARY
  // ==================================================

  const averageMyRating =
    myRatings.length > 0
      ? myRatings.reduce(
          (sum, item) =>
            sum + Number(item.rating || 0),
          0
        ) / myRatings.length
      : 0;

  const writtenReviews = myRatings.filter(
    (item) =>
      String(item.review || "").trim().length > 0
  ).length;

  // ==================================================
  // ACCESS
  // ==================================================

  if (!isMember) {
    return (
      <div style={accessDeniedStyle}>
        <div style={accessIconStyle}>!</div>

        <div>
          <h2 style={accessTitleStyle}>
            Access Denied
          </h2>

          <p style={accessTextStyle}>
            Book ratings are available from the
            Member interface.
          </p>
        </div>
      </div>
    );
  }

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <div style={loadingCardStyle}>
        <div style={loadingIconStyle}>★</div>

        <div style={loadingTitleStyle}>
          Loading Ratings
        </div>

        <div style={loadingTextStyle}>
          Preparing your ratings and reviews.
        </div>
      </div>
    );
  }

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <div style={pageStyle}>
      {/* HEADER */}

      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>
            Ratings
          </h1>

          <p style={subtitleStyle}>
            Rate library books, manage your reviews
            and explore feedback from other readers.
          </p>
        </div>

        <button
          onClick={() => navigate("/books")}
          style={browseButtonStyle}
        >
          Browse Books
        </button>
      </div>

      {/* MESSAGES */}

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

      {/* SUMMARY */}

      <div style={summaryGridStyle}>
        <SummaryCard
          icon="★"
          background="#dbeafe"
          label="My Ratings"
          value={myRatings.length}
        />

        <SummaryCard
          icon="☆"
          background="#fef3c7"
          label="Average Rating"
          value={
            myRatings.length > 0
              ? `${averageMyRating.toFixed(1)}/5`
              : "0/5"
          }
        />

        <SummaryCard
          icon="✎"
          background="#dcfce7"
          label="Written Reviews"
          value={writtenReviews}
        />

        <SummaryCard
          icon="▤"
          background="#ede9fe"
          label="Books Available to Rate"
          value={rateableBooks.length}
        />
      </div>

      {/* RATE BOOK */}

      <div style={formCardStyle}>
        <div style={cardHeaderStyle}>
          <div>
            <h2 style={cardTitleStyle}>
              {editingRatingId
                ? "Edit Rating"
                : "Rate a Book"}
            </h2>

            <p style={cardSubtitleStyle}>
              {editingRatingId
                ? "Update your rating or written review."
                : "Share your experience with a library book."}
            </p>
          </div>

          {editingRatingId && (
            <span style={editingBadgeStyle}>
              Editing Rating #{editingRatingId}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmitRating}>
          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>
                Book
              </label>

              <select
                value={selectedBookId}
                onChange={(e) =>
                  setSelectedBookId(e.target.value)
                }
                disabled={Boolean(editingRatingId)}
                style={{
                  ...inputStyle,
                  backgroundColor: editingRatingId
                    ? "#f8fafc"
                    : "#ffffff",
                }}
                required
              >
                <option value="">
                  Select Book
                </option>

                {rateableBooks.map((book) => (
                  <option
                    key={book.id}
                    value={book.id}
                  >
                    {book.title}
                  </option>
                ))}
              </select>

              {!editingRatingId &&
                rateableBooks.length === 0 && (
                  <p style={helperTextStyle}>
                    You have already rated all currently
                    listed books.
                  </p>
                )}
            </div>

            <div>
              <label style={labelStyle}>
                Rating
              </label>

              <select
                value={ratingValue}
                onChange={(e) =>
                  setRatingValue(
                    Number(e.target.value)
                  )
                }
                style={inputStyle}
              >
                <option value={5}>
                  ★★★★★ — Excellent
                </option>

                <option value={4}>
                  ★★★★☆ — Very Good
                </option>

                <option value={3}>
                  ★★★☆☆ — Good
                </option>

                <option value={2}>
                  ★★☆☆☆ — Fair
                </option>

                <option value={1}>
                  ★☆☆☆☆ — Poor
                </option>
              </select>

              <div style={ratingPreviewStyle}>
                {renderStars(ratingValue, 16)}

                <span style={ratingPreviewTextStyle}>
                  {ratingValue}/5
                </span>
              </div>
            </div>
          </div>

          <div style={reviewSectionStyle}>
            <label style={labelStyle}>
              Review
            </label>

            <textarea
              value={review}
              onChange={(e) =>
                setReview(e.target.value)
              }
              rows="3"
              placeholder="Write your review..."
              style={textareaStyle}
            />

            <div style={reviewHelperStyle}>
              Optional — share what you liked or disliked
              about the book.
            </div>
          </div>

          <div style={formActionsStyle}>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...saveButtonStyle,
                opacity: saving ? 0.6 : 1,
                cursor: saving
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {saving
                ? "Saving..."
                : editingRatingId
                ? "Update Rating"
                : "Submit Rating"}
            </button>

            {editingRatingId && (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                style={cancelButtonStyle}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* MY RATINGS */}

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>
              My Ratings
            </h2>

            <p style={sectionSubtitleStyle}>
              Ratings and reviews you have submitted.
            </p>
          </div>

          <span style={countStyle}>
            {myRatings.length} Rating
            {myRatings.length === 1 ? "" : "s"}
          </span>
        </div>

        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={headerRowStyle}>
                <th style={headerStyle}>
                  Book
                </th>

                <th style={headerStyle}>
                  Rating
                </th>

                <th style={headerStyle}>
                  Review
                </th>

                <th style={headerStyle}>
                  Created
                </th>

                <th style={headerStyle}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {myRatings.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={emptyTableStyle}
                  >
                    You have not rated any books yet.
                  </td>
                </tr>
              ) : (
                myRatings.map((rating) => (
                  <tr
                    key={rating.id}
                    style={rowStyle}
                  >
                    <td style={cellStyle}>
                      <div style={bookNameStyle}>
                        {getBookTitle(
                          rating.book_id
                        )}
                      </div>

                      <div style={bookIdStyle}>
                        Book ID: {rating.book_id}
                      </div>
                    </td>

                    <td style={cellStyle}>
                      {renderStars(
                        rating.rating,
                        12
                      )}

                      <div style={numericRatingStyle}>
                        {rating.rating}/5
                      </div>
                    </td>

                    <td style={reviewCellStyle}>
                      {rating.review ? (
                        rating.review
                      ) : (
                        <span style={noReviewStyle}>
                          No written review
                        </span>
                      )}
                    </td>

                    <td style={dateCellStyle}>
                      {formatDate(
                        rating.created_at
                      )}
                    </td>

                    <td style={cellStyle}>
                      <div style={actionButtonsStyle}>
                        <button
                          onClick={() =>
                            handleEditRating(
                              rating
                            )
                          }
                          style={editButtonStyle}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDeleteRating(
                              rating
                            )
                          }
                          style={deleteButtonStyle}
                        >
                          Delete
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

      {/* VIEW BOOK RATINGS */}

      <div style={viewSectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>
              Explore Book Ratings
            </h2>

            <p style={sectionSubtitleStyle}>
              View the average rating and reviews
              submitted by readers.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleViewBookRatings}
          style={viewRatingsFormStyle}
        >
          <div style={viewSelectContainerStyle}>
            <label style={labelStyle}>
              Select Book
            </label>

            <select
              value={viewBookId}
              onChange={(e) => {
                setViewBookId(e.target.value);
                setBookRatings(null);
              }}
              style={viewSelectStyle}
            >
              <option value="">
                Select Book
              </option>

              {books.map((book) => (
                <option
                  key={book.id}
                  value={book.id}
                >
                  {book.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={viewLoading}
            style={{
              ...viewButtonStyle,
              opacity: viewLoading ? 0.6 : 1,
            }}
          >
            {viewLoading
              ? "Loading..."
              : "View Ratings"}
          </button>
        </form>

        {bookRatings && (
          <div style={bookRatingCardStyle}>
            <div style={bookRatingHeaderStyle}>
              <div style={selectedBookInfoStyle}>
                <span style={selectedBookLabelStyle}>
                  Selected Book
                </span>

                <h3 style={selectedBookTitleStyle}>
                  {bookRatings.title}
                </h3>

                <div style={selectedBookStarsStyle}>
                  {renderStars(
                    bookRatings.average_rating,
                    16
                  )}
                </div>
              </div>

              <div style={bookStatsStyle}>
                <div style={averageBoxStyle}>
                  <div style={averageNumberStyle}>
                    {Number(
                      bookRatings.average_rating || 0
                    ).toFixed(2)}
                  </div>

                  <div style={averageLabelStyle}>
                    Average Rating
                  </div>
                </div>

                <div style={averageBoxStyle}>
                  <div style={averageNumberStyle}>
                    {bookRatings.total_ratings || 0}
                  </div>

                  <div style={averageLabelStyle}>
                    Total Ratings
                  </div>
                </div>
              </div>
            </div>

            <div style={reviewsHeaderStyle}>
              <h3 style={reviewsTitleStyle}>
                Reader Reviews
              </h3>

              <span style={reviewCountBadgeStyle}>
                {(bookRatings.ratings || []).length}
              </span>
            </div>

            {(bookRatings.ratings || []).length === 0 ? (
              <div style={emptyReviewsStyle}>
                No ratings for this book yet.
              </div>
            ) : (
              <div style={reviewListStyle}>
                {(bookRatings.ratings || []).map(
                  (rating) => (
                    <div
                      key={rating.id}
                      style={publicReviewStyle}
                    >
                      <div style={publicReviewHeaderStyle}>
                        <div style={publicRatingInfoStyle}>
                          {renderStars(
                            rating.rating,
                            12
                          )}

                          <span style={publicNumericStyle}>
                            {rating.rating}/5
                          </span>
                        </div>

                        <span style={publicDateStyle}>
                          {formatDate(
                            rating.created_at
                          )}
                        </span>
                      </div>

                      <p style={publicReviewTextStyle}>
                        {rating.review ||
                          "No written review."}
                      </p>
                    </div>
                  )
                )}
              </div>
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
  icon,
  background,
  label,
  value,
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
          {label}
        </div>

        <div style={summaryValueStyle}>
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
  maxWidth: "100%",
  boxSizing: "border-box",
};

const pageHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const pageTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "34px",
  fontWeight: "700",
};

const subtitleStyle = {
  color: "#64748b",
  margin: "5px 0 0 0",
  fontSize: "14px",
};

const browseButtonStyle = {
  backgroundColor: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "7px",
  padding: "8px 13px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
};

// SUMMARY

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "11px",
  marginBottom: "18px",
};

const summaryCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
  backgroundColor: "#ffffff",
  padding: "13px 14px",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 2px 7px rgba(15,23,42,0.035)",
};

const summaryIconStyle = {
  width: "40px",
  height: "40px",
  minWidth: "40px",
  borderRadius: "9px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#334155",
  fontSize: "15px",
  fontWeight: "700",
};

const summaryLabelStyle = {
  color: "#64748b",
  fontSize: "10px",
  fontWeight: "600",
};

const summaryValueStyle = {
  color: "#0f172a",
  fontSize: "19px",
  fontWeight: "700",
  marginTop: "3px",
};

// CARDS

const formCardStyle = {
  backgroundColor: "#ffffff",
  padding: "16px",
  borderRadius: "11px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const cardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "13px",
};

const cardTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
  fontWeight: "700",
};

const cardSubtitleStyle = {
  margin: "3px 0 0 0",
  color: "#64748b",
  fontSize: "11px",
};

const editingBadgeStyle = {
  backgroundColor: "#fef3c7",
  color: "#92400e",
  padding: "4px 8px",
  borderRadius: "12px",
  fontSize: "10px",
  fontWeight: "700",
};

// FORM

const formGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "11px",
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "600",
  color: "#475569",
  fontSize: "11px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  color: "#334155",
  fontSize: "11px",
  outline: "none",
};

const reviewSectionStyle = {
  marginTop: "11px",
};

const textareaStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 9px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  resize: "vertical",
  fontFamily: "inherit",
  fontSize: "11px",
  color: "#334155",
  outline: "none",
};

const helperTextStyle = {
  color: "#64748b",
  fontSize: "10px",
  margin: "5px 0 0 0",
};

const reviewHelperStyle = {
  color: "#94a3b8",
  fontSize: "9px",
  marginTop: "4px",
};

const ratingPreviewStyle = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  marginTop: "7px",
};

const ratingPreviewTextStyle = {
  color: "#475569",
  fontSize: "10px",
  fontWeight: "700",
};

const formActionsStyle = {
  display: "flex",
  gap: "7px",
  marginTop: "12px",
  flexWrap: "wrap",
};

const saveButtonStyle = {
  padding: "7px 11px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  fontWeight: "600",
  fontSize: "11px",
};

const cancelButtonStyle = {
  padding: "7px 11px",
  backgroundColor: "#f1f5f9",
  color: "#475569",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "11px",
};

// SECTIONS

const sectionStyle = {
  marginTop: "18px",
};

const viewSectionStyle = {
  marginTop: "20px",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "10px",
};

const sectionTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "19px",
  fontWeight: "700",
};

const sectionSubtitleStyle = {
  margin: "3px 0 0 0",
  color: "#64748b",
  fontSize: "11px",
};

const countStyle = {
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
  padding: "4px 8px",
  borderRadius: "12px",
  fontSize: "10px",
  fontWeight: "700",
};

// TABLE

const tableContainerStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "9px",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "12px",
};

const headerRowStyle = {
  backgroundColor: "#f8fafc",
  borderBottom: "1px solid #dbe2ea",
};

const headerStyle = {
  padding: "9px",
  color: "#475569",
  whiteSpace: "nowrap",
  textAlign: "left",
  fontSize: "10px",
  fontWeight: "700",
};

const rowStyle = {
  borderBottom: "1px solid #eef2f7",
};

const cellStyle = {
  padding: "9px",
  verticalAlign: "middle",
  color: "#475569",
};

const reviewCellStyle = {
  ...cellStyle,
  maxWidth: "300px",
  lineHeight: "1.4",
  fontSize: "11px",
};

const dateCellStyle = {
  ...cellStyle,
  color: "#64748b",
  fontSize: "10px",
  whiteSpace: "nowrap",
};

const bookNameStyle = {
  color: "#1f2937",
  fontWeight: "700",
  fontSize: "11px",
};

const bookIdStyle = {
  color: "#94a3b8",
  fontSize: "9px",
  marginTop: "2px",
};

const noReviewStyle = {
  color: "#94a3b8",
  fontStyle: "italic",
};

const emptyTableStyle = {
  padding: "27px",
  textAlign: "center",
  color: "#64748b",
  fontSize: "11px",
};

// STARS

const starsStyle = {
  color: "#f59e0b",
  whiteSpace: "nowrap",
  letterSpacing: "1px",
};

const emptyStarsStyle = {
  color: "#d1d5db",
};

const numericRatingStyle = {
  fontSize: "9px",
  color: "#64748b",
  marginTop: "2px",
};

// ACTIONS

const actionButtonsStyle = {
  display: "flex",
  gap: "5px",
  flexWrap: "wrap",
};

const editButtonStyle = {
  padding: "5px 8px",
  border: "1px solid #bfdbfe",
  borderRadius: "6px",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "10px",
};

const deleteButtonStyle = {
  padding: "5px 8px",
  border: "1px solid #fecaca",
  borderRadius: "6px",
  backgroundColor: "#fff1f2",
  color: "#b91c1c",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "10px",
};

// VIEW RATINGS

const viewRatingsFormStyle = {
  display: "flex",
  alignItems: "flex-end",
  gap: "8px",
  flexWrap: "wrap",
  backgroundColor: "#ffffff",
  padding: "13px",
  borderRadius: "9px",
  border: "1px solid #e5e7eb",
};

const viewSelectContainerStyle = {
  flex: "1 1 300px",
};

const viewSelectStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  backgroundColor: "#ffffff",
  color: "#334155",
  fontSize: "11px",
};

const viewButtonStyle = {
  padding: "7px 11px",
  border: "none",
  borderRadius: "6px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "11px",
  height: "31px",
};

// BOOK RATING CARD

const bookRatingCardStyle = {
  backgroundColor: "#ffffff",
  padding: "15px",
  borderRadius: "10px",
  marginTop: "11px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const bookRatingHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "center",
  flexWrap: "wrap",
  paddingBottom: "13px",
  borderBottom: "1px solid #eef2f7",
};

const selectedBookInfoStyle = {
  flex: "1 1 250px",
};

const selectedBookLabelStyle = {
  color: "#64748b",
  fontSize: "9px",
  fontWeight: "600",
  textTransform: "uppercase",
};

const selectedBookTitleStyle = {
  margin: "3px 0 5px 0",
  color: "#111827",
  fontSize: "17px",
  fontWeight: "700",
};

const selectedBookStarsStyle = {
  marginTop: "2px",
};

const bookStatsStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const averageBoxStyle = {
  backgroundColor: "#f8fafc",
  padding: "9px 12px",
  borderRadius: "7px",
  textAlign: "center",
  minWidth: "95px",
  border: "1px solid #eef2f7",
};

const averageNumberStyle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#0f172a",
};

const averageLabelStyle = {
  fontSize: "9px",
  color: "#64748b",
  marginTop: "2px",
};

// REVIEWS

const reviewsHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  marginTop: "13px",
  marginBottom: "7px",
};

const reviewsTitleStyle = {
  margin: 0,
  color: "#334155",
  fontSize: "13px",
  fontWeight: "700",
};

const reviewCountBadgeStyle = {
  backgroundColor: "#f1f5f9",
  color: "#475569",
  padding: "2px 6px",
  borderRadius: "9px",
  fontSize: "9px",
  fontWeight: "700",
};

const reviewListStyle = {
  display: "grid",
  gap: "7px",
};

const publicReviewStyle = {
  backgroundColor: "#f8fafc",
  border: "1px solid #eef2f7",
  borderRadius: "7px",
  padding: "9px 10px",
};

const publicReviewHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  flexWrap: "wrap",
};

const publicRatingInfoStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const publicNumericStyle = {
  color: "#475569",
  fontSize: "9px",
  fontWeight: "700",
};

const publicDateStyle = {
  color: "#94a3b8",
  fontSize: "9px",
};

const publicReviewTextStyle = {
  margin: "6px 0 0 0",
  color: "#475569",
  lineHeight: "1.45",
  fontSize: "10px",
};

const emptyReviewsStyle = {
  padding: "18px",
  textAlign: "center",
  color: "#64748b",
  backgroundColor: "#f8fafc",
  borderRadius: "7px",
  fontSize: "10px",
};

// MESSAGES

const errorStyle = {
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  padding: "10px 12px",
  borderRadius: "7px",
  marginBottom: "14px",
  border: "1px solid #fecaca",
  fontSize: "12px",
};

const successStyle = {
  backgroundColor: "#dcfce7",
  color: "#166534",
  padding: "10px 12px",
  borderRadius: "7px",
  marginBottom: "14px",
  border: "1px solid #bbf7d0",
  fontSize: "12px",
};

// LOADING

const loadingCardStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "11px",
  padding: "35px",
  textAlign: "center",
};

const loadingIconStyle = {
  color: "#f59e0b",
  fontSize: "22px",
};

const loadingTitleStyle = {
  color: "#111827",
  fontSize: "15px",
  fontWeight: "700",
  marginTop: "6px",
};

const loadingTextStyle = {
  color: "#64748b",
  fontSize: "11px",
  marginTop: "3px",
};

// ACCESS DENIED

const accessDeniedStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  backgroundColor: "#fff1f2",
  color: "#991b1b",
  padding: "17px",
  borderRadius: "10px",
  border: "1px solid #fecdd3",
};

const accessIconStyle = {
  width: "30px",
  height: "30px",
  minWidth: "30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "8px",
  backgroundColor: "#fee2e2",
  color: "#dc2626",
  fontWeight: "700",
};

const accessTitleStyle = {
  margin: 0,
  fontSize: "15px",
};

const accessTextStyle = {
  margin: "4px 0 0 0",
  fontSize: "12px",
};

export default Ratings;
