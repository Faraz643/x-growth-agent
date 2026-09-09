"use client";

import { useEffect, useMemo, useState } from "react";

type Account = { username: string; name: string; followers_count: number; following_count: number; tweet_count: number; updated_at: string; last_successful_sync_at?: string | null; sync_status?: string; sync_error_code?: string | null };
type Idea = { id: string; title: string; reason: string; angle: string; hook: string; score: number };
type Opportunity = { id: string; author_username: string; author_name: string; topic: string; content: string; reason: string; suggested_angle: string; opportunity_score: number; source_type: string; status: string };
type Draft = { id: string; body: string; format: string; status: string };
type Reply = { id: string; author_username: string; source_content: string; reply: string; status: string };
type Relationship = { id: string; x_username: string; display_name: string; niche: string; interaction_count: number; last_interaction_at: string | null; relationship_status: string; relevance_score: number };
type Profile = { niche: string; content_pillars: string[]; tone: string[]; avoid_topics: string[]; target_followers: number };
type Analytics = { postsAnalyzed: number; summary: { impressions: number; engagements: number; engagementRate: number | null }; bestPosts: { x_post_id: string; text: string; engagements: number; impressions: number; rate: number | null }[]; topics: { topic: string; posts: number }[] };

const nav = ["Overview", "Opportunities", "Content", "Replies", "People", "Analytics", "Calendar"];
const defaultProfile: Profile = { niche: "Development + AI + Product Building + Vibe Coding", content_pillars: ["Building", "AI", "Development", "Problem solving", "Vibe coding", "Monetization", "Build in public", "Personal lessons"], tone: ["authentic", "curious", "practical", "honest", "builder-oriented", "occasionally opinionated"], avoid_topics: ["corporate language", "generic motivational content", "fake guru language", "excessive emojis", "engagement bait", "forced slang", "fake controversy"], target_followers: 1000 };

async function json<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

