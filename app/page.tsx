"use client";

import { useEffect, useState } from "react";

type XAccount = {
  username: string;
  name: string;
  description?: string | null;
  profile_image_url?: string | null;
  followers_count: number;
  following_count: number;
  tweet_count: number;
};

type NicheProfile = {
  topics: string[];
  audience: string;
  expertise: string[];
  voice_notes: string;
};

const navItems = ["Overview", "Opportunities", "Content", "Replies", "People", "Analytics"];

const opportunities = [
  {
    text: "AI agents are only useful when you can trust what they do. The approval layer is becoming the real product.",
    author: "@builder_signal",
    topic: "AI agents",
    score: 94,
    reason: "High niche relevance + active conversation",
  },
  {
    text: "Spent four hours debugging a feature that looked completely fine from the frontend.",
    author: "@devnotes",
    topic: "Development",
    score: 89,
    reason: "Strong story opportunity for a builder account",
  },
  {
    text: "What is the best way to validate a SaaS idea before spending months building it?",
    author: "@indiebuilds",
    topic: "Product building",
    score: 84,
    reason: "Direct audience match + question format",
  },
];

const defaultNiche: NicheProfile = {
  topics: ["Development", "AI", "Building products", "Vibe coding", "Monetization"],
  audience: "Developers, AI builders, indie hackers and people interested in building and monetizing products.",
  expertise: ["Product development", "AI tools", "Vibe coding"],
  voice_notes: "Direct, practical, curious and honest. Prefer real building experiences over generic advice.",
};

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [account, setAccount] = useState<XAccount | null>(null);
  const [niche, setNiche] = useState<NicheProfile>(defaultNiche);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingNiche, setSavingNiche] = useState(false);
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState<number[]>([]);

  const visible = opportunities.filter((_, index) => !dismissed.includes(index));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("x_connected");
    const error = params.get("x_error");
    if (connected) setMessage("X account connected successfully.");
    if (error) setMessage(error);
    if (connected || error) window.history.replaceState({}, "", window.location.pathname);

    Promise.all([
      fetch("/api/x/status").then((response) => response.json()),
      fetch("/api/niche").then((response) => response.json()),
    ])
      .then(([xData, nicheData]) => {
        setAccount(xData.account ?? null);
        if (nicheData.profile) setNiche(nicheData.profile);
      })
      .catch(() => setMessage("Could not load account setup."))
      .finally(() => setLoading(false));
  }, []);

  async function syncX() {
    setSyncing(true);
    setMessage("");
    try {
      const response = await fetch("/api/x/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sync failed");
      setAccount(data.profile ? {
        username: data.profile.username,
        name: data.profile.name,
        description: data.profile.description,
        profile_image_url: data.profile.profile_image_url,
        followers_count: data.profile.public_metrics?.followers_count ?? 0,
        following_count: data.profile.public_metrics?.following_count ?? 0,
        tweet_count: data.profile.public_metrics?.tweet_count ?? 0,
      } : account);
      setMessage(`Synced ${data.postsSynced} recent posts.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function saveNiche() {
    setSavingNiche(true);
    setMessage("");
    try {
      const response = await fetch("/api/niche", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(niche),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save niche");
      setNiche(data.profile);
      setMessage("Growth profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save niche");
    } finally {
      setSavingNiche(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">X</div><div><strong>Growth Agent</strong><span>Human-first growth OS</span></div></div>
        <nav className="nav">
          {navItems.map((item) => <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)}><span>{item === "Overview" ? "⌂" : item === "Opportunities" ? "✦" : item === "Content" ? "✎" : item === "Replies" ? "↪" : item === "People" ? "◎" : "◒"} &nbsp; {item}</span></button>)}
        </nav>
        <div className="sidebar-bottom"><div className="status"><i className="dot" /><span>{account ? `Connected · @${account.username}` : "Agent ready · Setup mode"}</span></div></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><p className="eyebrow">{active.toUpperCase()}</p><h1>{account ? `Welcome back, ${account.name}.` : "Good morning, builder."}</h1><p className="subtitle">{account ? `Tracking @${account.username} and preparing the growth research loop.` : "Connect your X account to start building the real growth loop."}</p></div>
          <div className="avatar">{account?.name?.charAt(0).toUpperCase() ?? "F"}</div>
        </header>

        {message && <div className="notice">{message}</div>}

        <section className="grid stats">
          <div className="card"><div className="stat-label">Followers</div><div className="stat-value">{loading ? "…" : account?.followers_count ?? 4}</div><div className="stat-change">{account ? "Live from X" : "Starting point"}</div></div>
          <div className="card"><div className="stat-label">Following</div><div className="stat-value">{loading ? "…" : account?.following_count ?? "—"}</div><div className="stat-change">{account ? "Live from X" : "Connect X to begin"}</div></div>
          <div className="card"><div className="stat-label">Opportunities</div><div className="stat-value">{visible.length}</div><div className="stat-change">Demo queue until research engine</div></div>
          <div className="card"><div className="stat-label">Follower goal</div><div className="stat-value">1,000</div><div className="stat-change">Organic target</div></div>
        </section>

        <section className="grid section-grid">
          <div className="card">
            <div className="card-head"><h2>Top opportunities</h2><span>Ranked by relevance & growth potential</span></div>
            {visible.length === 0 ? <p className="subtitle">All current opportunities dismissed. Research will replenish this queue.</p> : visible.map((item) => {
              const index = opportunities.indexOf(item);
              return <article className="opportunity" key={item.text}><div><p className="post">{item.text}</p><div className="meta"><span>{item.author}</span><span>#{item.topic}</span><span>{item.reason}</span></div><div className="actions"><button className="btn primary" onClick={() => alert("Reply drafting is the next agent module.")}>Draft reply</button><button className="btn" onClick={() => setDismissed([...dismissed, index])}>Ignore</button></div></div><div className="score">{item.score}</div></article>;
            })}
          </div>

          <div className="grid">
            <div className="card"><div className="card-head"><h2>4 → 1,000</h2><span>Growth experiment</span></div><div className="goal"><div className="goal-number">{account?.followers_count ?? 4}</div><div className="subtitle">followers today</div><div className="progress"><div style={{ width: `${Math.min(((account?.followers_count ?? 4) / 1000) * 100, 100)}%` }} /></div><div className="goal-row"><span>Current</span><span>1,000 goal</span></div></div></div>
            <div className="card">
              <div className="card-head"><h2>Account setup</h2><span>Phase 2</span></div>
              {account ? <><div className="plan-item"><div className="plan-icon">✓</div><div><strong>@{account.username} connected</strong><p>Your X profile is stored securely for the agent.</p></div></div><div className="plan-item"><div className="plan-icon">↻</div><div><strong>Sync recent posts</strong><p>Pull your latest posts into the local growth dataset.</p></div></div><button className="btn primary" onClick={syncX} disabled={syncing}>{syncing ? "Syncing…" : "Sync X data"}</button></> : <><div className="plan-item"><div className="plan-icon">①</div><div><strong>Connect your X account</strong><p>Uses OAuth 2.0 PKCE with read-only scopes for this phase.</p></div></div><button className="btn primary" onClick={() => { window.location.href = "/api/auth/x/connect"; }}>Connect X</button></>}
            </div>
          </div>
        </section>

        <section className="card niche-card">
          <div className="card-head"><div><h2>Growth profile</h2><span>Used by the research and scoring agents</span></div><button className="btn primary" onClick={saveNiche} disabled={savingNiche || !account}>{savingNiche ? "Saving…" : "Save profile"}</button></div>
          <div className="niche-grid">
            <label><span>Topics</span><input value={niche.topics.join(", ")} onChange={(event) => setNiche({ ...niche, topics: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} placeholder="AI, development, SaaS" /></label>
            <label><span>Audience</span><input value={niche.audience} onChange={(event) => setNiche({ ...niche, audience: event.target.value })} placeholder="Who should follow you?" /></label>
            <label><span>Expertise</span><input value={niche.expertise.join(", ")} onChange={(event) => setNiche({ ...niche, expertise: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} placeholder="What can you speak about?" /></label>
            <label><span>Voice notes</span><textarea value={niche.voice_notes} onChange={(event) => setNiche({ ...niche, voice_notes: event.target.value })} placeholder="How should the agent sound?" rows={3} /></label>
          </div>
        </section>

        <section className="empty-connect"><h3>{account ? "Approval-first by design" : "Approval-first by design"}</h3><p>This phase connects your account and stores the information needed for research. It does not post, reply, follow or like anything automatically.</p></section>
      </main>
    </div>
  );
}
