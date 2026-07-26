import { Plus, Settings, User } from "lucide-react";

export function Actions() {
  return (
    <div className="flex items-center gap-3">
      <button className="flex h-10 items-center gap-2 rounded-xl bg-blue-500 px-4 text-sm font-medium text-white transition hover:bg-blue-400">
        <Plus size={16} />
        Add
      </button>

      <button className="rounded-xl p-2 transition hover:bg-white/10">
        <Settings />
      </button>

      <button className="rounded-full bg-zinc-700 p-2 transition hover:bg-zinc-600">
        <User />
      </button>
    </div>
  );
}