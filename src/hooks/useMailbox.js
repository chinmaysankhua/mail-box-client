import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { auth } from "../firebase/firebase";
import useApi from "./useApi";

const useMailbox = (folder = "inbox") => {
  const { request } = useApi();

  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const emailsRef = useRef([]);

  // -------------------------
  // Compare emails
  // -------------------------

  const areEmailsEqual = (
    oldEmails,
    newEmails
  ) => {
    if (
      oldEmails.length !==
      newEmails.length
    ) {
      return false;
    }

    return oldEmails.every(
      (oldEmail, index) => {
        const newEmail =
          newEmails[index];

        return (
          oldEmail.id === newEmail.id &&
          oldEmail.read === newEmail.read &&
          oldEmail.createdAt ===
            newEmail.createdAt
        );
      }
    );
  };

  // -------------------------
  // Get emails
  // -------------------------

 const fetchEmails = useCallback(
  async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("Please login first.");
      }

      const data = await request(
        `mailboxes/${currentUser.uid}/${folder}`
      );

      const emailList = data
        ? Object.entries(data).map(
            ([id, email]) => ({
              id,
              ...email,
            })
          )
        : [];

      emailList.sort(
        (a, b) =>
          (b.createdAt || 0) -
          (a.createdAt || 0)
      );

      const hasChanged =
        !areEmailsEqual(
          emailsRef.current,
          emailList
        );

      if (hasChanged) {
        emailsRef.current = emailList;
        setEmails(emailList);
      }
    } catch (error) {
      console.error(
        "Fetch emails error:",
        error
      );

      setError(
        error.message ||
          "Unable to load emails."
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  },
  [folder, request]
);

  // -------------------------
  // Poll every 2 seconds
  // -------------------------

  useEffect(() => {
  emailsRef.current = [];

  fetchEmails(true);

  const intervalId = setInterval(() => {
    fetchEmails(false);
  }, 2000);

  return () => {
    clearInterval(intervalId);
  };
}, [fetchEmails]);

  // -------------------------
  // Mark as read
  // -------------------------

  const markAsRead = async (emailId) => {
    try {
      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        throw new Error(
          "Please login first."
        );
      }

      await request(
        `mailboxes/${currentUser.uid}/inbox/${emailId}/read`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(true),
        }
      );

      const updatedEmails =
        emailsRef.current.map(
          (email) =>
            email.id === emailId
              ? {
                  ...email,
                  read: true,
                }
              : email
        );

      emailsRef.current =
        updatedEmails;

      setEmails(updatedEmails);
    } catch (error) {
      console.error(
        "Mark as read error:",
        error
      );

      setError(
        error.message ||
          "Unable to mark email as read."
      );
    }
  };

  // -------------------------
  // Delete email
  // -------------------------

  const deleteEmail = async (
    emailId
  ) => {
    try {
      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        throw new Error(
          "Please login first."
        );
      }

      await request(
        `mailboxes/${currentUser.uid}/${folder}/${emailId}`,
        {
          method: "DELETE",
        }
      );

      const updatedEmails =
        emailsRef.current.filter(
          (email) =>
            email.id !== emailId
        );

      emailsRef.current =
        updatedEmails;

      setEmails(updatedEmails);
    } catch (error) {
      console.error(
        "Delete email error:",
        error
      );

      setError(
        error.message ||
          "Unable to delete email."
      );
    }
  };

  // -------------------------
  // Send email
  // -------------------------

  const sendEmail = async ({
    receiverEmail,
    subject,
    body,
  }) => {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      throw new Error(
        "Please login first."
      );
    }

    const normalizedReceiver =
      receiverEmail
        .trim()
        .toLowerCase();

    /*
     * IMPORTANT:
     * This must be the same email-key
     * function used during signup.
     */
    const encodeEmail = (email) => {
      const normalizedEmail =
        email.trim().toLowerCase();

      const bytes =
        new TextEncoder().encode(
          normalizedEmail
        );

      let binary = "";

      bytes.forEach((byte) => {
        binary += String.fromCharCode(
          byte
        );
      });

      return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    };

    // Find receiver
    const receiver =
      await request(
        `usersByEmail/${encodeEmail(
          normalizedReceiver
        )}`
      );

    if (!receiver) {
      throw new Error(
        "No account exists with this email."
      );
    }

    const mail = {
      sender: currentUser.email,
      senderUid: currentUser.uid,

      receiver:
        normalizedReceiver,

      receiverUid: receiver.uid,

      subject: subject.trim(),

      body,

      createdAt: Date.now(),

      read: false,
    };

    // Add to receiver inbox
    const inboxResult =
      await request(
        `mailboxes/${receiver.uid}/inbox`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(mail),
        }
      );

    const mailId =
      inboxResult.name;

    // Add to sender sentbox
    await request(
      `mailboxes/${currentUser.uid}/sent/${mailId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(mail),
      }
    );

    return mail;
  };

  return {
    emails,
    loading,
    error,
    fetchEmails,
    markAsRead,
    deleteEmail,
    sendEmail,
  };
};

export default useMailbox;