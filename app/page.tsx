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

type Intelligence = {
  account: { followers: number; following: number; totalPosts: number; lastSyncedAt: string };
  posts: { x_post_id: string; text: string; created_at: string; public_metrics: Record<string, number> | null }[];
  summary: { postsAnalyzed: number; averageEngagement: number; averageImpressions: number; engagementRate: number | null; postingSpanDays: number; postsPerWeek: number | null };
  topPost: { text: string; created_at: string; public_metrics: Record<string, number> | null } | null;
  topics: { topic: string; count: number }[];
};

const navItems = ["Overview", "Opportunities", "Content", "Replies", "People", "Analytics"];

const opportunities = [
  { text: "AI agents are only useful when you can trust what they do. The approval layer is becoming the real product.", author: "@builder_signal", topic: "AI agents", score: 94, reason: "High niche relevance + active conversation" },
  { text: "Spent four hours debugging a feature that looked completely fine from the frontend.", author: "@devnotes", topic: "Development", score: 89, reason: "Strong story opportunity for a builder account" },
  { text: "What is the best way to validate a SaaS idea before spending months building it?", author: "@indiebuilds", topic: "Product building", score: 84, reason: "Direct audience match + question format" },
];

const defaultNiche: NicheProfile = {
  topics: ["Development", "AI", "Building products", "Vibe coding", "Monetization"],
  audience: "Developers, AI builders, indie hackers and people interested in building and monetizing products.",
  expertise: ["Product development", "AI tools", "Vibe coding"],
  voice_notes: "Direct, practical, curious and honest. Prefer real building experiences over generic advice.",
};

