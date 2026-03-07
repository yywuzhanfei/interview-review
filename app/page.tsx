"use client";

import { useEffect, useMemo, useState } from "react";
import cards from "@/data/cards.json";

type Card = {
  id: string;
  domain: string;
  type: string;
  topic: string;
  difficulty: number;
  front: string;
  front_zh?: string;
  check: string;
  check_q_en?: string;
  check_a_en?: string;
  tags?: string[];
  cooldown_hours?: number;
  is_active?: boolean;
};

type Grade = "again" | "hard" | "good";

type ReviewEntry = {
  cardId: string;
  lastReviewedAt?: number;
  nextReviewAt?: number;
  intervalDays: number;
  ease: number;
  streak: number;
  totalReviews: number;
  lastGrade?: Grade;
};

type ReviewState = {
  storageVersion: 1;
  entries: Record<string, ReviewEntry>;
};

const STORAGE_KEY = "algo-pocket-review-v1";
const NEW_DAILY_LIMIT = 15;
const DUE_DAILY_LIMIT = 80;

const allCards = (cards as Card[]).filter((c) => c.is_active !== false);
const domains = ["all", ...new Set(allCards.map((c) => c.domain))];
const types = ["all", ...new Set(allCards.map((c) => c.type))];

function defaultEntry(cardId: string): ReviewEntry {
  return {
    cardId,
    intervalDays: 1,
    ease: 2.5,
    streak: 0,
    totalReviews: 0,
  };
}

function loadState(): ReviewState {
  if (typeof window === "undefined") return { storageVersion: 1, entries: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { storageVersion: 1, entries: {} };
    const parsed = JSON.parse(raw) as ReviewState;
    if (parsed?.storageVersion !== 1 || !parsed?.entries) {
      return { storageVersion: 1, entries: {} };
    }
    return parsed;
  } catch {
    return { storageVersion: 1, entries: {} };
  }
}

