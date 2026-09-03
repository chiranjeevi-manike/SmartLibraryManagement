import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Recommendations() {
  const navigate = useNavigate();

  const [recommendations, setRecommendations] = useState([]);
  const [preferredCategories, setPreferredCategories] = useState([]);
  const [totalRecommendations, setTotalRecommendations] = useState(0);

  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const handleAuthError = (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role_id");

      navigate("/");
      return true;
    }

    return false;
  };

  // ==================================================
  // FETCH RECOMMENDATIONS
  // ==================================================

  const fetchRecommendations = async (selectedLimit = limit) => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        "http://127.0.0.1:8000/books/recommendations",
        {
          params: {
            limit: selectedLimit,
          },
          headers: getHeaders(),
        }
      );

      setRecommendations(
        response.data?.recommendations || []
      );

      setPreferredCategories(
        response.data?.preferred_categories || []
      );

      setTotalRecommendations(
        response.data?.total_recommendations || 0
      );
    } catch (err) {
      console.error("Recommendation Error:", err);

      if (handleAuthError(err)) {
        return;
      }

      setError(
        err.response?.data?.detail ||
          "Unable to load recommendations."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    if (isMember) {
      fetchRecommendations(5);
    } else {
      setLoading(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================================================
  // CHANGE LIMIT
  // ==================================================

  const handleLimitChange = async (e) => {
    const newLimit = Number(e.target.value);

    setLimit(newLimit);

    await fetchRecommendations(newLimit);
  };

  // ==================================================
  // STARS
  // ==================================================

  const renderStars = (averageRating) => {
    const rounded = Math.round(
      Number(averageRating || 0)
    );

    return (
      <span style={starsStyle}>
        {"★".repeat(rounded)}

        <span style={emptyStarsStyle}>
          {"★".repeat(Math.max(0, 5 - rounded))}
        </span>
      </span>
    );
  };

  // ==================================================
  // SCORE
  // ==================================================

  const getScorePercentage = (score) => {
    const percentage =
      (Number(score || 0) / 6) * 100;

    return Math.min(
      100,
      Math.max(0, percentage)
    );
  };

  // ==================================================
  // RECOMMENDATION LABEL
  // ==================================================

  const getRecommendationLabel = (score) => {
    const value = Number(score || 0);

    if (value >= 5) {
      return "Excellent Match";
    }

    if (value >= 4) {
      return "Strong Match";
    }

    if (value >= 3) {
      return "Good Match";
    }

    if (value >= 2) {
      return "Suggested";
    }

    return "You May Like";
  };

  // ==================================================
  // MATCH BADGE STYLE
  // ==================================================

  const getMatchBadgeStyle = (score) => {
    const value = Number(score || 0);

    if (value >= 5) {
      return {
        ...matchBadgeBaseStyle,
        backgroundColor: "#dcfce7",
        color: "#166534",
      };
    }

    if (value >= 4) {
      return {
        ...matchBadgeBaseStyle,
        backgroundColor: "#dbeafe",
        color: "#1d4ed8",
      };
    }

    if (value >= 3) {
      return {
        ...matchBadgeBaseStyle,
        backgroundColor: "#fef3c7",
        color: "#92400e",
      };
    }

    return {
      ...matchBadgeBaseStyle,
      backgroundColor: "#f1f5f9",
      color: "#475569",
    };
  };

  // ==================================================
  // ACCESS CONTROL
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
            Book recommendations are available from
            the Member interface.
          </p>
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

      <div style={headerSectionStyle}>
        <div>
          <h1 style={pageTitleStyle}>
            Recommended for You
          </h1>

          <p style={subtitleStyle}>
            Personalized book suggestions based on your
            borrowing history, ratings and book popularity.
          </p>
        </div>

        <div style={limitControlStyle}>
          <label style={limitLabelStyle}>
            Show
          </label>

          <select
            value={limit}
            onChange={handleLimitChange}
            style={limitSelectStyle}
          >
            <option value={5}>5 Books</option>
            <option value={10}>10 Books</option>
            <option value={15}>15 Books</option>
            <option value={20}>20 Books</option>
          </select>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {/* SUMMARY */}

      {!loading && !error && (
        <div style={summaryGridStyle}>
          <SummaryCard
            icon="★"
            background="#dbeafe"
            label="Recommendations"
            value={totalRecommendations}
          />

          <SummaryCard
            icon="◫"
            background="#ede9fe"
            label="Preferred Categories"
            value={preferredCategories.length}
          />

          <SummaryCard
            icon="6"
            background="#dcfce7"
            label="Maximum Match Score"
            value="6"
          />
        </div>
      )}

      {/* PREFERRED CATEGORIES */}

      {!loading &&
        preferredCategories.length > 0 && (
          <div style={categorySectionStyle}>
            <div style={categoryHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>
                  Your Preferred Categories
                </h2>

                <p style={sectionSubtitleStyle}>
                  Categories are ranked from your borrowing history.
                </p>
              </div>

              <span style={categoryCountStyle}>
                {preferredCategories.length} Categories
              </span>
            </div>

            <div style={categoryListStyle}>
              {preferredCategories.map(
                (categoryId, index) => (
                  <span
                    key={categoryId}
                    style={
                      index === 0
                        ? topCategoryBadgeStyle
                        : categoryBadgeStyle
                    }
                  >
                    Category {categoryId}

                    {index === 0 &&
                      " • Top Preference"}
                  </span>
                )
              )}
            </div>
          </div>
        )}

      {/* LOADING */}

      {loading && (
        <div style={loadingStyle}>
          <div style={loadingIconStyle}>
            ◷
          </div>

          <div style={loadingTitleStyle}>
            Finding the best books for you
          </div>

          <div style={loadingTextStyle}>
            Analyzing your borrowing preferences.
          </div>
        </div>
      )}

      {/* EMPTY */}

      {!loading &&
        !error &&
        recommendations.length === 0 && (
          <div style={emptyStyle}>
            <div style={emptyIconStyle}>
              📚
            </div>

            <h2 style={emptyTitleStyle}>
              No Recommendations Yet
            </h2>

            <p style={emptyTextStyle}>
              We do not have enough eligible books to
              recommend right now.
            </p>

            <p style={emptySubTextStyle}>
              Borrow more books and your recommendations
              will become more personalized.
            </p>

            <button
              onClick={() => navigate("/books")}
              style={browseButtonStyle}
            >
              Browse Books
            </button>
          </div>
        )}

      {/* RECOMMENDATIONS */}

      {!loading &&
        recommendations.length > 0 && (
          <>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>
                  Top Recommendations
                </h2>

                <p style={sectionSubtitleStyle}>
                  Books are ranked using a maximum recommendation
                  score of 6 points.
                </p>
              </div>

              <span style={resultBadgeStyle}>
                {recommendations.length} Shown
              </span>
            </div>

            <div style={recommendationGridStyle}>
              {recommendations.map(
                (book, index) => {
                  const percentage =
                    getScorePercentage(
                      book.recommendation_score
                    );

                  return (
                    <div
                      key={book.book_id}
                      style={bookCardStyle}
                    >
                      {/* TOP ROW */}

                      <div style={bookCardHeaderStyle}>
                        <div style={rankStyle}>
                          #{index + 1}
                        </div>

                        <div
                          style={getMatchBadgeStyle(
                            book.recommendation_score
                          )}
                        >
                          {getRecommendationLabel(
                            book.recommendation_score
                          )}
                        </div>
                      </div>

                      {/* BOOK TITLE */}

                      <h2 style={bookTitleStyle}>
                        {book.title}
                      </h2>

                      <div style={bookMetaRowStyle}>
                        <span style={bookMetaStyle}>
                          Book ID: {book.book_id}
                        </span>

                        <span style={bookMetaStyle}>
                          Category:{" "}
                          {book.category_id ?? "-"}
                        </span>
                      </div>

                      {/* SCORE */}

                      <div style={scoreSectionStyle}>
                        <div style={scoreHeaderStyle}>
                          <span style={scoreLabelStyle}>
                            Recommendation Score
                          </span>

                          <strong style={scoreNumberStyle}>
                            {Number(
                              book.recommendation_score || 0
                            ).toFixed(2)}
                            /6
                          </strong>
                        </div>

                        <div style={progressBackgroundStyle}>
                          <div
                            style={{
                              ...progressBarStyle,
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* RATING */}

                      <div style={ratingSectionStyle}>
                        <div>
                          {renderStars(
                            book.average_rating
                          )}
                        </div>

                        <div style={ratingTextStyle}>
                          {Number(
                            book.average_rating || 0
                          ).toFixed(2)}
                          /5
                        </div>

                        <div style={smallTextStyle}>
                          {book.rating_count} rating(s)
                        </div>
                      </div>

                      {/* AVAILABILITY / BORROW COUNT */}

                      <div style={metricGridStyle}>
                        <div style={metricCardStyle}>
                          <div style={metricLabelStyle}>
                            Available Copies
                          </div>

                          <div
                            style={{
                              ...metricValueStyle,
                              color:
                                Number(
                                  book.available_copies || 0
                                ) > 0
                                  ? "#16a34a"
                                  : "#dc2626",
                            }}
                          >
                            {book.available_copies}
                          </div>
                        </div>

                        <div style={metricCardStyle}>
                          <div style={metricLabelStyle}>
                            Times Borrowed
                          </div>

                          <div style={metricValueStyle}>
                            {book.borrow_count}
                          </div>
                        </div>
                      </div>

                      {/* SCORE BREAKDOWN */}

                      <div style={breakdownStyle}>
                        <div style={breakdownHeaderStyle}>
                          Why this book?
                        </div>

                        <BreakdownRow
                          label="Category Preference"
                          value={`${Number(
                            book.category_score || 0
                          ).toFixed(2)}/3`}
                        />

                        <BreakdownRow
                          label="Reader Rating"
                          value={`${Number(
                            book.rating_score || 0
                          ).toFixed(2)}/2`}
                        />

                        <BreakdownRow
                          label="Popularity"
                          value={`${Number(
                            book.popularity_score || 0
                          ).toFixed(2)}/1`}
                        />
                      </div>

                      {/* ACTION */}

                      <button
                        onClick={() =>
                          navigate("/books")
                        }
                        style={viewBookButtonStyle}
                      >
                        Browse Books
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          </>
        )}

      {/* EXPLANATION */}

      {!loading &&
        recommendations.length > 0 && (
          <div style={explanationStyle}>
            <div style={explanationHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>
                  How Recommendations Are Calculated
                </h2>

                <p style={sectionSubtitleStyle}>
                  Your recommendation score combines three
                  weighted factors.
                </p>
              </div>

              <span style={formulaBadgeStyle}>
                Maximum Score: 6
              </span>
            </div>

            <div style={explanationItemsStyle}>
              <ExplanationItem
                icon="◫"
                title="Category Preference"
                points="3 Points"
                description="Based on the categories you have borrowed most frequently."
              />

              <ExplanationItem
                icon="★"
                title="Book Rating"
                points="2 Points"
                description="Based on the average rating given by readers."
              />

              <ExplanationItem
                icon="↗"
                title="Popularity"
                points="1 Point"
                description="Based on how frequently the book has been borrowed."
              />
            </div>
          </div>
        )}
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

        <div style={summaryNumberStyle}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ==================================================
// BREAKDOWN ROW
// ==================================================

function BreakdownRow({ label, value }) {
  return (
    <div style={breakdownRowStyle}>
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

// ==================================================
// EXPLANATION ITEM
// ==================================================

function ExplanationItem({
  icon,
  title,
  points,
  description,
}) {
  return (
    <div style={explanationItemStyle}>
      <div style={explanationIconStyle}>
        {icon}
      </div>

      <div>
        <div style={explanationItemHeaderStyle}>
          <strong>{title}</strong>

          <span style={pointsBadgeStyle}>
            {points}
          </span>
        </div>

        <div style={explanationDescriptionStyle}>
          {description}
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

// HEADER

const headerSectionStyle = {
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
  lineHeight: "1.45",
};

const limitControlStyle = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
};

const limitLabelStyle = {
  fontWeight: "600",
  color: "#475569",
  fontSize: "11px",
};

const limitSelectStyle = {
  padding: "7px 9px",
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  backgroundColor: "#ffffff",
  color: "#334155",
  fontSize: "11px",
};

// SUMMARY

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
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
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "9px",
  fontSize: "15px",
  fontWeight: "700",
};

const summaryNumberStyle = {
  color: "#0f172a",
  fontSize: "19px",
  fontWeight: "700",
  marginTop: "3px",
};

const summaryLabelStyle = {
  color: "#64748b",
  fontSize: "10px",
  fontWeight: "600",
};

// CATEGORY SECTION

const categorySectionStyle = {
  backgroundColor: "#ffffff",
  padding: "15px",
  borderRadius: "11px",
  marginBottom: "19px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const categoryHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const categoryCountStyle = {
  backgroundColor: "#f1f5f9",
  color: "#475569",
  padding: "4px 8px",
  borderRadius: "12px",
  fontSize: "10px",
  fontWeight: "700",
};

const categoryListStyle = {
  display: "flex",
  gap: "7px",
  flexWrap: "wrap",
  marginTop: "10px",
};

const categoryBadgeStyle = {
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  padding: "5px 8px",
  borderRadius: "14px",
  fontSize: "10px",
  fontWeight: "600",
};

const topCategoryBadgeStyle = {
  ...categoryBadgeStyle,
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: "700",
};

// SECTION HEADER

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "19px",
  marginBottom: "11px",
};

const sectionTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "19px",
  fontWeight: "700",
};

const sectionSubtitleStyle = {
  color: "#64748b",
  fontSize: "11px",
  margin: "3px 0 0 0",
};

const resultBadgeStyle = {
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
  padding: "4px 8px",
  borderRadius: "12px",
  fontSize: "10px",
  fontWeight: "700",
};

// RECOMMENDATION GRID

const recommendationGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(290px, 1fr))",
  gap: "13px",
};

// BOOK CARD

const bookCardStyle = {
  backgroundColor: "#ffffff",
  padding: "15px",
  borderRadius: "11px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
  boxSizing: "border-box",
};

const bookCardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "9px",
};

const rankStyle = {
  fontSize: "14px",
  fontWeight: "700",
  color: "#2563eb",
};

const matchBadgeBaseStyle = {
  display: "inline-block",
  padding: "4px 7px",
  borderRadius: "12px",
  fontSize: "9px",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

const bookTitleStyle = {
  margin: "12px 0 6px 0",
  color: "#111827",
  fontSize: "17px",
  fontWeight: "700",
};

const bookMetaRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "9px",
};

const bookMetaStyle = {
  color: "#64748b",
  fontSize: "10px",
};

// SCORE

const scoreSectionStyle = {
  marginTop: "13px",
};

const scoreHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "6px",
};

const scoreLabelStyle = {
  color: "#475569",
  fontSize: "10px",
  fontWeight: "600",
};

const scoreNumberStyle = {
  color: "#2563eb",
  fontSize: "11px",
};

const progressBackgroundStyle = {
  height: "6px",
  backgroundColor: "#e5e7eb",
  borderRadius: "10px",
  overflow: "hidden",
};

const progressBarStyle = {
  height: "100%",
  backgroundColor: "#2563eb",
  borderRadius: "10px",
  minWidth: "2px",
};

// RATING

const ratingSectionStyle = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  flexWrap: "wrap",
  marginTop: "12px",
};

const starsStyle = {
  color: "#f59e0b",
  fontSize: "11px",
  whiteSpace: "nowrap",
  letterSpacing: "1px",
};

const emptyStarsStyle = {
  color: "#d1d5db",
};

const ratingTextStyle = {
  fontWeight: "700",
  color: "#334155",
  fontSize: "10px",
};

const smallTextStyle = {
  color: "#64748b",
  fontSize: "10px",
};

// METRICS

const metricGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "8px",
  marginTop: "12px",
};

const metricCardStyle = {
  backgroundColor: "#f8fafc",
  border: "1px solid #eef2f7",
  padding: "9px",
  borderRadius: "7px",
};

const metricLabelStyle = {
  color: "#64748b",
  fontSize: "9px",
  fontWeight: "600",
};

const metricValueStyle = {
  marginTop: "3px",
  color: "#334155",
  fontSize: "15px",
  fontWeight: "700",
};

// BREAKDOWN

const breakdownStyle = {
  backgroundColor: "#f8fafc",
  padding: "10px",
  borderRadius: "8px",
  marginTop: "12px",
  border: "1px solid #eef2f7",
};

const breakdownHeaderStyle = {
  color: "#334155",
  fontWeight: "700",
  fontSize: "11px",
  marginBottom: "5px",
};

const breakdownRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  padding: "5px 0",
  borderBottom: "1px solid #eef2f7",
  color: "#64748b",
  fontSize: "10px",
};

// BUTTON

const viewBookButtonStyle = {
  width: "100%",
  marginTop: "12px",
  padding: "7px 10px",
  border: "none",
  borderRadius: "7px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "11px",
};

// EXPLANATION

const explanationStyle = {
  backgroundColor: "#ffffff",
  marginTop: "19px",
  padding: "15px",
  borderRadius: "11px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const explanationHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const formulaBadgeStyle = {
  backgroundColor: "#dcfce7",
  color: "#166534",
  padding: "4px 8px",
  borderRadius: "12px",
  fontSize: "10px",
  fontWeight: "700",
};

const explanationItemsStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "9px",
  marginTop: "11px",
};

const explanationItemStyle = {
  display: "flex",
  gap: "9px",
  backgroundColor: "#f8fafc",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #eef2f7",
};

const explanationIconStyle = {
  width: "30px",
  height: "30px",
  minWidth: "30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "7px",
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: "700",
  fontSize: "12px",
};

const explanationItemHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "7px",
  flexWrap: "wrap",
  fontSize: "10px",
  color: "#334155",
};

const pointsBadgeStyle = {
  backgroundColor: "#ffffff",
  color: "#2563eb",
  border: "1px solid #bfdbfe",
  padding: "2px 5px",
  borderRadius: "8px",
  fontSize: "8px",
  fontWeight: "700",
};

const explanationDescriptionStyle = {
  color: "#64748b",
  fontSize: "9px",
  lineHeight: "1.45",
  marginTop: "4px",
};

// LOADING

const loadingStyle = {
  backgroundColor: "#ffffff",
  padding: "34px",
  textAlign: "center",
  borderRadius: "11px",
  marginTop: "18px",
  border: "1px solid #e5e7eb",
};

const loadingIconStyle = {
  color: "#2563eb",
  fontSize: "20px",
  marginBottom: "7px",
};

const loadingTitleStyle = {
  color: "#111827",
  fontSize: "15px",
  fontWeight: "700",
};

const loadingTextStyle = {
  color: "#64748b",
  fontSize: "11px",
  marginTop: "3px",
};

// EMPTY

const emptyStyle = {
  backgroundColor: "#ffffff",
  padding: "32px 22px",
  textAlign: "center",
  borderRadius: "11px",
  marginTop: "18px",
  border: "1px solid #e5e7eb",
};

const emptyIconStyle = {
  fontSize: "27px",
  marginBottom: "8px",
};

const emptyTitleStyle = {
  margin: "0 0 6px 0",
  color: "#111827",
  fontSize: "18px",
};

const emptyTextStyle = {
  color: "#475569",
  fontSize: "11px",
  margin: 0,
};

const emptySubTextStyle = {
  color: "#64748b",
  fontSize: "10px",
  margin: "5px 0 0 0",
};

const browseButtonStyle = {
  marginTop: "12px",
  padding: "7px 12px",
  border: "none",
  borderRadius: "7px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontWeight: "600",
  cursor: "pointer",
  fontSize: "11px",
};

// ERROR

const errorStyle = {
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  padding: "10px 12px",
  borderRadius: "7px",
  marginBottom: "16px",
  border: "1px solid #fecaca",
  fontSize: "12px",
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

export default Recommendations;