"use client";

import { FormEvent, useEffect, useState } from "react";

type Relationship = {
  id: string;
  x_username: string;
  display_name: string;
  niche: string;
  interaction_count: number;
  last_interaction_at: string | null;
  topics: string[];
  relationship_status: string;
  relevance_score: number;
  notes: string;
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ x_username: "", display_name: "", niche: "", interaction_count: 0, relevance_score: 50, topics: "", notes: "" });

  async function load() {
    try {
      setError("");
      const data = await api<{ relationships: Relationship[] }>("/api/growth/relationships");
      setPeople(data.relationships);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load relationships");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/growth/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          topics: form.topics.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      setForm({ x_username: "", display_name: "", niche: "", interaction_count: 0, relevance_score: 50, topics: "", notes: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save relationship");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "40px", background: "#090a0f", color: "#f4f4f5", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <a href="/" style={{ color: "#a1a1aa", textDecoration: "none" }}>← Back to Growth Command Center</a>
        <header style={{ margin: "32px 0" }}>
          <p style={{ color: "#a1a1aa", margin: 0 }}>PEOPLE</p>
          <h1 style={{ fontSize: 40, margin: "8px 0" }}>Relationship engine</h1>
          <p style={{ color: "#a1a1aa", margin: 0 }}>Track people you actually talk to, not vanity metrics.</p>
        </header>

        {error && <div style={{ padding: 14, marginBottom: 20, border: "1px solid #3f3f46", borderRadius: 12 }}>{error}</div>}

        <section style={{ background: "#111217", border: "1px solid #27272a", borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Add relationship</h2>
          <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
            <input required placeholder="X username" value={form.x_username} onChange={(e) => setForm({ ...form, x_username: e.target.value })} />
            <input placeholder="Display name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            <input placeholder="Niche" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} />
            <input type="number" min="0" placeholder="Interactions" value={form.interaction_count} onChange={(e) => setForm({ ...form, interaction_count: Number(e.target.value) || 0 })} />
            <input type="number" min="0" max="100" placeholder="Relevance 0-100" value={form.relevance_score} onChange={(e) => setForm({ ...form, relevance_score: Number(e.target.value) || 0 })} />
            <input placeholder="Topics, comma separated" value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} />
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ gridColumn: "1 / -1", minHeight: 80 }} />
            <button type="submit" disabled={busy} style={{ gridColumn: "1 / -1", padding: "12px 16px", borderRadius: 10, border: 0, fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>{busy ? "Saving…" : "Save relationship"}</button>
          </form>
        </section>

        <section style={{ background: "#111217", border: "1px solid #27272a", borderRadius: 16, padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Tracked people</h2>
          {loading ? <p style={{ color: "#a1a1aa" }}>Loading…</p> : people.length === 0 ? <p style={{ color: "#a1a1aa" }}>No relationships tracked yet.</p> : people.map((person) => (
            <article key={person.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto auto", gap: 16, alignItems: "center", padding: "18px 0", borderTop: "1px solid #27272a" }}>
              <div><strong>@{person.x_username}</strong><div style={{ color: "#a1a1aa", marginTop: 5 }}>{person.display_name || ""} {person.niche ? `· ${person.niche}` : ""}</div>{person.notes && <div style={{ color: "#71717a", marginTop: 6 }}>{person.notes}</div>}</div>
              <span>{person.interaction_count} interactions</span>
              <strong>{person.relationship_status}</strong>
              <span>{person.relevance_score}/100</span>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