function saveState(state: ReviewState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nextEntry(prev: ReviewEntry, grade: Grade): ReviewEntry {
  const now = Date.now();
  let intervalDays = Math.max(1, prev.intervalDays || 1);
  let ease = prev.ease || 2.5;
  let streak = prev.streak || 0;

  if (grade === "again") {
    intervalDays = 1;
    ease = Math.max(1.3, ease - 0.2);
    streak = 0;
  } else if (grade === "hard") {
    intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
    ease = Math.max(1.3, ease - 0.05);
    streak += 1;
  } else {
    intervalDays = Math.max(1, Math.round(intervalDays * ease));
    ease = Math.min(3.5, ease + 0.03);
    streak += 1;
  }

  return {
    ...prev,
    intervalDays,
    ease,
    streak,
    totalReviews: (prev.totalReviews || 0) + 1,
    lastGrade: grade,
    lastReviewedAt: now,
    nextReviewAt: now + intervalDays * 24 * 60 * 60 * 1000,
  };
}

function RichText({ text }: { text: string }) {
  const source = String(text || "");
  const regex = /```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g;
  const parts: Array<{ kind: "text" | "code"; value: string; lang?: string }> = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(source)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ kind: "text", value: source.slice(lastIndex, match.index) });
    }
    parts.push({ kind: "code", lang: match[1] || "text", value: match[2] || "" });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < source.length) {
    parts.push({ kind: "text", value: source.slice(lastIndex) });
  }

  return (
    <div className="space-y-3 min-w-0">
      {parts.map((part, idx) =>
        part.kind === "code" ? (
          <div key={idx} className="rounded-lg border border-slate-700 bg-slate-950 overflow-x-auto">
            <div className="px-3 pt-2 text-[10px] uppercase tracking-wide text-slate-500">{part.lang}</div>
            <pre className="p-3 text-sm text-slate-100 leading-6 whitespace-pre">
              <code>{part.value.trimEnd()}</code>
            </pre>
          </div>
        ) : (
          <p
            key={idx}
            className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-slate-200 leading-7"
          >
            {part.value}
          </p>
        )
      )}
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<"review" | "library">("review");
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("all");
  const [cardType, setCardType] = useState("all");
  const [maxDifficulty, setMaxDifficulty] = useState(5);
  const [selected, setSelected] = useState<Card | null>(null);

  const [state, setState] = useState<ReviewState>({ storageVersion: 1, entries: {} });
  const [queue, setQueue] = useState<string[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const reviewPlan = useMemo(() => {
    const now = Date.now();
    const due: Card[] = [];
    const fresh: Card[] = [];

    for (const c of allCards) {
      const e = state.entries[c.id];
      if (!e?.nextReviewAt) {
        fresh.push(c);
      } else if (e.nextReviewAt <= now) {
        due.push(c);
      }
    }

    due.sort((a, b) => {
      const ea = state.entries[a.id]?.nextReviewAt || 0;
      const eb = state.entries[b.id]?.nextReviewAt || 0;
      return ea - eb;
    });

    fresh.sort((a, b) => a.id.localeCompare(b.id));

    const dueToday = due.slice(0, DUE_DAILY_LIMIT);
    const newToday = fresh.slice(0, NEW_DAILY_LIMIT);
    return {
      due: dueToday,
      fresh: newToday,
      queueIds: [...dueToday.map((c) => c.id), ...newToday.map((c) => c.id)],
      dueTotal: due.length,
      freshTotal: fresh.length,
    };
  }, [state.entries]);

  useEffect(() => {
    setQueue(reviewPlan.queueIds);
    setDoneCount(0);
    setShowAnswer(false);
  }, [reviewPlan.queueIds.join("|")]);

  const currentCard = useMemo(() => {
    const id = queue[0];
    return allCards.find((c) => c.id === id) || null;
  }, [queue]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCards.filter((c) => {
      if (domain !== "all" && c.domain !== domain) return false;
      if (cardType !== "all" && c.type !== cardType) return false;
      if (c.difficulty > maxDifficulty) return false;
      if (!q) return true;
      const text = [
        c.id,
        c.topic,
        c.front_zh || c.front,
        c.check_q_en || c.check,
        c.check_a_en || "",
        c.domain,
        c.type,
        ...(c.tags || []),
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [query, domain, cardType, maxDifficulty]);

  const gradeCard = (grade: Grade) => {
    if (!currentCard) return;

    setState((prev) => {
      const oldEntry = prev.entries[currentCard.id] || defaultEntry(currentCard.id);
      const updated = nextEntry(oldEntry, grade);
      return {
        ...prev,
        entries: {
          ...prev.entries,
          [currentCard.id]: updated,
        },
      };
    });

    setQueue((q) => {
      const [, ...rest] = q;
      if (grade === "again") return [...rest, currentCard.id];
      return rest;
    });

    setDoneCount((n) => n + 1);
    setShowAnswer(false);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">Algo Pocket</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setTab("review")}
              className={`px-3 py-1.5 rounded-lg border text-sm ${
                tab === "review" ? "bg-sky-500 text-slate-950 border-sky-400" : "bg-slate-900 border-slate-700"
              }`}
            >
              今日复习
            </button>
            <button
              onClick={() => setTab("library")}
              className={`px-3 py-1.5 rounded-lg border text-sm ${
                tab === "library" ? "bg-sky-500 text-slate-950 border-sky-400" : "bg-slate-900 border-slate-700"
              }`}
            >
              卡片库
            </button>
          </div>
        </header>

        {tab === "review" ? (
          <section className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs md:text-sm">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">Due: {reviewPlan.due.length}</div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">New: {reviewPlan.fresh.length}</div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">Done: {doneCount}</div>
            </div>

            {!currentCard ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="font-semibold">今天任务清空了 🎉</p>
                <p className="text-sm text-slate-400 mt-1">总待复习：{reviewPlan.dueTotal}，新卡库存：{reviewPlan.freshTotal}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <p className="text-xs text-slate-400">{currentCard.id} · {currentCard.domain} · {currentCard.type} · 难度 {currentCard.difficulty}</p>
                <h2 className="text-lg font-semibold break-words [overflow-wrap:anywhere]">{currentCard.topic}</h2>
                <RichText text={currentCard.front_zh || currentCard.front} />

                <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 space-y-2">
                  <p className="text-sm font-semibold text-emerald-300 mb-1">English Q&A</p>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Question</p>
                    <RichText text={currentCard.check_q_en || currentCard.check} />
                  </div>
                  {showAnswer ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Answer</p>
                      <RichText text={currentCard.check_a_en || "(No answer yet)"} />
                    </div>
                  ) : null}
                </div>

                {!showAnswer ? (
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="w-full rounded-lg bg-sky-500 text-slate-950 font-semibold py-2"
                  >
                    显示答案
                  </button>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => gradeCard("again")} className="rounded-lg bg-rose-500/90 py-2 text-sm font-semibold">Again</button>
                    <button onClick={() => gradeCard("hard")} className="rounded-lg bg-amber-500/90 py-2 text-sm font-semibold">Hard</button>
                    <button onClick={() => gradeCard("good")} className="rounded-lg bg-emerald-500/90 py-2 text-sm font-semibold text-slate-950">Good</button>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索 topic / tags / 内容..."
                className="md:col-span-2 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-sky-500"
              />

              <select value={domain} onChange={(e) => setDomain(e.target.value)} className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2">
                {domains.map((d) => (
                  <option key={d} value={d}>domain: {d}</option>
                ))}
              </select>

              <select value={cardType} onChange={(e) => setCardType(e.target.value)} className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2">
                {types.map((t) => (
                  <option key={t} value={t}>type: {t}</option>
                ))}
              </select>

              <div className="md:col-span-2 min-w-0 flex flex-col md:flex-row md:items-center gap-2 md:gap-3 text-sm">
                <label className="text-slate-300 shrink-0">难度 ≤ {maxDifficulty}</label>
                <input type="range" min={1} max={5} value={maxDifficulty} onChange={(e) => setMaxDifficulty(Number(e.target.value))} className="w-full md:flex-1 min-w-0" />
              </div>

              <div className="text-sm text-slate-400 flex items-center">命中：{filtered.length}</div>
            </section>

            <section className="grid gap-3">
              {filtered.map((card) => (
                <button key={card.id} onClick={() => setSelected(card)} className="min-w-0 text-left p-4 rounded-xl border border-slate-800 bg-slate-900 hover:border-sky-500 transition">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 min-w-0">
                    <p className="font-semibold min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{card.topic}</p>
                    <span className="text-xs text-slate-400 shrink-0">{card.id}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400 break-words [overflow-wrap:anywhere]">{card.domain} · {card.type} · difficulty {card.difficulty}</p>
                  {card.tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1 min-w-0">
                      {card.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700">#{tag}</span>
                      ))}
                    </div>
                  ) : null}
                </button>
              ))}
            </section>
          </>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/70 p-4 md:p-8 overflow-y-auto" onClick={() => setSelected(null)}>
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{selected.topic}</h2>
                <p className="text-sm text-slate-400">{selected.id} · {selected.domain} · {selected.type} · difficulty {selected.difficulty}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-sm px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">关闭</button>
            </div>

            <article className="space-y-2 min-w-0">
              <h3 className="font-semibold text-sky-300">Card (中文主体)</h3>
              <RichText text={selected.front_zh || selected.front} />
            </article>

            <article className="space-y-2 min-w-0">
              <h3 className="font-semibold text-emerald-300">English Q&A</h3>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Question</p>
                <RichText text={selected.check_q_en || selected.check} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Answer</p>
                <RichText text={selected.check_a_en || "(No answer yet)"} />
              </div>
            </article>
          </div>
        </div>
      )}
    </main>
  );
}
