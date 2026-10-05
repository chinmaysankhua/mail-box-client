import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth } from "../firebase/firebase";
import "./Header.css";

const Header = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="header">
      <nav className="navigation">
        <Link to="/">Home</Link>
        <Link to="/products">Products</Link>
        <Link to="/about">About Us</Link>
      </nav>

      <div className="header-auth">
        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            className="logout-button"
          >
            Logout
          </button>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;