const fmt = (n: number | null | undefined) => n == null ? "—" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(n);
const day = (value?: string | null) => value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—";

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [calendar, setCalendar] = useState<{ id: string; planned_date: string; pillar: string; format: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [status, gp, opp, content, rep, people, ana, cal] = await Promise.all([
      json<{ account?: Account }>("/api/x/status"), json<{ profile: Profile }>("/api/growth/profile").catch(() => ({ profile: defaultProfile })),
      json<{ opportunities: Opportunity[] }>("/api/growth/opportunities").catch(() => ({ opportunities: [] })), json<{ ideas: Idea[]; drafts: Draft[] }>("/api/growth/content").catch(() => ({ ideas: [], drafts: [] })),
      json<{ replies: Reply[] }>("/api/growth/replies").catch(() => ({ replies: [] })), json<{ relationships: Relationship[] }>("/api/growth/relationships").catch(() => ({ relationships: [] })),
      json<Analytics>("/api/growth/analytics").catch(() => null), json<{ calendar: { id: string; planned_date: string; pillar: string; format: string; status: string }[] }>("/api/growth/calendar").catch(() => ({ calendar: [] })),
    ]);
    setAccount(status.account ?? null); setProfile(gp.profile ?? defaultProfile); setOpportunities(opp.opportunities); setIdeas(content.ideas); setDrafts(content.drafts); setReplies(rep.replies); setRelationships(people.relationships); setAnalytics(ana); setCalendar(cal.calendar);
  }

  useEffect(() => { load().catch((e) => setMessage(e.message)).finally(() => setLoading(false)); }, []);

  async function sync() {
    setBusy("sync"); setMessage("");
    try { const data = await json<{ synced: boolean; code?: string; message?: string; postsSynced?: number }>("/api/x/sync", { method: "POST" }); setMessage(data.synced ? `Synced ${data.postsSynced ?? 0} posts and refreshed account data.` : data.message || "X data is currently limited. Existing data remains available."); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Sync failed"); } finally { setBusy(""); }
  }

  async function seedDemo() { setBusy("demo"); try { const data = await json<{ message: string }>("/api/growth/demo", { method: "POST" }); setMessage(data.message); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Demo data failed"); } finally { setBusy(""); } }

  async function generate(idea: Idea) { setBusy(idea.id); try { await json("/api/growth/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate", idea, niche: profile.niche, experience: "my current product build", format: "short insight" }) }); setMessage("Draft generated. Review it before publishing."); await load(); setActive("Content"); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not generate draft"); } finally { setBusy(""); } }

  async function draftReply(item: Opportunity) { setBusy(item.id); try { await json("/api/growth/replies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunity_id: item.id, author_username: item.author_username, topic: item.topic, source_content: item.content, niche: profile.niche }) }); setMessage("Reply suggestion created. Edit and approve it before using it."); await load(); setActive("Replies"); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not create reply"); } finally { setBusy(""); } }

  async function updateOpportunity(id: string, status: string) { await json("/api/growth/opportunities", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); setOpportunities((items) => items.filter((x) => x.id !== id)); }
  async function updateDraft(id: string, status: string, body?: string) { await json("/api/growth/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, body }) }); await load(); }
  async function updateReply(id: string, status: string, reply?: string) { await json("/api/growth/replies", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, reply }) }); await load(); }

  async function saveProfile() { setBusy("profile"); try { const data = await json<{ profile: Profile }>("/api/growth/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) }); setProfile(data.profile); setMessage("Growth profile saved."); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save profile"); } finally { setBusy(""); } }

  const goal = profile.target_followers || 1000;
  const followers = account?.followers_count ?? 4;
  const progress = Math.min(100, (followers / goal) * 100);
  const todayActions = Math.min(3, opportunities.length) + (ideas.length ? 1 : 0);
  const health = useMemo(() => analytics?.postsAnalyzed ? "Learning" : "Not enough data yet", [analytics]);

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">X</div><div><strong>Growth Agent</strong><span>Human-first growth OS</span></div></div><nav className="nav">{nav.map((item) => <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)}><span>{item === "Overview" ? "⌂" : item === "Opportunities" ? "✦" : item === "Content" ? "✎" : item === "Replies" ? "↪" : item === "People" ? "◎" : item === "Analytics" ? "◒" : "▦"} &nbsp;{item}</span></button>)}</nav><div className="sidebar-bottom"><div className="status"><i className="dot" />{account ? `Connected · @${account.username}` : "Setup mode"}</div></div></aside>
    <main className="main"><header className="topbar"><div><p className="eyebrow">{active.toUpperCase()}</p><h1>{account ? `Good morning, ${account.name}.` : "Good morning, builder."}</h1><p className="subtitle">{account ? "Here is the clearest next set of actions for growing your account." : "Connect X or load development data to start the growth loop."}</p></div><div className="avatar">{account?.name?.charAt(0).toUpperCase() ?? "F"}</div></header>
      {message && <div className="notice">{message}</div>}

      {active === "Overview" && <>
        <section className="grid stats"><div className="card"><div className="stat-label">Followers</div><div className="stat-value">{loading ? "…" : followers}</div><div className="stat-change">Goal {fmt(goal)}</div></div><div className="card"><div className="stat-label">Today's actions</div><div className="stat-value">{todayActions}</div><div className="stat-change">Meaningful, approval-first</div></div><div className="card"><div className="stat-label">Current streak</div><div className="stat-value">0</div><div className="stat-change">Start today</div></div><div className="card"><div className="stat-label">Learning status</div><div className="stat-value small-value">{health}</div><div className="stat-change">Never pretend when data is thin</div></div></section>
        <section className="grid section-grid"><div className="card"><div className="card-head"><div><h2>🔥 Top opportunities</h2><span>Relevance + momentum + audience fit + conversation quality</span></div><button className="btn" onClick={seedDemo} disabled={busy === "demo"}>{busy === "demo" ? "Loading…" : "Load demo data"}</button></div>{opportunities.length ? opportunities.slice(0, 3).map((item) => <OpportunityCard key={item.id} item={item} onReply={() => draftReply(item)} onIgnore={() => updateOpportunity(item.id, "ignored")} busy={busy === item.id} />) : <Empty title="No opportunities yet" text="Sync available X data, add opportunities manually through the API, or load clearly marked demo data." />}</div>
          <div className="grid"><div className="card"><div className="card-head"><h2>4 → {fmt(goal)}</h2><span>Organic target</span></div><div className="goal"><div className="goal-number">{followers}</div><div className="subtitle">followers today</div><div className="progress"><div style={{ width: `${progress}%` }} /></div><div className="goal-row"><span>{progress.toFixed(1)}%</span><span>{fmt(goal)} goal</span></div></div></div>
          <div className="card"><div className="card-head"><h2>Data status</h2><button className="btn" onClick={sync} disabled={!account || busy === "sync"}>{busy === "sync" ? "Syncing…" : "Sync X"}</button></div><div className="data-status"><div><strong>{account?.sync_status === "limited" ? "Connected · API limited" : account ? "Connected" : "Not connected"}</strong><p>{account?.sync_status === "limited" ? "X API credits are unavailable. Stored data and demo/manual intelligence still work." : "OAuth remains separate from data availability."}</p></div><small>Last successful sync: {day(account?.last_successful_sync_at)}</small></div></div></div></section>
        <section className="grid two"><div className="card"><div className="card-head"><h2>✍️ Today's content</h2><span>First-hand beats generic</span></div>{ideas.length ? <IdeaCard idea={ideas[0]} onGenerate={() => generate(ideas[0])} busy={busy === ideas[0].id} /> : <Empty title="No content idea yet" text="Generate or seed an idea when you have real building context to share." />}</div><div className="card"><div className="card-head"><h2>💬 People to engage</h2><span>Relationships over follower counts</span></div>{relationships.length ? relationships.slice(0, 3).map((p) => <div className="person" key={p.id}><div><strong>@{p.x_username}</strong><span>{p.niche || "Relevant builder"} · {p.interaction_count} interactions</span></div><b>{p.relationship_status}</b></div>) : <Empty title="No relationships tracked" text="Approved replies and manual relationship entries will build this list." />}</div></section>
      </>}

      {active === "Opportunities" && <Panel title="Opportunity queue" subtitle="Only use opportunities where you can add real value.">{opportunities.length ? opportunities.map((item) => <OpportunityCard key={item.id} item={item} onReply={() => draftReply(item)} onIgnore={() => updateOpportunity(item.id, "ignored")} busy={busy === item.id} />) : <Empty title="No opportunities" text="Load development data or add a manual opportunity through /api/growth/opportunities." />}</Panel>}

      {active === "Content" && <Panel title="Content studio" subtitle="Generate, edit and approve. Nothing is published automatically."><div className="grid two">{ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} onGenerate={() => generate(idea)} busy={busy === idea.id} />)}</div>{drafts.length ? <div className="draft-list">{drafts.map((d) => <article className="draft" key={d.id}><div className="card-head"><span>{d.format}</span><b>{d.status}</b></div><textarea defaultValue={d.body} onBlur={(e) => updateDraft(d.id, "draft", e.currentTarget.value)} /><div className="actions"><button className="btn" onClick={() => updateDraft(d.id, "saved")}>Save</button><button className="btn primary" onClick={() => updateDraft(d.id, "approved")}>Approve</button><button className="btn" onClick={() => updateDraft(d.id, "rejected")}>Reject</button></div></article>)}</div> : <Empty title="No drafts yet" text="Generate from an idea above." />}</Panel>}

      {active === "Replies" && <Panel title="Reply approval center" subtitle="Thoughtful replies only. Edit before approval.">{replies.length ? replies.map((r) => <article className="reply-card" key={r.id}><div className="meta"><strong>{r.author_username}</strong><span>{r.status}</span></div><p className="source">{r.source_content}</p><textarea defaultValue={r.reply} onBlur={(e) => updateReply(r.id, "pending", e.currentTarget.value)} /><div className="actions"><button className="btn" onClick={() => updateReply(r.id, "saved")}>Save</button><button className="btn primary" onClick={() => updateReply(r.id, "approved")}>Approve</button><button className="btn" onClick={() => updateReply(r.id, "rejected")}>Skip</button></div></article>) : <Empty title="No reply suggestions" text="Open an opportunity and draft a reply." />}</Panel>}

      {active === "People" && <Panel title="Relationship engine" subtitle="Track people you actually talk to, not vanity metrics.">{relationships.length ? <div className="table-list">{relationships.map((p) => <div className="person row" key={p.id}><div><strong>@{p.x_username}</strong><span>{p.display_name} · {p.niche}</span></div><span>{p.interaction_count} interactions</span><b>{p.relationship_status}</b><span>{p.relevance_score}/100 relevance</span></div>)}</div> : <Empty title="No relationships yet" text="Approved interactions will become relationship signals when recorded." />}</Panel>}

      {active === "Analytics" && <Panel title="Account analytics" subtitle="Real X metrics when available; otherwise clearly label the data gap."><div className="grid stats"><Metric label="Posts analyzed" value={analytics?.postsAnalyzed ?? 0} note={account?.sync_status === "limited" ? "Stored data only" : "Synced data"} /><Metric label="Engagements" value={analytics?.summary.engagements ?? 0} note="Likes + replies + reposts + quotes" /><Metric label="Impressions" value={analytics?.summary.impressions ?? 0} note="Only when X provides them" /><Metric label="Engagement rate" value={analytics?.summary.engagementRate != null ? `${analytics.summary.engagementRate}%` : "—"} note="Not enough data if unavailable" /></div><h3 className="section-title">Best posts</h3>{analytics?.bestPosts.length ? analytics.bestPosts.map((p) => <article className="best-post" key={p.x_post_id}><p>{p.text}</p><span>{fmt(p.engagements)} engagements · {fmt(p.impressions)} impressions · {p.rate == null ? "—" : `${p.rate.toFixed(2)}%`}</span></article>) : <Empty title="Not enough data yet" text="A small account should not be given invented conclusions." />}</Panel>}

      {active === "Calendar" && <Panel title="Weekly content calendar" subtitle="A flexible plan, not a rigid posting machine."><div className="calendar">{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d, i) => { const item = calendar[i]; return <div className="calendar-day" key={d}><strong>{d}</strong><span>{item?.pillar ?? profile.content_pillars[i % profile.content_pillars.length]}</span><small>{item?.format ?? ["Build update", "Technical lesson", "Problem → solution", "AI insight", "Build in public", "Experiment / opinion", "Weekly reflection"][i]}</small></div>; })}</div></Panel>}

      <section className="card profile-card"><div className="card-head"><div><h2>Growth profile</h2><span>Editable context used by scoring and generation.</span></div><button className="btn primary" onClick={saveProfile} disabled={!account || busy === "profile"}>{busy === "profile" ? "Saving…" : "Save profile"}</button></div><div className="niche-grid"><label><span>Niche</span><input value={profile.niche} onChange={(e) => setProfile({ ...profile, niche: e.target.value })} /></label><label><span>Target followers</span><input type="number" value={profile.target_followers} onChange={(e) => setProfile({ ...profile, target_followers: Number(e.target.value) || 1000 })} /></label><label><span>Content pillars</span><input value={profile.content_pillars.join(", ")} onChange={(e) => setProfile({ ...profile, content_pillars: e.target.value.split(",").map(x => x.trim()).filter(Boolean) })} /></label><label><span>Tone</span><input value={profile.tone.join(", ")} onChange={(e) => setProfile({ ...profile, tone: e.target.value.split(",").map(x => x.trim()).filter(Boolean) })} /></label><label className="wide"><span>Avoid</span><input value={profile.avoid_topics.join(", ")} onChange={(e) => setProfile({ ...profile, avoid_topics: e.target.value.split(",").map(x => x.trim()).filter(Boolean) })} /></label></div></section>
      <footer className="safety"><strong>Approval-first by design.</strong> This phase never posts, replies, follows or likes automatically. Demo data is never presented as live X data.</footer>
    </main></div>;
}

