import { useCallback } from "react";
import { getIdToken } from "firebase/auth";

import { auth } from "../firebase/firebase";

const DATABASE_URL =
  import.meta.env.VITE_FIREBASE_DATABASE_URL;

const useApi = () => {
  const request = useCallback(
    async (path, options = {}) => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("Please login first.");
      }

      const idToken =
        await getIdToken(currentUser);

      const url =
        `${DATABASE_URL}/${path}.json?auth=${idToken}`;

      const response = await fetch(
        url,
        options
      );

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status}`
        );
      }

      return response.json();
    },
    []
  );

  return {
    request,
  };
};

export default useApi;