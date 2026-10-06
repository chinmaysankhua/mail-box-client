import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIdToken } from "firebase/auth";

import { auth } from "../firebase/firebase";
import "./Home.css";

const DATABASE_URL =
  import.meta.env.VITE_FIREBASE_DATABASE_URL;

const Home = () => {
  const navigate = useNavigate();

  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        setLoading(true);
        setError("");

        const currentUser = auth.currentUser;

        if (!currentUser) {
          navigate("/login");
          return;
        }

        const idToken = await getIdToken(currentUser);

        const response = await fetch(
          `${DATABASE_URL}/mailboxes/${currentUser.uid}/inbox.json?auth=${idToken}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch emails.");
        }

        const data = await response.json();

        if (!data) {
          setEmails([]);
          return;
        }

        const emailList = Object.entries(data).map(
          ([id, email]) => ({
            id,
            ...email,
          })
        );

        // Newest email first
        emailList.sort(
          (a, b) => b.createdAt - a.createdAt
        );

        setEmails(emailList);
      } catch (error) {
        console.error("Fetch inbox error:", error);
        setError(
          error.message ||
            "Unable to load your emails."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, [navigate]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPreview = (html) => {
    if (!html) return "";

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    return tempDiv.textContent || "";
  };

  return (
    <div className="mail-page">

      {/* Sidebar */}
      <aside className="mail-sidebar">

        <button
          type="button"
          className="compose-button"
          onClick={() => navigate("/compose")}
        >
          <i className="bi bi-pencil"></i>
          Compose
        </button>

        <button
          type="button"
          className="sidebar-item active"
        >
          <i className="bi bi-inbox"></i>
          Inbox
          <span>{emails.length}</span>
        </button>

        <button
          type="button"
          className="sidebar-item"
        >
          <i className="bi bi-send"></i>
          Sent
        </button>

      </aside>

      {/* Main content */}
      <main className="mail-main">

        {/* Toolbar */}
        <div className="mail-toolbar">
          <div className="toolbar-left">
            <input
              type="checkbox"
              className="select-all"
            />

            <button type="button">
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>

          <div className="toolbar-right">
            <button type="button">
              Sort
              <i className="bi bi-chevron-down"></i>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mail-error">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mail-empty">
            Loading emails...
          </div>
        )}

        {/* No emails */}
        {!loading && emails.length === 0 && (
          <div className="mail-empty">
            <i className="bi bi-inbox"></i>

            <h3>Your inbox is empty</h3>

            <p>
              Emails sent to you will appear here.
            </p>
          </div>
        )}

        {/* Email list */}
        {!loading && emails.length > 0 && (
          <div className="email-list">

            {emails.map((email) => (
              <div
                key={email.id}
                className={
                  email.read
                    ? "email-row"
                    : "email-row unread"
                }
                onClick={() =>
                  setSelectedEmail(email)
                }
              >

                <input
                  type="checkbox"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                />

                <button
                  type="button"
                  className="star-button"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  <i className="bi bi-star"></i>
                </button>

                <div className="email-sender">
                  {email.sender}
                </div>

                <div className="email-content">

                  <span className="email-subject">
                    {email.subject}
                  </span>

                  <span className="email-preview">
                    {" "}
                    - {getPreview(email.body)}
                  </span>

                </div>

                <div className="email-time">
                  {formatTime(email.createdAt)}
                </div>

              </div>
            ))}

          </div>
        )}

        {/* Selected email */}
        {selectedEmail && (
          <div className="email-detail">

            <div className="email-detail-header">

              <button
                type="button"
                className="back-button"
                onClick={() =>
                  setSelectedEmail(null)
                }
              >
                <i className="bi bi-arrow-left"></i>
              </button>

              <h2>
                {selectedEmail.subject}
              </h2>

            </div>

            <div className="email-detail-info">
              <strong>
                {selectedEmail.sender}
              </strong>

              <span>
                To: {selectedEmail.receiver}
              </span>

              <span>
                {new Date(
                  selectedEmail.createdAt
                ).toLocaleString()}
              </span>
            </div>

            <div
              className="email-detail-body"
              dangerouslySetInnerHTML={{
                __html: selectedEmail.body,
              }}
            />

          </div>
        )}

      </main>
    </div>
  );
};

export default Home;