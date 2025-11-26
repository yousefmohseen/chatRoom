import { useEffect, useState, useCallback, useRef } from "react";
import { socket } from "../socket";
import { useStore } from "../stores/useStore";
import MessageList from "../components/MessageList";
import OnlineList from "../components/OnlineList";
import type { Message } from "../types";
import { useNavigate } from "react-router-dom";
import type { EmojiClickData } from "emoji-picker-react";
import Picker from "emoji-picker-react";

export default function ChatRoom() {
  const username = useStore((s) => s.username);
  const addMessage = useStore((s) => s.addMessage);
  const setMessages = useStore((s) => s.setMessages);
  const setOnline = useStore((s) => s.setOnline);
  const clear = useStore((s) => s.clear);
  const messages = useStore((s) => s.messages);
  const online = useStore((s) => s.online);
  const [text, setText] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [showPopUpLeave, setShowPopUpLeave] = useState(false);
  const [showSidNav, setshowSidNav] = useState(false);

  const navigate = useNavigate();

  // stable handlers so we can off(...) them on cleanup
  const handleInit = useCallback(
    (payload: { messages: Message[]; online: string[]; knownUsers?: string[] }) => {
      if (payload.messages) setMessages(payload.messages);
      if (payload.online) setOnline(payload.online);
    },
    [setMessages, setOnline]
  );

  const handleMessage = useCallback(
    (m: Message) => {
      addMessage(m);
    },
    [addMessage]
  );

  const handleOnline = useCallback(
    (list: string[]) => {
      setOnline(list);
    },
    [setOnline]
  );

  const handleMessages = useCallback(
    (msgs: Message[]) => {
      setMessages(msgs);
    },
    [setMessages]
  );

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    // connect and register event handlers
    socket.connect();

    // emit join AFTER connecting and wait for server ack to handle duplicate-name rejection
    socket.emit("join", username, (res: { ok: boolean; err?: string } | undefined) => {
      if (!res) {
        console.error("No response from server on join");
        clear();
        try {
          if (socket.connected) socket.disconnect();
        } catch (err) { }
        navigate("/");
        return;
      }
      if (!res.ok) {
        alert(res.err || "Failed to join: username not available");
        clear();
        try {
          if (socket.connected) socket.disconnect();
        } catch (err) { }
        navigate("/");
      }
      // else join succeeded; server will send init event
    });

    socket.on("init", handleInit);
    socket.on("message", handleMessage);
    socket.on("online", handleOnline);
    socket.on("messages", handleMessages); // full list updates

    // cleanup: remove handlers and disconnect
    return () => {
      socket.off("init", handleInit);
      socket.off("message", handleMessage);
      socket.off("online", handleOnline);
      socket.off("messages", handleMessages);
      try {
        if (socket.connected) socket.disconnect();
      } catch (err) {
        // ignore
      }
    };
    // include username so if it changes the effect re-runs; handlers are stable via useCallback
  }, [username, navigate, handleInit, handleMessage, handleOnline, handleMessages, clear]);

  function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;
    socket.emit("message", { username, text: trimmed });
    setText("");
    // server will echo the message back in "message" event, so we don't add locally here
  }

  // Leave chat (does NOT delete messages). Clear localStorage and local state.
  const leave = (x: boolean) => {
    if (x == true) {
      setShowPopUpLeave(true)
    }
    else {
      setShowPopUpLeave(false)
    }
  }
  function leaveChat() {
    if (!username) {
      navigate("/");
      return;
    }

    socket.emit("leave", username, (res: { ok: boolean; err?: string } | undefined) => {
      if (!res || !res.ok) {
        console.error("Leave failed:", res?.err);
        // still perform local cleanup & navigate
      }
      clear(); // clear store and also remove localStorage via clear()
      try {
        if (socket.connected) socket.disconnect();
      } catch (err) {
        // ignore
      }
      navigate("/");
    });
  }

  // Delete only this user's messages (stay in chat)
  function deleteMessages() {
    if (!username) return;
    // First ask server to delete this user's messages. Use the server's
    // expected event name `delete_user_messages` and wait for the ack.
    // Ask the server to remove the user's account and related data.
    socket.emit(
      "delete_user_account",
      username,
      (res: { ok: boolean; removedCount?: number; err?: string } | undefined) => {
        if (!res) {
          console.error("No response for delete_user_account");
        } else if (!res.ok) {
          console.error("Failed to delete account:", res.err);
        } else {
          console.log(`Deleted account/messages (${res.removedCount ?? 0}) for ${username}`);
        }

        // Local cleanup: remove stored username and reset state first, then navigate.
        try {
        } catch (err) {
          // ignore
        }

        try {
          if (socket.connected) socket.disconnect();
        } catch (err) {
          // ignore
        }

      }
    );
    clear(); // clear store and also remove localStorage via clear()
    navigate("/");
  }

  // Emoji picker handler
  const onEmojiClick = useCallback((emojiData: EmojiClickData, _event: MouseEvent) => {
    // emojiData.emoji contains the unicode emoji string
    // append emoji to the text input
    setText((t) => t + (emojiData.emoji ?? ""));
    // optionally close the picker after selection:
    setShowPicker(false);
  }, []);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // compute system statuses (one per user: last status only) and filter messages
  const { statuses, nonSystemMessages, otherSystemMessages } = (() => {
    const map = new Map<string, Message>();
    const others: Message[] = [];
    const otherSys: Message[] = [];

    for (const m of messages) {
      if (m.username === "System") {
        // Try to extract the affected username from the system text
        // examples: "alice joined the chat", "bob left the chat", "carol deleted their messages (3 removed)"
        const match = /^(.+?)\s+(joined|left|deleted)\b/i.exec(m.text);
        if (match) {
          const affected = match[1];
          // keep the last system message for this affected user
          map.set(affected, m);
        } else {
          // non-user-specific system message
          otherSys.push(m);
        }
      } else {
        others.push(m);
      }
    }

    return {
      statuses: Array.from(map.values()),
      nonSystemMessages: others,
      otherSystemMessages: otherSys
    };
  })();

  useEffect(() => {
    const element = containerRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [nonSystemMessages]);


  return (
    <div>
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-4xl mb-10 p-2 pl-4 max-mob:mb-5 max-mob:text-2xl">Chat Room</h2>
        {(statuses.length > 0 || otherSystemMessages.length > 0) && (
          <div className="p-1.5">
            <div className="bg-slate-700 text-white p-2 rounded-[7px] mb-2">
              <strong className="block mb-1 max-mob:text-[15px]">Status List User</strong>
              <div className="flex flex-wrap gap-2 overflow-y-scroll max-tab-min:h-7 max-tab-min:flex-nowrap max-tab-min:flex-col">
                {statuses.map((s) => (
                  <span key={s.id} className="px-2 py-1 bg-slate-600 rounded text-sm">
                    {s.text}
                  </span>
                ))}

              </div>
            </div>
          </div>
        )}
        <div className="hidden m-4 max-mob:block" onClick={() => setshowSidNav(!showSidNav)}>
          <span className={!showSidNav ? "block" :"hidden"}>
            <i className="fa-solid fa-bars"></i>
          </span>
          <span className={showSidNav ? "block" :"hidden"}>
            <i className="fa-solid fa-close"></i>
          </span>
        </div>
      </div>

      <div className="w-full h-sp3 flex">
        <div className={(showSidNav ? "max-mob:flex":"max-mob:hidden")+" w-[33%] p-sp2 text-white text-center flex flex-col justify-between max-tab-min:p-5 max-mob:p-2.5 max-mob:absolute max-mob:z-50 max-mob:gap-3.5 max-mob:bg-white"}>
          <div >
            <h4 className=" bg-slate-600 relative border-b-2 border-slate-800 rounded-t-[7px]">
              <strong className="text-2xl">Online</strong>
              <span className="w-6 h-6 bg-green-900 rounded-full font-medium absolute -right-3 -top-3">{online.length}</span>
            </h4>
            <OnlineList users={online} />
          </div>
          <button className="p-2.5 bg-red-800  rounded-[7px] cursor-pointer" onClick={() => leave(true)}>Leave Chat</button>
          <div className={(showPopUpLeave == true ? "block" : "hidden") + " absolute left-0 top-0 z-2 w-full h-full p-2.5"}>
            <div className="w-[75%] h-[50%] bg-amber-50 border-2 border-amber-100 rounded-[7px] absolute top-[50%] left-[50%] translate-[-50%] z-3">
              <span className="p-3 text-red-700 font-medium border-l-2 border-b-2 border-amber-100 cursor-pointer absolute right-0 top-0 z-4" onClick={() => leave(false)}>
                <i className="fa-solid fa-arrow-left"></i>
              </span>
              <div className="flex justify-around items-center h-full *:p-1.5 *:bg-red-800 *:rounded-[7px] *:cursor-pointer ">
                <button onClick={leaveChat}>Leave Chat</button>
                <button onClick={deleteMessages}>Delete & Leave</button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-full h-sp3">

          <div ref={containerRef} className="h-full pb-12 p-sp1 overflow-y-scroll max-tab-min:p-5">
            <MessageList messages={nonSystemMessages} />
          </div>
          <div className="w-[93%] absolute bottom-0 left-sp1 max-tab-min:left-5">
            <div className="w-full h-12 flex backdrop-blur-sm rounded-[7px]">
              <input
                className="w-full p-2 outline-none border-2 border-praim2 focus:border-praim1 rounded-l-[7px]"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message"
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage(text);
                }}
                style={{ flex: 1 }}
              />
              <button className="w-12 p-2 border-t-2 border-b-2 border-praim2 cursor-pointer" onClick={() => setShowPicker((s) => !s)} aria-label="Toggle emoji picker">
                😊
              </button>
              <button className="px-8 border-2 border-praim2 rounded-r-[7px] cursor-pointer" onClick={() => sendMessage(text)}>Send</button>
            </div>
            <div className="absolute bottom-12">
              {showPicker && (
                <div>
                  <Picker onEmojiClick={onEmojiClick} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}