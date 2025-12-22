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
  const { isAuthenticated, initialized, error } = useAppSelector(
    (state) => state.auth
  );
  
  useEffect(() => {
    if (!initialized) {
      dispatch(checkAuth());
    }
  }, [dispatch, initialized]);

  return (
    <Router>
      {!initialized ? (
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
      ) : (
        <div className="h-screen flex flex-col bg-background">
          <Navbar />

          <Routes>
            <Route
              path="/"
              element={
                isAuthenticated ? <Home /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/login"
              element={
                !isAuthenticated ? <Login /> : <Navigate to="/" replace />
              }
            />
            <Route
              path="/register"
              element={
                !isAuthenticated ? <Register /> : <Navigate to="/" replace />
              }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/shared/:token" element={<SharedChat />} />
            <Route
              path="/profile"
              element={
                isAuthenticated ? <Profile /> : <Navigate to="/login" replace />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      )}
    </Router>
  );
}

export default App;
