import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ComposeMail from "./components/ComposeMail";
import { onAuthStateChanged } from "firebase/auth";

import Header from "./components/Header";
import Signup from "./components/Signup";
import Login from "./components/Login";

import { auth } from "./firebase/firebase";
import Home from "./components/Home";

// const Home = () => {
//   return (
//     <div style={{ padding: "30px" }}>
//       <h1>Mail Box</h1>

//       <Link to="/compose">
//         <button>Compose Mail</button>
//       </Link>
//     </div>
//   );
// };

const Products = () => {
  return <h1>Products Page</h1>;
};

const About = () => {
  return <h1>About Us</h1>;
};

// Protect pages that require login
const ProtectedRoute = ({ children, user, loading }) => {
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Prevent logged-in users from opening login/signup
const PublicRoute = ({ children, user, loading }) => {
  if (loading) {
    return <div>Loading...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Header />

      <Routes>
        {/* Signup */}
        <Route
          path="/signup"
          element={
            <PublicRoute user={user} loading={loading}>
              <Signup />
            </PublicRoute>
          }
        />

        {/* Login */}
        <Route
          path="/login"
          element={
            <PublicRoute user={user} loading={loading}>
              <Login />
            </PublicRoute>
          }
        />

        {/* Home */}
        <Route
          path="/"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* Products */}
        <Route
          path="/products"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Products />
            </ProtectedRoute>
          }
        />

        {/* About */}
        <Route
          path="/about"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <About />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compose"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <ComposeMail />
            </ProtectedRoute>
          }
        />
        {/* Unknown URL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
