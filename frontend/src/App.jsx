import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "./hooks/redux";
import { checkAuth } from "./store/slices/authSlice";
import Navbar from "./components/navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SharedChat from "./pages/SharedChat";
import "./App.css";

function App() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading, initialized, error } = useAppSelector((state) => state.auth);

  useEffect(() => {
    console.log('App mounted, checking auth...');
    if (!initialized) {
      console.log('Dispatching checkAuth...');
      dispatch(checkAuth())
        .then((result) => {
          console.log('checkAuth result:', result);
        })
        .catch((error) => {
          console.error('Error in checkAuth:', error);
        });
    }
  }, [dispatch, initialized]);

  console.log('App render - isAuthenticated:', isAuthenticated, 'initialized:', initialized, 'loading:', loading);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading application...</p>
          {error && (
            <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">
              Error: {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navbar />
        <Routes>
          <Route
            path="/"
            element={isAuthenticated ? <Home /> : <Navigate to="/login" />}
          />
          <Route
            path="/login"
            element={!isAuthenticated ? <Login /> : <Navigate to="/" />}
          />
          <Route
            path="/register"
            element={!isAuthenticated ? <Register /> : <Navigate to="/" />}
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/shared/:token" element={<SharedChat />} />
          <Route
            path="/profile"
            element={isAuthenticated ? <Profile /> : <Navigate to="/login" />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
