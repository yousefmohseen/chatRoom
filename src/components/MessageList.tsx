import type { Message } from "../types";

export default function MessageList({ messages }: { messages: Message[] }) {
  const STORAGE_KEY = "chat_username";
  const localuser: null | string = localStorage.getItem(STORAGE_KEY)
  return (
    <div>
      <ul>
        {messages.map((m) => (
          <li className={(localuser == m.username ? "justify-start" : "justify-end") + " mb-2.5 flex"} key={m.id}>
            <div>
              <small>{m.username}</small>
              <p className={(localuser == m.username ? "bg-sky-900" : "bg-green-900") + " relative w-[200px] min-w-fit p-3 pb-8 text-white rounded-[10px] wrap-anywhere"}>
                {m.text}
                <small className="absolute bottom-1 right-2">{new Date(m.ts).toLocaleTimeString()}</small>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}