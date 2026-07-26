import { SearchIcon } from "lucide-react";

export function Search() {
  return (
    <div className="flex h-11 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4">
      <SearchIcon
        size={18}
        className="text-zinc-500"
      />

      <input
        placeholder="Search memories..."
        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
      />
    </div>
  );
}