const encodeEmail = (email) => {
  const normalizedEmail = email.trim().toLowerCase();

  const bytes = new TextEncoder().encode(
    normalizedEmail
  );

  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export default encodeEmail;