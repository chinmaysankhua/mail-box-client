import { useEffect, useReducer, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIdToken } from "firebase/auth";

import { auth } from "../firebase/firebase";
import "./Home.css";

const DATABASE_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL;

// -------------------------
// Reducer
// -------------------------

const initialState = {
  emails: [],
  loading: true,
  error: "",
};

const emailReducer = (state, action) => {
  switch (action.type) {
    case "SET_EMAILS":
      return {
        ...state,
        emails: action.payload,
        loading: false,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case "MARK_AS_READ":
      return {
        ...state,
        emails: state.emails.map((email) =>
          email.id === action.payload
            ? {
                ...email,
                read: true,
              }
            : email,
        ),
      };

    default:
      return state;
  }
};

const Home = () => {
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(emailReducer, initialState);

  const [selectedEmail, setSelectedEmail] = useState(null);

  // -------------------------
  // Fetch Inbox
  // -------------------------

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          navigate("/login");
          return;
        }

        const idToken = await getIdToken(currentUser);

        const response = await fetch(
          `${DATABASE_URL}/mailboxes/${currentUser.uid}/inbox.json?auth=${idToken}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch emails.");
        }

        const data = await response.json();

        if (!data) {
          dispatch({
            type: "SET_EMAILS",
            payload: [],
          });

          return;
        }

        const emailList = Object.entries(data).map(([id, email]) => ({
          id,
          ...email,
        }));

        // Newest email first
        emailList.sort((a, b) => b.createdAt - a.createdAt);

        dispatch({
          type: "SET_EMAILS",
          payload: emailList,
        });
      } catch (error) {
        console.error("Fetch inbox error:", error);

        dispatch({
          type: "SET_ERROR",
          payload: error.message || "Unable to load emails.",
        });
      }
    };

    fetchEmails();
  }, [navigate]);

  // -------------------------
  // Mark email as read
  // -------------------------

  const markEmailAsRead = async (email) => {
    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        navigate("/login");
        return;
      }

      // Already read
      if (email.read) {
        setSelectedEmail(email);
        return;
      }

      const idToken = await getIdToken(currentUser);

      const response = await fetch(
        `${DATABASE_URL}/mailboxes/${currentUser.uid}/inbox/${email.id}/read.json?auth=${idToken}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(true),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to mark email as read.");
      }

      // Update reducer
      dispatch({
        type: "MARK_AS_READ",
        payload: email.id,
      });

      // Update selected email
      setSelectedEmail({
        ...email,
        read: true,
      });
    } catch (error) {
      console.error("Mark as read error:", error);

      dispatch({
        type: "SET_ERROR",
        payload: error.message || "Unable to mark email as read.",
      });
    }
  };

  // -------------------------
  // Helpers
  // -------------------------

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return "";
    }

    const date = new Date(timestamp);

    const today = new Date();

    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
    });
  };

  const getPreview = (html) => {
    if (!html) {
      return "";
    }

    const tempDiv = document.createElement("div");

    tempDiv.innerHTML = html;

    return tempDiv.textContent || tempDiv.innerText || "";
  };

  const unreadCount = state.emails.filter((email) => !email.read).length;

  // -------------------------
  // Email detail screen
  // -------------------------

  if (selectedEmail) {
    return (
      <div className="mail-page">
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
            onClick={() => setSelectedEmail(null)}
          >
            <i className="bi bi-inbox"></i>
            Inbox
            {unreadCount > 0 && <span>{unreadCount}</span>}
          </button>

          <button type="button" className="sidebar-item">
            <i className="bi bi-send"></i>
            Sent
          </button>
        </aside>

        <main className="mail-main">
          <div className="email-detail">
            <div className="email-detail-toolbar">
              <button type="button" onClick={() => setSelectedEmail(null)}>
                <i className="bi bi-arrow-left"></i>
              </button>
            </div>

            <div className="email-detail-content">
              <h2>{selectedEmail.subject}</h2>

              <div className="email-sender-detail">
                <strong>{selectedEmail.sender}</strong>

                <span>To: {selectedEmail.receiver}</span>

                <span>
                  {new Date(selectedEmail.createdAt).toLocaleString()}
                </span>
              </div>

              <div
                className="email-body"
                dangerouslySetInnerHTML={{
                  __html: selectedEmail.body,
                }}
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // -------------------------
  // Inbox screen
  // -------------------------

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

        <button type="button" className="sidebar-item active">
          <i className="bi bi-inbox"></i>
          Inbox
          {unreadCount > 0 && <span>{unreadCount}</span>}
        </button>

        <button type="button" className="sidebar-item">
          <i className="bi bi-send"></i>
          Sent
        </button>
      </aside>

      {/* Main */}

      <main className="mail-main">
        <div className="mail-toolbar">
          <div className="toolbar-left">
            <input type="checkbox" className="select-all" />

            <button type="button">
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>

          <div className="unread-count">{unreadCount} unread</div>
        </div>

        {state.error && <div className="mail-error">{state.error}</div>}

        {state.loading && <div className="mail-empty">Loading emails...</div>}

        {!state.loading && state.emails.length === 0 && (
          <div className="mail-empty">
            <i className="bi bi-inbox"></i>

            <h3>Your inbox is empty</h3>

            <p>Emails sent to you will appear here.</p>
          </div>
        )}

        {!state.loading && state.emails.length > 0 && (
          <div className="email-list">
            {state.emails.map((email) => (
              <div
                key={email.id}
                className={email.read ? "email-row" : "email-row unread"}
                onClick={() => markEmailAsRead(email)}
              >
                {/* Checkbox */}

                <input
                  type="checkbox"
                  onClick={(event) => event.stopPropagation()}
                />

                {/* Unread dot */}

                <span
                  className={email.read ? "unread-dot hidden" : "unread-dot"}
                ></span>

                {/* Star */}

                <button
                  type="button"
                  className="star-button"
                  onClick={(event) => event.stopPropagation()}
                >
                  <i className="bi bi-star"></i>
                </button>

                {/* Sender */}

                <div className="email-sender">{email.sender}</div>

                {/* Subject */}

                <div className="email-content">
                  <span className="email-subject">{email.subject}</span>

                  <span className="email-preview">
                    {" "}
                    - {getPreview(email.body)}
                  </span>
                </div>

                {/* Time */}

                <div className="email-time">{formatTime(email.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
