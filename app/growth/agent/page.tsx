"use client";

import { useEffect, useMemo, useState } from "react";

type Any = Record<string, any>;
const box: React.CSSProperties = { background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: 20 };
const button: React.CSSProperties = { border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "inherit", borderRadius: 10, padding: "9px 13px", cursor: "pointer" };

async function api<T>(url: string, options?: RequestInit): Promise<T> { const r = await fetch(url, options); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Request failed"); return d; }

export default function GrowthAgentWorkspace() {
  const [data, setData] = useState<Any>({});
  const [tab, setTab] = useState("Today");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Any>({});

  async function load() {
    setLoading(true);
    try {
      const [command, profileData, content, replies, people, analytics, calendar, approvals] = await Promise.all([
        api<Any>("/api/growth/command-center"),
        api<Any>("/api/growth/profile"),
        api<Any>("/api/growth/content"),
        api<Any>("/api/growth/replies"),
        api<Any>("/api/growth/relationships"),
        api<Any>("/api/growth/analytics"),
        api<Any>("/api/growth/calendar"),
        api<Any>("/api/growth/approval"),
      ]);
      setData({ command, content, replies, people, analytics, calendar, approvals });
      setProfile(profileData.profile || {});
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not load workspace"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  const command = data.command || {};
  const account = command.account || {};
  const actions = command.actions || [];
  const learning = command.learning || {};
  const tabs = ["Today", "Opportunities", "Content", "Replies", "People", "Analytics", "Calendar", "Profile", "Approvals"];
  const realPosts = command.dataStatus?.realPosts ?? 0;

  async function seedDemo() {
    try { const d = await api<Any>("/api/growth/demo", { method: "POST" }); setMessage(d.message); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Demo data failed"); }
  }

  async function generateContent(idea: Any) {
    try { await api("/api/growth/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate", idea, niche: profile.niche, experience: "my current product build", format: "short insight" }) }); setMessage("Draft created for review."); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not generate draft"); }
  }

  async function generateReply(opportunity: Any) {
    try { await api("/api/growth/replies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunity_id: opportunity.id, author_username: opportunity.author_username, topic: opportunity.topic, source_content: opportunity.content, niche: profile.niche }) }); setMessage("Reply suggestion created."); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not generate reply"); }
  }

  async function approve(type: "content" | "reply", id: string) {
    const url = type === "content" ? "/api/growth/content" : "/api/growth/replies";
    await api(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "approved" }) });
    setMessage("Approved internally. Nothing was published to X."); await load();
  }

  async function saveProfile() {
    await api("/api/growth/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
    setMessage("Growth profile saved."); await load();
  }

  const progress = command.progress?.percent ?? 0;
  const topTopic = data.analytics?.topics?.[0];
  const topFormat = data.analytics?.formats?.[0];
  const recommended = useMemo(() => actions.slice(0, 3), [actions]);

  return <main style={{ minHeight: "100vh", maxWidth: 1420, margin: "0 auto", padding: 28 }}>
    <header style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-end", marginBottom: 20 }}>
      <div><div style={{ opacity: .5, fontSize: 12, letterSpacing: 2 }}>X GROWTH AGENT · INTELLIGENCE WORKSPACE</div><h1 style={{ fontSize: 36, margin: "8px 0" }}>Good morning, {account.name || "builder"}.</h1><div style={{ opacity: .65 }}>The system's job: tell you what is worth doing today — without spam.</div></div>
      <div style={{ display: "flex", gap: 8 }}><button style={button} onClick={seedDemo}>Load demo data</button><button style={button} onClick={load}>{loading ? "Refreshing…" : "Refresh"}</button></div>
    </header>
    {message && <div style={{ ...box, marginBottom: 16 }}>{message}</div>}
    <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>{tabs.map((x) => <button key={x} style={{ ...button, background: tab === x ? "rgba(255,255,255,.14)" : button.background }} onClick={() => setTab(x)}>{x}</button>)}</nav>

    {tab === "Today" && <>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
        <Metric label="Followers" value={account.followers_count ?? 0} sub={`${progress}% of ${command.goal ?? 1000}`} />
        <Metric label="Today's actions" value={actions.length} sub="prioritized, approval-first" />
        <Metric label="Real posts" value={realPosts} sub="used for learning" />
        <Metric label="Learning" value={learning.sufficient ? "Early signal" : "Not enough data"} sub={learning.sufficient ? learning.message : "Need at least 5 real posts"} />
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginTop: 12 }}>
        <div style={box}><h2>Today's highest-value actions</h2>{recommended.map((a: Any) => <article key={a.referenceId} style={{ borderTop: "1px solid rgba(255,255,255,.07)", padding: "16px 0" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><b>{a.title}</b><p style={{ opacity: .65, margin: "7px 0 0" }}>{a.reason}</p></div><strong>{a.priority}/100</strong></div></article>)}{!recommended.length && <Empty text="No open recommendations yet. Load clearly labelled demo data or add manual opportunities." />}</div>
        <div style={box}><h2>Progress</h2><div style={{ fontSize: 44, fontWeight: 750 }}>{account.followers_count ?? 0}</div><div style={{ opacity: .6 }}>toward {command.goal ?? 1000}</div><div style={{ height: 8, background: "rgba(255,255,255,.08)", borderRadius: 20, margin: "18px 0" }}><div style={{ width: `${progress}%`, height: "100%", background: "currentColor", borderRadius: 20 }} /></div><b>{command.dataStatus?.x === "limited" ? "X connected · API limited" : account ? "X connected" : "X not connected"}</b><p style={{ opacity: .6 }}>{command.dataStatus?.x === "limited" ? "Credits unavailable. The intelligence layer continues from stored/manual/demo data." : "Live availability is tracked separately from intelligence."}</p></div>
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div style={box}><h2>🔥 Top opportunities</h2>{(command.opportunities || []).slice(0, 3).map((o: Any) => <Opportunity key={o.id} o={o} onClick={() => generateReply(o)} />)}</div>
        <div style={box}><h2>✍️ Best content opportunities</h2>{(command.content || []).slice(0, 3).map((i: Any) => <Idea key={i.id} idea={i} onClick={() => generateContent(i)} />)}</div>
      </section>
      {(topTopic || topFormat) && <section style={{ ...box, marginTop: 12 }}><h2>What your data currently says</h2>{topTopic && <p>Top topic signal: <b>{topTopic.topic}</b> · {topTopic.avgEngagements} average engagements across {topTopic.posts} posts.</p>}{topFormat && <p>Top format signal: <b>{topFormat.format}</b> · {topFormat.avgEngagements} average engagements across {topFormat.posts} posts.</p>}<small style={{ opacity: .55 }}>These signals are directional and only use real stored posts.</small></section>}
    </>}

    {tab === "Opportunities" && <Panel title="Opportunity engine" subtitle="Relevance + momentum + audience fit + conversation quality + your ability to add value.">{(command.opportunities || []).map((o: Any) => <Opportunity key={o.id} o={o} onClick={() => generateReply(o)} />)}</Panel>}
    {tab === "Content" && <Panel title="Content intelligence" subtitle="First-hand context is preferred. Nothing publishes automatically."><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>{(command.content || []).map((i: Any) => <Idea key={i.id} idea={i} onClick={() => generateContent(i)} />)}</div><h3>Drafts</h3>{(data.content?.drafts || []).map((d: Any) => <Draft key={d.id} draft={d} onApprove={() => approve("content", d.id)} />)}</Panel>}
    {tab === "Replies" && <Panel title="Reply intelligence" subtitle="Useful, contextual and human. No generic engagement bait.">{(data.replies?.replies || []).map((r: Any) => <Draft key={r.id} draft={{ ...r, body: r.reply }} onApprove={() => approve("reply", r.id)} />)}{!(data.replies?.replies || []).length && <Empty text="Generate replies from the Opportunities tab." />}</Panel>}
    {tab === "People" && <Panel title="Relationship engine" subtitle="Prioritize recurring relationships over follower counts.">{(command.relationships || []).map((p: Any) => <div key={p.id} style={{ ...box, marginBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between" }}><div><h3 style={{ margin: 0 }}>@{p.x_username}</h3><div style={{ opacity: .6 }}>{p.display_name} · {p.niche}</div></div><b>{p.relationship_status}</b></div><p>{p.interaction_count} interactions · {p.relevance_score}/100 relevance</p><small style={{ opacity: .55 }}>{p.notes}</small></div>)}</Panel>}
    {tab === "Analytics" && <Panel title="Analytics + learning" subtitle="Real data is kept separate from demo data."><div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}><Metric label="Posts" value={data.analytics?.postsAnalyzed ?? 0} sub="real stored posts" /><Metric label="Impressions" value={data.analytics?.summary?.impressions ?? 0} sub="real" /><Metric label="Engagements" value={data.analytics?.summary?.engagements ?? 0} sub="real" /><Metric label="Rate" value={data.analytics?.summary?.engagementRate == null ? "—" : `${data.analytics.summary.engagementRate}%`} sub="real" /></div><div style={{ ...box, marginTop: 12 }}><h3>Learning loop</h3><p>{data.analytics?.learning?.message}</p>{(data.analytics?.learning?.insights || []).map((x: string) => <p key={x}>• {x}</p>)}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}><div style={box}><h3>Best topics</h3>{(data.analytics?.topics || []).map((x: Any) => <p key={x.topic}>{x.topic} · {x.avgEngagements} avg · {x.posts} posts</p>)}</div><div style={box}><h3>Best formats</h3>{(data.analytics?.formats || []).map((x: Any) => <p key={x.format}>{x.format} · {x.avgEngagements} avg · {x.posts} posts</p>)}</div></div></Panel>}
    {tab === "Calendar" && <Panel title="Content calendar" subtitle="Plan; do not auto-publish.">{(data.calendar?.calendar || []).map((x: Any) => <div key={x.id} style={{ ...box, marginBottom: 10 }}><b>{new Date(x.planned_date).toLocaleDateString()}</b> · {x.pillar} · {x.format} · {x.status}</div>)}{!(data.calendar?.calendar || []).length && <Empty text="No planned content yet." />}</Panel>}
    {tab === "Profile" && <Panel title="Growth profile" subtitle="This context is used by scoring and generation."><label>Niche<input value={profile.niche || ""} onChange={(e) => setProfile({ ...profile, niche: e.target.value })} style={input} /></label><label>Target followers<input type="number" value={profile.target_followers || 1000} onChange={(e) => setProfile({ ...profile, target_followers: Number(e.target.value) })} style={input} /></label><label>Content pillars<input value={(profile.content_pillars || []).join(", ")} onChange={(e) => setProfile({ ...profile, content_pillars: e.target.value.split(",").map((x: string) => x.trim()).filter(Boolean) })} style={input} /></label><label>Tone<input value={(profile.tone || []).join(", ")} onChange={(e) => setProfile({ ...profile, tone: e.target.value.split(",").map((x: string) => x.trim()).filter(Boolean) })} style={input} /></label><button style={button} onClick={saveProfile}>Save profile</button></Panel>}
    {tab === "Approvals" && <Panel title="Approval center" subtitle="Nothing is published just because it is approved."><h3>Content</h3>{(data.approvals?.content || []).map((x: Any) => <Draft key={x.id} draft={x} onApprove={() => approve("content", x.id)} />)}<h3>Replies</h3>{(data.approvals?.replies || []).map((x: Any) => <Draft key={x.id} draft={{ ...x, body: x.reply }} onApprove={() => approve("reply", x.id)} />)}</Panel>}
  </main>;
}

function Metric({ label, value, sub }: { label: string; value: any; sub: string }) { return <div style={box}><div style={{ opacity: .55 }}>{label}</div><div style={{ fontSize: 30, fontWeight: 750, marginTop: 6 }}>{value}</div><small style={{ opacity: .55 }}>{sub}</small></div>; }
function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section style={box}><h2 style={{ marginTop: 0 }}>{title}</h2><p style={{ opacity: .6 }}>{subtitle}</p>{children}</section>; }
function Empty({ text }: { text: string }) { return <div style={{ ...box, opacity: .7 }}>{text}</div>; }
function Opportunity({ o, onClick }: { o: Any; onClick: () => void }) { return <article style={{ borderTop: "1px solid rgba(255,255,255,.07)", padding: "16px 0" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><b>@{String(o.author_username || "").replace(/^@+/, "")}</b> · {o.topic}<p style={{ opacity: .62 }}>{o.content}</p><small style={{ opacity: .55 }}>{o.reason || o.suggested_angle}</small></div><strong>{o.opportunity_score}/100</strong></div><button style={button} onClick={onClick}>Generate thoughtful reply</button></article>; }
function Idea({ idea, onClick }: { idea: Any; onClick: () => void }) { return <article style={{ ...box, marginBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between" }}><b>{idea.title}</b><strong>{idea.score}/100</strong></div><p style={{ opacity: .62 }}>{idea.reason}</p><p>{idea.hook}</p><small style={{ opacity: .55 }}>{idea.angle}</small><div style={{ marginTop: 12 }}><button style={button} onClick={onClick}>Generate draft</button></div></article>; }
function Draft({ draft, onApprove }: { draft: Any; onApprove: () => void }) { return <article style={{ ...box, margin: "10px 0" }}><div style={{ display: "flex", justifyContent: "space-between" }}><b>{draft.format || "Draft"}</b><span>{draft.status}</span></div><textarea defaultValue={draft.body || ""} style={{ width: "100%", minHeight: 120, margin: "12px 0", background: "transparent", color: "inherit", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: 12 }} /><button style={button} onClick={onApprove}>Approve internally</button></article>; }
const input: React.CSSProperties = { width: "100%", display: "block", margin: "6px 0 16px", padding: 12, background: "transparent", color: "inherit", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10 };
