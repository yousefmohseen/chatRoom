import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../stores/useStore";

export default function Login() {
  const [input, setInput] = useState("");
  const setUsername = useStore((s) => s.setUsername);
  const navigate = useNavigate();

  function join() {
    const name = input.trim();
    if (!name) return;
    setUsername(name);
    navigate("/chat");
  }

  return (
    <div className="w-screen h-screen">
      <div className="bg-amber-50 p-7 absolute top-[50%] left-[50%] translate-[-50%] z-2 text-center border-2 border-amber-100 rounded-[7px] *:rounded-[7px]">
        <h2 className="font-semibold text-4xl mb-12">Enter username</h2>
        <input
          className="w-full p-1.5 pl-2.5 border-2 border-praim1  focus:outline-2 focus-visible:outline-praim2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Your name"
        />
        <button className="w-full mt-6 p-1.5 font-medium text-white bg-green-950 cursor-pointer" onClick={join}>Join Chat</button>
      </div>
    </div>
  );
}