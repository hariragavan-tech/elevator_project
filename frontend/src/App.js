import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./authcontext";
import LoginSelection from "./LoginSelection";
import LoginPage from "./LoginPage";
import ChatPage from "./ChatPage";
import ExpertPanel from "./ExpertPanel";

export default function App() {
  return (
    // Wrap all routes with AuthProvider
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginSelection />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/technician" element={<ChatPage />} />
          <Route path="/expert" element={<ExpertPanel />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}