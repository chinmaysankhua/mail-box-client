import { useEffect, useReducer, useState, useRef } from "react";
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
        error: "",
      };

    case "SET_LOADING":
      return {
        ...state,
        loading: true,
        error: "",
      };

    case "SET_ERROR":
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case "MARK_AS_READ":
      return {
        ...state,
        emails: state.emails.map((email) =>
          email.id === action.payload ? { ...email, read: true } : email,
        ),
      };

    case "DELETE_EMAIL":
      return {
        ...state,
        emails: state.emails.filter((email) => email.id !== action.payload),
      };

    default:
      return state;
  }
};
const areEmailsEqual = (oldEmails, newEmails) => {
  if (oldEmails.length !== newEmails.length) {
    return false;
  }

  return oldEmails.every((oldEmail, index) => {
    const newEmail = newEmails[index];

    return (
      oldEmail.id === newEmail.id &&
      oldEmail.read === newEmail.read &&
      oldEmail.createdAt === newEmail.createdAt
    );
  });
};
const Home = () => {
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(emailReducer, initialState);

  const [folder, setFolder] = useState("inbox");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const emailsRef = useRef([]);
  // -------------------------
  // Fetch emails
  // -------------------------

  useEffect(() => {
    let intervalId;
    let cancelled = false;

    const fetchEmails = async (showLoading = false) => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          navigate("/login");
          return;
        }

        if (showLoading) {
          dispatch({
            type: "SET_LOADING",
          });
        }

        const idToken = await getIdToken(currentUser);

        const response = await fetch(
          `${DATABASE_URL}/mailboxes/${currentUser.uid}/${folder}.json?auth=${idToken}`,
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch ${folder} emails.`);
        }

        const data = await response.json();

        if (cancelled) {
          return;
        }

        const emailList = data
          ? Object.entries(data).map(([id, email]) => ({
              id,
              ...email,
            }))
          : [];

        // Newest first
        emailList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        /*
         * Only update React state if something
         * actually changed.
         */
        if (!areEmailsEqual(emailsRef.current, emailList)) {
          emailsRef.current = emailList;

          dispatch({
            type: "SET_EMAILS",
            payload: emailList,
          });
        } else if (showLoading) {
          // First request should stop loading
          emailsRef.current = emailList;

          dispatch({
            type: "SET_EMAILS",
            payload: emailList,
          });
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Fetch emails error:", error);

        dispatch({
          type: "SET_ERROR",
          payload: error.message || "Unable to load emails.",
        });
      }
    };

    // Fetch immediately
    fetchEmails(true);

    // Then poll every 2 seconds
    intervalId = setInterval(() => {
      fetchEmails(false);
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [folder, navigate]);
  
  useEffect(() => {
  emailsRef.current = [];
}, [folder]);
  // -------------------------
  // Open email
  // -------------------------

  const handleOpenEmail = async (email) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      navigate("/login");
      return;
    }

    // Sent emails don't need to be marked as read.
    if (folder === "sent") {
      setSelectedEmail(email);
      return;
    }

    // Already read
    if (email.read) {
      setSelectedEmail(email);
      return;
    }

    try {
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

      dispatch({
        type: "MARK_AS_READ",
        payload: email.id,
      });

      setSelectedEmail({
        ...email,
        read: true,
      });
    } catch (error) {
      console.error("Mark as read error:", error);

      dispatch({
        type: "SET_ERROR",
        payload: error.message || "Unable to open email.",
      });
    }
  };

  // -------------------------
  // Delete email
  // -------------------------

  const handleDeleteEmail = async (email) => {
    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        navigate("/login");
        return;
      }

      const idToken = await getIdToken(currentUser);

      const response = await fetch(
        `${DATABASE_URL}/mailboxes/${currentUser.uid}/${folder}/${email.id}.json?auth=${idToken}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete email.");
      }

      dispatch({
        type: "DELETE_EMAIL",
        payload: email.id,
      });

      if (selectedEmail && selectedEmail.id === email.id) {
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error("Delete email error:", error);

      dispatch({
        type: "SET_ERROR",
        payload: error.message || "Unable to delete email.",
      });
    }
  };

  // -------------------------
  // Helpers
  // -------------------------

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
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
    if (!html) return "";

    const div = document.createElement("div");
    div.innerHTML = html;

    return div.textContent || div.innerText || "";
  };

  const unreadCount =
    folder === "inbox" ? state.emails.filter((email) => !email.read).length : 0;

  // -------------------------
  // Read email
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
            className={
              folder === "inbox" ? "sidebar-item active" : "sidebar-item"
            }
            onClick={() => {
              setFolder("inbox");
              setSelectedEmail(null);
            }}
          >
            <i className="bi bi-inbox"></i>
            Inbox
            {unreadCount > 0 && <span>{unreadCount}</span>}
          </button>

          <button
            type="button"
            className={
              folder === "sent" ? "sidebar-item active" : "sidebar-item"
            }
            onClick={() => {
              setFolder("sent");
              setSelectedEmail(null);
            }}
          >
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

              <button
                type="button"
                className="detail-delete-button"
                onClick={() => handleDeleteEmail(selectedEmail)}
              >
                <i className="bi bi-trash"></i>
              </button>
            </div>

            <div className="email-detail-content">
              <h2>{selectedEmail.subject || "(No Subject)"}</h2>

              <div className="email-sender-detail">
                <strong>
                  {folder === "sent"
                    ? `To: ${selectedEmail.receiver}`
                    : selectedEmail.sender}
                </strong>

                {folder === "inbox" && (
                  <span>To: {selectedEmail.receiver}</span>
                )}

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
  // Inbox / Sent list
  // -------------------------

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
          className={
            folder === "inbox" ? "sidebar-item active" : "sidebar-item"
          }
          onClick={() => setFolder("inbox")}
        >
          <i className="bi bi-inbox"></i>
          Inbox
          {unreadCount > 0 && <span>{unreadCount}</span>}
        </button>

        <button
          type="button"
          className={folder === "sent" ? "sidebar-item active" : "sidebar-item"}
          onClick={() => setFolder("sent")}
        >
          <i className="bi bi-send"></i>
          Sent
        </button>
      </aside>

      <main className="mail-main">
        <div className="mail-toolbar">
          <div className="toolbar-left">
            <input type="checkbox" className="select-all" />

            <button
              type="button"
              onClick={() => {
                setFolder(folder);
              }}
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>

          <div className="unread-count">
            {folder === "inbox"
              ? `${unreadCount} unread`
              : `${state.emails.length} sent`}
          </div>
        </div>

        {state.error && <div className="mail-error">{state.error}</div>}

        {state.loading && (
          <div className="mail-empty">
            Loading {folder === "inbox" ? "inbox" : "sent mails"}
            ...
          </div>
        )}

        {!state.loading && state.emails.length === 0 && (
          <div className="mail-empty">
            <i
              className={folder === "inbox" ? "bi bi-inbox" : "bi bi-send"}
            ></i>

            <h3>
              {folder === "inbox" ? "Your inbox is empty" : "No sent emails"}
            </h3>

            <p>
              {folder === "inbox"
                ? "Emails sent to you will appear here."
                : "Emails you send will appear here."}
            </p>
          </div>
        )}

        {!state.loading && state.emails.length > 0 && (
          <div className="email-list">
            {state.emails.map((email) => (
              <div
                key={email.id}
                className={
                  folder === "inbox" && !email.read
                    ? "email-row unread"
                    : "email-row"
                }
                onClick={() => handleOpenEmail(email)}
              >
                <input
                  type="checkbox"
                  onClick={(event) => event.stopPropagation()}
                />

                {folder === "inbox" && (
                  <span
                    className={email.read ? "unread-dot hidden" : "unread-dot"}
                  ></span>
                )}

                <button
                  type="button"
                  className="star-button"
                  onClick={(event) => event.stopPropagation()}
                >
                  <i className="bi bi-star"></i>
                </button>

                <div className="email-sender">
                  {folder === "sent" ? email.receiver : email.sender}
                </div>

                <div className="email-content">
                  <span className="email-subject">
                    {email.subject || "(No Subject)"}
                  </span>

                  <span className="email-preview">
                    {" "}
                    - {getPreview(email.body)}
                  </span>
                </div>

                <div className="email-time">{formatTime(email.createdAt)}</div>

                <button
                  type="button"
                  className="delete-mail-button"
                  title="Delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteEmail(email);
                  }}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
