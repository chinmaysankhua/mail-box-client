import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";

import { useNavigate } from "react-router-dom";
import { getIdToken } from "firebase/auth";

import { auth } from "../firebase/firebase";
import "./ComposeMail.css";

const DATABASE_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL;

/*
 * Firebase Realtime Database does not allow:
 * . # $ [ ] /
 *
 * encodeURIComponent() does not encode ".".
 * So we encode "." separately as "%2E".
 */
const encodeEmail = (email) => {
  const normalizedEmail = email.trim().toLowerCase();

  const bytes = new TextEncoder().encode(normalizedEmail);

  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const ComposeMail = () => {
  const navigate = useNavigate();

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
   * Tiptap editor
   */
  const editor = useEditor({
    extensions: [
      StarterKit,

      /*
       * Gives us:
       * text color
       * background color
       * font size
       * etc.
       */
      TextStyleKit,

      /*
       * Highlight selected text.
       * multicolor allows different highlight colors.
       */
      Highlight.configure({
        multicolor: true,
      }),
    ],

    content: "<p></p>",
  });

  /*
   * Destroy editor when component unmounts.
   */
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  /*
   * Send mail
   */
  const handleSend = async () => {
    setError("");
    setMessage("");

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Please login first.");
      return;
    }

    if (!to.trim()) {
      setError("Please enter the receiver email.");
      return;
    }

    if (!subject.trim()) {
      setError("Please enter a subject.");
      return;
    }

    if (!editor) {
      setError("Editor is not ready.");
      return;
    }

    /*
     * Check whether the editor actually contains text.
     */
    const textContent = editor.getText().trim();

    if (!textContent) {
      setError("Please write something in the mail.");
      return;
    }

    try {
      setLoading(true);

      /*
       * Get Firebase Authentication ID token.
       */
      const idToken = await getIdToken(
        currentUser,
        true
      );

      /*
       * Receiver email entered by user.
       */
      const receiverEmail = to
        .trim()
        .toLowerCase();

      /*
       * Find receiver UID using email.
       *
       * usersByEmail/
       *    encoded-email/
       *       uid
       *       email
       */
      console.log("DATABASE_URL:", DATABASE_URL);
console.log("Receiver email:", receiverEmail);
console.log(
  "Encoded email:",
  encodeEmail(receiverEmail)
);
console.log(
  "Receiver lookup URL:",
  `${DATABASE_URL}/usersByEmail/${encodeEmail(
    receiverEmail
  )}.json`
);
      const receiverResponse = await fetch(
        `${DATABASE_URL}/usersByEmail/${encodeEmail(
          receiverEmail
        )}.json?auth=${idToken}`
      );

      if (!receiverResponse.ok) {
        throw new Error(
          "Unable to find receiver."
        );
      }

      const receiver =
        await receiverResponse.json();

      if (!receiver) {
        setError(
          "No account exists with this email."
        );
        return;
      }

      /*
       * Tiptap gives us HTML directly.
       *
       * Example:
       *
       * <p>Hello <strong>Chinmay</strong></p>
       *
       * <p>
       *   <mark style="background-color: yellow">
       *      Important
       *   </mark>
       * </p>
       */
      const htmlBody = editor.getHTML();

      /*
       * Mail object stored in Firebase.
       */
      const mail = {
        sender: currentUser.email,
        senderUid: currentUser.uid,

        receiver: receiverEmail,
        receiverUid: receiver.uid,

        subject: subject.trim(),

        body: htmlBody,

        createdAt: Date.now(),

        read: false,
      };

      /*
       * ------------------------------------------------
       * STEP 1
       * Store mail in receiver's inbox.
       *
       * POST automatically generates a Firebase key.
       * ------------------------------------------------
       */
      const inboxResponse = await fetch(
        `${DATABASE_URL}/mailboxes/${receiver.uid}/inbox.json?auth=${idToken}`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(mail),
        }
      );

      if (!inboxResponse.ok) {
        throw new Error(
          "Failed to send mail."
        );
      }

      const inboxResult =
        await inboxResponse.json();

      /*
       * Firebase returns:
       *
       * {
       *   "name": "-OABC123..."
       * }
       *
       * We reuse this same ID for Sent.
       */
      const mailId = inboxResult.name;

      /*
       * ------------------------------------------------
       * STEP 2
       * Store the same mail in sender's sentbox.
       * ------------------------------------------------
       */
      const sentResponse = await fetch(
        `${DATABASE_URL}/mailboxes/${currentUser.uid}/sent/${mailId}.json?auth=${idToken}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(mail),
        }
      );

      if (!sentResponse.ok) {
        throw new Error(
          "Mail delivered, but failed to save it in sentbox."
        );
      }

      /*
       * Success
       */
      setMessage(
        "Mail sent successfully!"
      );

      /*
       * Clear form.
       */
      setTo("");
      setSubject("");

      editor.commands.clearContent();
    } catch (error) {
      console.error(
        "Send mail error:",
        error
      );

      setError(
        error.message ||
          "Something went wrong while sending the mail."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Toolbar helper
   */
  const setTextColor = (color) => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .setColor(color)
      .run();
  };

  /*
   * Highlight helper
   */
  const setHighlight = (color) => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .toggleHighlight({
        color,
      })
      .run();
  };

  /*
   * Add link
   */
  const addLink = () => {
    if (!editor) return;

    const previousUrl =
      editor.getAttributes("link").href;

    const url = window.prompt(
      "Enter URL",
      previousUrl || "https://"
    );

    if (url === null) {
      return;
    }

    if (url.trim() === "") {
      editor
        .chain()
        .focus()
        .unsetLink()
        .run();

      return;
    }

    editor
      .chain()
      .focus()
      .setLink({
        href: url.trim(),
      })
      .run();
  };

  /*
   * Editor is not initialized yet.
   */
  if (!editor) {
    return (
      <div className="compose-page">
        <div className="compose-container">
          Loading editor...
        </div>
      </div>
    );
  }

  return (
    <div className="compose-page">
      <div className="compose-container">

        {/* Header */}
        <div className="compose-header">
          <h2>New Message</h2>

          <button
            type="button"
            className="close-button"
            onClick={() => navigate("/")}
          >
            ×
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="compose-error">
            {error}
          </div>
        )}

        {/* Success */}
        {message && (
          <div className="compose-success">
            {message}
          </div>
        )}

        {/* To */}
        <div className="compose-field">
          <input
            type="email"
            placeholder="To"
            value={to}
            onChange={(event) =>
              setTo(event.target.value)
            }
          />
        </div>

        {/* Subject */}
        <div className="compose-field">
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(event) =>
              setSubject(event.target.value)
            }
          />
        </div>

        {/* Toolbar */}
        <div className="editor-toolbar">

          {/* Bold */}
          <button
            type="button"
            title="Bold"
            className={
              editor.isActive("bold")
                ? "toolbar-button active"
                : "toolbar-button"
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleBold()
                .run()
            }
          >
            <strong>B</strong>
          </button>

          {/* Italic */}
          <button
            type="button"
            title="Italic"
            className={
              editor.isActive("italic")
                ? "toolbar-button active"
                : "toolbar-button"
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleItalic()
                .run()
            }
          >
            <em>I</em>
          </button>

          {/* Underline */}
          <button
            type="button"
            title="Underline"
            className={
              editor.isActive("underline")
                ? "toolbar-button active"
                : "toolbar-button"
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleUnderline()
                .run()
            }
          >
            <u>U</u>
          </button>

          {/* Strike */}
          <button
            type="button"
            title="Strikethrough"
            className={
              editor.isActive("strike")
                ? "toolbar-button active"
                : "toolbar-button"
            }
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleStrike()
                .run()
            }
          >
            <s>S</s>
          </button>

          <span className="toolbar-divider"></span>

          {/* Bullet List */}
          <button
            type="button"
            title="Bullet List"
            className="toolbar-button"
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleBulletList()
                .run()
            }
          >
            ☷
          </button>

          {/* Ordered List */}
          <button
            type="button"
            title="Numbered List"
            className="toolbar-button"
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleOrderedList()
                .run()
            }
          >
            ≡
          </button>

          <span className="toolbar-divider"></span>

          {/* Text Color */}
          <div className="color-wrapper">
            <button
              type="button"
              title="Text Color"
              className="toolbar-button color-button"
            >
              A
            </button>

            <div className="color-menu">

              <button
                type="button"
                style={{
                  color: "#000000",
                }}
                onClick={() =>
                  setTextColor("#000000")
                }
              >
                Black
              </button>

              <button
                type="button"
                style={{
                  color: "#dc3545",
                }}
                onClick={() =>
                  setTextColor("#dc3545")
                }
              >
                Red
              </button>

              <button
                type="button"
                style={{
                  color: "#0d6efd",
                }}
                onClick={() =>
                  setTextColor("#0d6efd")
                }
              >
                Blue
              </button>

              <button
                type="button"
                style={{
                  color: "#198754",
                }}
                onClick={() =>
                  setTextColor("#198754")
                }
              >
                Green
              </button>

              <button
                type="button"
                style={{
                  color: "#6f42c1",
                }}
                onClick={() =>
                  setTextColor("#6f42c1")
                }
              >
                Purple
              </button>

            </div>
          </div>

          {/* Highlight */}
          <div className="color-wrapper">
            <button
              type="button"
              title="Highlight"
              className="toolbar-button highlight-button"
            >
              🖍
            </button>

            <div className="color-menu">

              <button
                type="button"
                onClick={() =>
                  setHighlight("#fff59d")
                }
              >
                <span
                  className="color-box"
                  style={{
                    background: "#fff59d",
                  }}
                ></span>
                Yellow
              </button>

              <button
                type="button"
                onClick={() =>
                  setHighlight("#ffccbc")
                }
              >
                <span
                  className="color-box"
                  style={{
                    background: "#ffccbc",
                  }}
                ></span>
                Orange
              </button>

              <button
                type="button"
                onClick={() =>
                  setHighlight("#c8e6c9")
                }
              >
                <span
                  className="color-box"
                  style={{
                    background: "#c8e6c9",
                  }}
                ></span>
                Green
              </button>

              <button
                type="button"
                onClick={() =>
                  setHighlight("#bbdefb")
                }
              >
                <span
                  className="color-box"
                  style={{
                    background: "#bbdefb",
                  }}
                ></span>
                Blue
              </button>

              <button
                type="button"
                onClick={() =>
                  setHighlight("#e1bee7")
                }
              >
                <span
                  className="color-box"
                  style={{
                    background: "#e1bee7",
                  }}
                ></span>
                Purple
              </button>

            </div>
          </div>

          {/* Link */}
          <button
            type="button"
            title="Add Link"
            className={
              editor.isActive("link")
                ? "toolbar-button active"
                : "toolbar-button"
            }
            onClick={addLink}
          >
            🔗
          </button>

          {/* Remove formatting */}
          <button
            type="button"
            title="Remove Formatting"
            className="toolbar-button"
            onClick={() =>
              editor
                .chain()
                .focus()
                .unsetAllMarks()
                .clearNodes()
                .run()
            }
          >
            Tx
          </button>

          <span className="toolbar-divider"></span>

          {/* Undo */}
          <button
            type="button"
            title="Undo"
            className="toolbar-button"
            onClick={() =>
              editor
                .chain()
                .focus()
                .undo()
                .run()
            }
          >
            ↶
          </button>

          {/* Redo */}
          <button
            type="button"
            title="Redo"
            className="toolbar-button"
            onClick={() =>
              editor
                .chain()
                .focus()
                .redo()
                .run()
            }
          >
            ↷
          </button>
        </div>

        {/* Editor */}
        <div className="editor-container">
          <EditorContent editor={editor} />
        </div>

        {/* Footer */}
        <div className="compose-footer">

          <button
            type="button"
            className="send-button"
            onClick={handleSend}
            disabled={loading}
          >
            {loading
              ? "Sending..."
              : "Send"}
          </button>

          <button
            type="button"
            className="delete-button"
            title="Discard"
            onClick={() => {
              setTo("");
              setSubject("");
              setError("");
              setMessage("");

              editor.commands.clearContent();
            }}
          >
            🗑
          </button>

        </div>

      </div>
    </div>
  );
};

export default ComposeMail;