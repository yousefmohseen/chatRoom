
export default function OnlineList({ users }: { users: string[] }) {
  return (
    <div className=" bg-slate-500 rounded-b-[7px]">
      <ul className="*:last:border-none">
        {users.map((u) => (
          <li className="border-b-[1px] border-slate-600" key={u}>{u}</li>
        ))}
      </ul>
    </div>
  );
}