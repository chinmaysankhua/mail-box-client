import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import { auth } from "../firebase/firebase";
import "./Header.css";

const Header = () => {
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] =
    useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
        }
      );

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowProfile(false);
      navigate("/login");
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };

  return (
    <>
      <header className="header">

        <nav className="navigation">
          <Link to="/">Home</Link>

          <Link to="/products">
            Products
          </Link>

          <Link to="/about">
            About Us
          </Link>
        </nav>

        <div className="header-auth">

          {user ? (
            <>
              <button
                type="button"
                className="profile-button"
                onClick={() =>
                  setShowProfile(
                    !showProfile
                  )
                }
              >
                <i className="bi bi-person-circle"></i>

                <span>
                  {user.email}
                </span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="logout-button"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                Login
              </Link>

              <Link to="/signup">
                Sign Up
              </Link>
            </>
          )}

        </div>
      </header>

      {showProfile && user && (
        <div
          className="profile-overlay"
          onClick={() =>
            setShowProfile(false)
          }
        >
          <div
            className="profile-card"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="profile-header">
              <h2>Profile</h2>

              <button
                type="button"
                className="profile-close"
                onClick={() =>
                  setShowProfile(false)
                }
              >
                ×
              </button>
            </div>

            <div className="profile-avatar">
              <i className="bi bi-person-fill"></i>
            </div>

            <div className="profile-info">

              <h3>
                {user.email}
              </h3>

              <div className="profile-field">
                <span>
                  Email Address
                </span>

                <strong>
                  {user.email}
                </strong>
              </div>

              <div className="profile-field">
                <span>
                  Account Status
                </span>

                <strong>
                  Active
                </strong>
              </div>

            </div>

            <button
              type="button"
              className="profile-close-button"
              onClick={() =>
                setShowProfile(false)
              }
            >
              Close
            </button>

          </div>
        </div>
      )}
    </>
  );
};

export default Header;