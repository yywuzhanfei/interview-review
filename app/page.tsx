"use client";

import { useMemo, useState } from "react";
import cards from "@/data/cards.json";

type Card = {
  id: string;
  domain: string;
  type: string;
  topic: string;
  difficulty: number;
  front: string;
  check: string;
  tags?: string[];
  cooldown_hours?: number;
  is_active?: boolean;
};

const allCards = cards as Card[];

const domains = ["all", ...new Set(allCards.map((c) => c.domain))];
const types = ["all", ...new Set(allCards.map((c) => c.type))];

export default function Home() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("all");
  const [cardType, setCardType] = useState("all");
  const [maxDifficulty, setMaxDifficulty] = useState(5);
  const [activeOnly, setActiveOnly] = useState(true);
  const [selected, setSelected] = useState<Card | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return allCards.filter((c) => {
      if (activeOnly && !c.is_active) return false;
      if (domain !== "all" && c.domain !== domain) return false;
      if (cardType !== "all" && c.type !== cardType) return false;
      if (c.difficulty > maxDifficulty) return false;

      if (!q) return true;

      const haystack = [
        c.id,
        c.topic,
        c.front,
        c.check,
        c.domain,
        c.type,
        ...(c.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [activeOnly, cardType, domain, maxDifficulty, query]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">Algo Pocket</h1>
          <p className="text-slate-400 text-sm md:text-base">
            手机随时看算法/系统设计卡片（共 {allCards.length} 张）
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 topic / tags / 内容..."
            className="md:col-span-2 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-sky-500"
          />

          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2"
          >
            {domains.map((d) => (
              <option key={d} value={d}>
                domain: {d}
              </option>
            ))}
          </select>

          <select
            value={cardType}
            onChange={(e) => setCardType(e.target.value)}
            className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                type: {t}
              </option>
            ))}
          </select>

          <div className="md:col-span-2 flex items-center gap-3 text-sm">
            <label className="text-slate-300">难度 ≤ {maxDifficulty}</label>
            <input
              type="range"
              min={1}
              max={5}
              value={maxDifficulty}
              onChange={(e) => setMaxDifficulty(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            只看 active
          </label>

          <div className="text-sm text-slate-400 flex items-center">
            命中：{filtered.length}
          </div>
        </section>

        <section className="grid gap-3">
          {filtered.map((card) => (
            <button
              key={card.id}
              onClick={() => setSelected(card)}
              className="min-w-0 text-left p-4 rounded-xl border border-slate-800 bg-slate-900 hover:border-sky-500 transition"
            >
              <div className="flex items-start justify-between gap-2 min-w-0">
                <p className="font-semibold break-words [overflow-wrap:anywhere]">{card.topic}</p>
                <span className="text-xs text-slate-400 shrink-0">{card.id}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400 break-words [overflow-wrap:anywhere]">
                {card.domain} · {card.type} · difficulty {card.difficulty}
              </p>
              {card.tags?.length ? (
                <div className="mt-2 flex flex-wrap gap-1 min-w-0">
                  {card.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          ))}
        </section>
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/70 p-4 md:p-8 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            className="mx-auto max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{selected.topic}</h2>
                <p className="text-sm text-slate-400">
                  {selected.id} · {selected.domain} · {selected.type} · difficulty {selected.difficulty}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-sm px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700"
              >
                关闭
              </button>
            </div>

            <article className="space-y-2 min-w-0">
              <h3 className="font-semibold text-sky-300">Card</h3>
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-slate-200 leading-7">{selected.front}</p>
            </article>

            <article className="space-y-2 min-w-0">
              <h3 className="font-semibold text-emerald-300">Check</h3>
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-slate-200 leading-7">{selected.check}</p>
            </article>
          </div>
        </div>
      )}
    </main>
  );
}
