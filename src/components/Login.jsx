import { useState } from "react";
import { Form, Button, Alert } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";

import { auth } from "../firebase/firebase";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isFormValid = email.trim() !== "" && password.trim() !== "";

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!isFormValid) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(auth, email, password);

      console.log("User has successfully logged in");

      navigate("/");
    } catch (error) {
      console.error(error);

      switch (error.code) {
        case "auth/invalid-credential":
          setError(
            "Invalid email or password. If you don't have an account, please sign up first.",
          );
          break;

        case "auth/user-not-found":
          setError("No account found. Please sign up first.");
          break;

        case "auth/wrong-password":
          setError("Incorrect password.");
          break;

        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;

        case "auth/too-many-requests":
          setError("Too many failed attempts. Please try again later.");
          break;

        case "auth/network-request-failed":
          setError("Network error. Please check your internet connection.");
          break;

        default:
          setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <main className="login-container">
        <div className="login-card">
          <h2>Login</h2>

          {location.state?.message && (
            <Alert variant="success">{location.state.message}</Alert>
          )}

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="login-form-group">
              <Form.Control
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Form.Group>

            <Form.Group className="login-form-group">
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

            <Button
              type="submit"
              className="login-button"
              disabled={!isFormValid || loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </Form>
        </div>

        <div className="signup-box">
          Don't have an account? <Link to="/signup">Sign up first</Link>
        </div>
      </main>
    </div>
  );
};

export default Login;
