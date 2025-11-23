import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useStore } from "./stores/useStore";
import Login from "./pages/Login";
import ChatRoom from "./pages/ChatRoom";
import { useEffect } from "react";

export default function App() {
  const username = useStore((s) => s.username);
  const navigate = useNavigate();
  const STORAGE_KEY = "chat_username";

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)==undefined) {
      navigate("/");
    }
    else{
      navigate("/chat");
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/chat"
        element={username ? <ChatRoom /> : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}