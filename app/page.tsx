"use client";

import { useState } from "react";

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

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [connected, setConnected] = useState(false);
  const [dismissed, setDismissed] = useState<number[]>([]);

  const visible = opportunities.filter((_, index) => !dismissed.includes(index));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">X</div>
          <div><strong>Growth Agent</strong><span>Human-first growth OS</span></div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)}>
              <span>{item === "Overview" ? "⌂" : item === "Opportunities" ? "✦" : item === "Content" ? "✎" : item === "Replies" ? "↪" : item === "People" ? "◎" : "◒"} &nbsp; {item}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="status"><i className="dot" /><span>Agent ready · Demo mode</span></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{active.toUpperCase()}</p>
            <h1>Good morning, builder.</h1>
            <p className="subtitle">Your agent is finding people and conversations worth your attention.</p>
          </div>
          <div className="avatar">F</div>
        </header>

        <section className="grid stats">
          <div className="card"><div className="stat-label">Followers</div><div className="stat-value">4</div><div className="stat-change">Starting point</div></div>
          <div className="card"><div className="stat-label">Relevant reach</div><div className="stat-value">—</div><div className="stat-change">Connect X to begin</div></div>
          <div className="card"><div className="stat-label">Opportunities</div><div className="stat-value">{visible.length}</div><div className="stat-change">Ready for review</div></div>
          <div className="card"><div className="stat-label">Follower goal</div><div className="stat-value">1,000</div><div className="stat-change">Organic target</div></div>
        </section>

        <section className="grid section-grid">
          <div className="card">
            <div className="card-head"><h2>Top opportunities</h2><span>Ranked by relevance & growth potential</span></div>
            {visible.length === 0 ? <p className="subtitle">All current opportunities dismissed. Research will replenish this queue.</p> : visible.map((item) => {
              const index = opportunities.indexOf(item);
              return (
                <article className="opportunity" key={item.text}>
                  <div>
                    <p className="post">{item.text}</p>
                    <div className="meta"><span>{item.author}</span><span>#{item.topic}</span><span>{item.reason}</span></div>
                    <div className="actions"><button className="btn primary" onClick={() => alert("Reply drafting is the next agent module.")}>Draft reply</button><button className="btn" onClick={() => setDismissed([...dismissed, index])}>Ignore</button></div>
                  </div>
                  <div className="score">{item.score}</div>
                </article>
              );
            })}
          </div>

          <div className="grid">
            <div className="card">
              <div className="card-head"><h2>4 → 1,000</h2><span>Growth experiment</span></div>
              <div className="goal"><div className="goal-number">4</div><div className="subtitle">followers today</div><div className="progress"><div /></div><div className="goal-row"><span>Current</span><span>1,000 goal</span></div></div>
            </div>

            <div className="card">
              <div className="card-head"><h2>Today&apos;s strategy</h2><span>Agent plan</span></div>
              <div className="plan-item"><div className="plan-icon">⌕</div><div><strong>Find real conversations</strong><p>Prioritize AI, development and product-building discussions.</p></div></div>
              <div className="plan-item"><div className="plan-icon">✎</div><div><strong>Draft useful content</strong><p>Build-in-public stories over generic AI commentary.</p></div></div>
              <div className="plan-item"><div className="plan-icon">↗</div><div><strong>Learn from results</strong><p>Optimize for relevant follower conversion, not vanity metrics.</p></div></div>
            </div>
          </div>
        </section>

        {!connected && (
          <section className="empty-connect">
            <h3>Connect your X account when you&apos;re ready</h3>
            <p>This first build intentionally runs in demo mode. The next milestone is OAuth + the official X API, followed by real opportunity research. Nothing will post or reply without your approval.</p>
            <button className="btn primary" onClick={() => setConnected(true)}>I understand — enable setup preview</button>
          </section>
        )}
        {connected && <section className="empty-connect"><h3>Setup preview enabled ✓</h3><p>OAuth integration is the next implementation milestone. Your account will remain approval-only until you explicitly change the autonomy level.</p></section>}
      </main>
    </div>
  );
}
