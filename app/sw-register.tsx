"use client";

import { useEffect, useState } from "react";

export default function SWRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdate(true);
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(newWorker);
              setShowUpdate(true);
            }
          });
        });
      })
      .catch((err) => console.error("SW register failed", err));
  }, []);

  const applyUpdate = () => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed top-3 left-1/2 z-[9999] -translate-x-1/2 rounded-xl border border-sky-500/40 bg-slate-900/95 px-3 py-2 shadow-lg backdrop-blur">
      <div className="flex items-center gap-2 text-xs md:text-sm text-slate-100">
        <span>发现新版本</span>
        <button
          onClick={applyUpdate}
          className="rounded-md bg-sky-500 px-2 py-1 text-slate-950 font-semibold"
        >
          立即更新
        </button>
      </div>
    </div>
  );
}
