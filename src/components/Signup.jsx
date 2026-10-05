import { useState } from "react";
import { Form, Button, Alert } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";

import { auth } from "../firebase/firebase";
import "./Signup.css";

const Signup = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isFormValid =
    email.trim() !== "" &&
    password.trim() !== "" &&
    confirmPassword.trim() !== "" &&
    password === confirmPassword;

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!email || !password || !confirmPassword) {
      setError("All fields are mandatory.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await createUserWithEmailAndPassword(auth, email, password);

      console.log("User has successfully signed up");

      // Firebase automatically signs the user in after signup.
      // We sign them out so they follow the normal signup -> login flow.
      await signOut(auth);

      navigate("/login", {
        state: {
          message: "Account created successfully. Please login.",
        },
      });
    } catch (error) {
      console.error(error);

      switch (error.code) {
        case "auth/email-already-in-use":
          setError("An account with this email already exists.");
          break;

        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;

        case "auth/weak-password":
          setError("Password must be at least 6 characters.");
          break;

        case "auth/network-request-failed":
          setError("Network error. Please check your internet connection.");
          break;

        case "auth/operation-not-allowed":
          setError("Email/password authentication is not enabled in Firebase.");
          break;

        default:
          setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <main className="signup-container">
        <div className="signup-card">
          <h2>SignUp</h2>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="signup-form-group">
              <Form.Control
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Form.Group>

            <Form.Group className="signup-form-group">
              <div className="password-wrapper">
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i
                    className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}
                  ></i>
                </button>
              </div>
            </Form.Group>

            <Form.Group className="signup-form-group">
              <div className="password-wrapper">
                <Form.Control
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  <i
                    className={`bi ${
                      showConfirmPassword ? "bi-eye-slash" : "bi-eye"
                    }`}
                  ></i>
                </button>
              </div>

              {confirmPassword && password !== confirmPassword && (
                <div className="password-error">Passwords do not match.</div>
              )}
            </Form.Group>

            <Button
              type="submit"
              className="signup-button"
              disabled={!isFormValid || loading}
            >
              {loading ? "Creating account..." : "Sign up"}
            </Button>
          </Form>
        </div>

        <div className="login-box">
          Have an account? <Link to="/login">Login</Link>
        </div>
      </main>
    </div>
  );
};

export default Signup;
