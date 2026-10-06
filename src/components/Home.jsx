import { useState } from "react";
import { useNavigate } from "react-router-dom";

import useMailbox from "../hooks/useMailbox";

import "./Home.css";

const Home = () => {
  const navigate = useNavigate();

  const [folder, setFolder] = useState("inbox");

  const [selectedEmail, setSelectedEmail] = useState(null);

  const { emails, loading, error, markAsRead, deleteEmail } =
    useMailbox(folder);

  const handleOpenEmail = async (email) => {
    if (folder === "inbox" && !email.read) {
      await markAsRead(email.id);

      setSelectedEmail({
        ...email,
        read: true,
      });

      return;
    }

    setSelectedEmail(email);
  };

  const handleDeleteEmail = async (email) => {
    await deleteEmail(email.id);

    if (selectedEmail?.id === email.id) {
      setSelectedEmail(null);
    }
  };

  const unreadCount =
    folder === "inbox" ? emails.filter((email) => !email.read).length : 0;

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

        {/* Inbox */}

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

        {/* Sent */}

        <button
          type="button"
          className={folder === "sent" ? "sidebar-item active" : "sidebar-item"}
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
        {error && <div className="mail-error">{error}</div>}

        {selectedEmail ? (
          // -------------------------
          // READ EMAIL
          // -------------------------

          <div className="email-detail">
            <div className="email-detail-toolbar">
              <button type="button" onClick={() => setSelectedEmail(null)}>
                <i className="bi bi-arrow-left"></i>
              </button>

              <button
                type="button"
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
        ) : (
          // -------------------------
          // EMAIL LIST
          // -------------------------

          <>
            {loading ? (
              <div className="mail-empty">Loading...</div>
            ) : emails.length === 0 ? (
              <div className="mail-empty">
                <i className="bi bi-inbox"></i>

                <h3>
                  {folder === "inbox"
                    ? "Your inbox is empty"
                    : "No sent emails"}
                </h3>
              </div>
            ) : (
              <div className="email-list">
                {emails.map((email) => (
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

                    {/* Unread dot */}

                    {folder === "inbox" && (
                      <span
                        className={
                          email.read ? "unread-dot hidden" : "unread-dot"
                        }
                      />
                    )}

                    <div className="email-sender">
                      {folder === "sent" ? email.receiver : email.sender}
                    </div>

                    <div className="email-content">
                      <strong>{email.subject || "(No Subject)"}</strong>
                    </div>

                    <div className="email-time">
                      {new Date(email.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>

                    <button
                      type="button"
                      className="delete-mail-button"
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
          </>
        )}
      </main>
    </div>
  );
};

export default Home;