function formatNumber(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [account, setAccount] = useState<XAccount | null>(null);
  const [niche, setNiche] = useState<NicheProfile>(defaultNiche);
  const [intelligence, setIntelligence] = useState<Intelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingNiche, setSavingNiche] = useState(false);
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState<number[]>([]);

  const visible = opportunities.filter((_, index) => !dismissed.includes(index));

  async function loadData() {
    const [xData, nicheData, intelligenceData] = await Promise.all([
      fetch("/api/x/status").then((response) => response.json()),
      fetch("/api/niche").then((response) => response.json()),
      fetch("/api/x/intelligence").then((response) => response.ok ? response.json() : null),
    ]);
    setAccount(xData.account ?? null);
    if (nicheData.profile) setNiche(nicheData.profile);
    setIntelligence(intelligenceData);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("x_connected");
    const error = params.get("x_error");
    if (connected) setMessage("X account connected successfully. Sync your data to build account intelligence.");
    if (error) setMessage(error);
    if (connected || error) window.history.replaceState({}, "", window.location.pathname);

    loadData().catch(() => setMessage("Could not load account setup.")).finally(() => setLoading(false));
  }, []);

  async function syncX() {
    setSyncing(true);
    setMessage("");
    try {
      const response = await fetch("/api/x/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sync failed");
      await loadData();
      setMessage(`Synced ${data.postsSynced} recent posts. Account intelligence is now updated.`);
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
      const response = await fetch("/api/niche", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(niche) });
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

  const summary = intelligence?.summary;

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
          <div><p className="eyebrow">{active.toUpperCase()}</p><h1>{account ? `Welcome back, ${account.name}.` : "Good morning, builder."}</h1><p className="subtitle">{account ? `Tracking @${account.username} and building your personalized growth intelligence.` : "Connect your X account to start building the real growth loop."}</p></div>
          <div className="avatar">{account?.name?.charAt(0).toUpperCase() ?? "F"}</div>
        </header>

        {message && <div className="notice">{message}</div>}

        <section className="grid stats">
          <div className="card"><div className="stat-label">Followers</div><div className="stat-value">{loading ? "…" : account?.followers_count ?? 4}</div><div className="stat-change">{account ? "Live from X" : "Starting point"}</div></div>
          <div className="card"><div className="stat-label">Following</div><div className="stat-value">{loading ? "…" : account?.following_count ?? "—"}</div><div className="stat-change">{account ? "Live from X" : "Connect X to begin"}</div></div>
          <div className="card"><div className="stat-label">Posts analyzed</div><div className="stat-value">{summary?.postsAnalyzed ?? 0}</div><div className="stat-change">{intelligence ? "Recent X posts" : "Sync to analyze"}</div></div>
          <div className="card"><div className="stat-label">Follower goal</div><div className="stat-value">1,000</div><div className="stat-change">Organic target</div></div>
        </section>

        {account && intelligence && <section className="card intelligence-card">
          <div className="card-head"><div><h2>Account intelligence</h2><span>What the agent currently knows about your account</span></div><button className="btn" onClick={syncX} disabled={syncing}>{syncing ? "Syncing…" : "Refresh from X"}</button></div>
          <div className="intelligence-stats">
            <div><span>Avg. engagement</span><strong>{formatNumber(summary?.averageEngagement)}</strong><small>likes + replies + reposts + quotes</small></div>
            <div><span>Avg. impressions</span><strong>{formatNumber(summary?.averageImpressions)}</strong><small>when X provides impressions</small></div>
            <div><span>Engagement rate</span><strong>{summary?.engagementRate != null ? `${summary.engagementRate}%` : "—"}</strong><small>engagement / impressions</small></div>
            <div><span>Posting pace</span><strong>{summary?.postsPerWeek != null ? `${summary.postsPerWeek}/wk` : "—"}</strong><small>based on synced posts</small></div>
          </div>
          <div className="intel-grid">
            <div><div className="mini-head">Strongest themes</div><div className="topic-list">{intelligence.topics.length ? intelligence.topics.map((topic) => <span key={topic.topic}>{topic.topic}<b>{topic.count}</b></span>) : <p className="muted-copy">No clear theme yet. More posts will improve this signal.</p>}</div></div>
            <div><div className="mini-head">Current best post</div>{intelligence.topPost ? <div className="best-post"><p>{intelligence.topPost.text}</p><span>{formatDate(intelligence.topPost.created_at)} · {formatNumber((intelligence.topPost.public_metrics?.like_count ?? 0) + (intelligence.topPost.public_metrics?.reply_count ?? 0) + (intelligence.topPost.public_metrics?.retweet_count ?? 0) + (intelligence.topPost.public_metrics?.quote_count ?? 0))} engagements</span></div> : <p className="muted-copy">Sync your posts to identify your strongest content.</p>}</div>
          </div>
        </section>}

        <section className="grid section-grid">
          <div className="card">
            <div className="card-head"><h2>Top opportunities</h2><span>Demo queue until research engine</span></div>
            {visible.length === 0 ? <p className="subtitle">All current opportunities dismissed. Research will replenish this queue.</p> : visible.map((item) => {
              const index = opportunities.indexOf(item);
              return <article className="opportunity" key={item.text}><div><p className="post">{item.text}</p><div className="meta"><span>{item.author}</span><span>#{item.topic}</span><span>{item.reason}</span></div><div className="actions"><button className="btn primary" onClick={() => alert("Reply drafting is the next agent module.")}>Draft reply</button><button className="btn" onClick={() => setDismissed([...dismissed, index])}>Ignore</button></div></div><div className="score">{item.score}</div></article>;
            })}
          </div>

          <div className="grid">
            <div className="card"><div className="card-head"><h2>4 → 1,000</h2><span>Growth experiment</span></div><div className="goal"><div className="goal-number">{account?.followers_count ?? 4}</div><div className="subtitle">followers today</div><div className="progress"><div style={{ width: `${Math.min(((account?.followers_count ?? 4) / 1000) * 100, 100)}%` }} /></div><div className="goal-row"><span>Current</span><span>1,000 goal</span></div></div></div>
            <div className="card">
              <div className="card-head"><h2>Account setup</h2><span>Phase 2</span></div>
              {account ? <><div className="plan-item"><div className="plan-icon">✓</div><div><strong>@{account.username} connected</strong><p>Your X profile is stored securely for the agent.</p></div></div><div className="plan-item"><div className="plan-icon">↻</div><div><strong>Sync recent posts</strong><p>Pull your latest posts into the growth dataset.</p></div></div><button className="btn primary" onClick={syncX} disabled={syncing}>{syncing ? "Syncing…" : "Sync X data"}</button></> : <><div className="plan-item"><div className="plan-icon">①</div><div><strong>Connect your X account</strong><p>Uses OAuth 2.0 PKCE for the current research phase.</p></div></div><button className="btn primary" onClick={() => { window.location.href = "/api/auth/x/connect"; }}>Connect X</button></>}
            </div>
          </div>
        </section>

        {intelligence?.posts?.length ? <section className="card posts-card">
          <div className="card-head"><div><h2>Recent posts</h2><span>Latest synced posts used by the intelligence layer</span></div><span>{intelligence.posts.length} loaded</span></div>
          <div className="posts-list">{intelligence.posts.slice(0, 8).map((post) => { const metrics = post.public_metrics ?? {}; const total = (metrics.like_count ?? 0) + (metrics.reply_count ?? 0) + (metrics.retweet_count ?? 0) + (metrics.quote_count ?? 0); return <article key={post.x_post_id}><p>{post.text}</p><div><span>{formatDate(post.created_at)}</span><span>{formatNumber(total)} engagements</span><span>{formatNumber(metrics.impression_count)} impressions</span></div></article>; })}</div>
        </section> : null}

        <section className="card niche-card">
          <div className="card-head"><div><h2>Growth profile</h2><span>Used by the research and scoring agents</span></div><button className="btn primary" onClick={saveNiche} disabled={savingNiche || !account}>{savingNiche ? "Saving…" : "Save profile"}</button></div>
          <div className="niche-grid">
            <label><span>Topics</span><input value={niche.topics.join(", ")} onChange={(event) => setNiche({ ...niche, topics: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} placeholder="AI, development, SaaS" /></label>
            <label><span>Audience</span><input value={niche.audience} onChange={(event) => setNiche({ ...niche, audience: event.target.value })} placeholder="Who should follow you?" /></label>
            <label><span>Expertise</span><input value={niche.expertise.join(", ")} onChange={(event) => setNiche({ ...niche, expertise: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} placeholder="What can you speak about?" /></label>
            <label><span>Voice notes</span><textarea value={niche.voice_notes} onChange={(event) => setNiche({ ...niche, voice_notes: event.target.value })} placeholder="How should the agent sound?" rows={3} /></label>
          </div>
        </section>

        <section className="empty-connect"><h3>Approval-first by design</h3><p>This phase connects your account and builds intelligence. It does not post, reply, follow or like anything automatically.</p></section>
      </main>
    </div>
  );
}