function OpportunityCard({ item, onReply, onIgnore, busy }: { item: Opportunity; onReply: () => void; onIgnore: () => void; busy: boolean }) { return <article className="opportunity"><div><div className="meta"><strong>{item.author_username}</strong><span>#{item.topic}</span><span>{item.source_type === "demo" ? "DEMO DATA" : "SOURCE"}</span></div><p className="post">{item.content}</p><p className="reason">{item.reason}</p><div className="actions"><button className="btn primary" onClick={onReply} disabled={busy}>{busy ? "Drafting…" : "Draft reply"}</button><button className="btn" onClick={onIgnore}>Ignore</button></div></div><div className="score">{item.opportunity_score}</div></article> }
function IdeaCard({ idea, onGenerate, busy }: { idea: Idea; onGenerate: () => void; busy: boolean }) { return <article className="idea"><div className="score">{idea.score}</div><div><h3>{idea.title}</h3><p>{idea.reason}</p><div className="angle"><strong>Angle:</strong> {idea.angle}</div><div className="hook"><strong>Hook:</strong> {idea.hook}</div><button className="btn primary" onClick={onGenerate} disabled={busy}>{busy ? "Generating…" : "Generate draft"}</button></div></article> }
function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="card panel"><div className="card-head"><div><h2>{title}</h2><span>{subtitle}</span></div></div>{children}</section> }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty"><strong>{title}</strong><p>{text}</p></div> }
function Metric({ label, value, note }: { label: string; value: string | number; note: string }) { return <div className="card"><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-change">{note}</div></div> }
