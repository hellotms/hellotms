import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  MessageSquare,
  Search,
  RefreshCw,
  Eye,
  Mail,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Building2,
  FileText,
  ChevronDown,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string;
  service: string | null;
  status: "new" | "seen" | "replied";
  created_at: string;
  replied_at: string | null;
  is_starred: boolean;
}

const STATUS_CONFIG = {
  new: {
    label: "New",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
  },
  seen: {
    label: "Seen",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
  },
  replied: {
    label: "Replied",
    color: "bg-green-500/10 text-green-400 border-green-500/20",
    dot: "bg-green-400",
  },
};

export default function ContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "seen" | "replied">(
    "all",
  );
  const [selected, setSelected] = useState<ContactSubmission | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    const { data } = await query;
    setSubmissions(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markStatus = async (
    id: string,
    status: ContactSubmission["status"],
  ) => {
    await supabase
      .from("contact_submissions")
      .update({
        status,
        ...(status === "replied"
          ? { replied_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", id);
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s)),
    );
    if (selected?.id === id)
      setSelected((prev) => (prev ? { ...prev, status } : prev));
  };

  const toggleStar = async (
    e: React.MouseEvent,
    id: string,
    currentStarred: boolean,
  ) => {
    e.stopPropagation();
    await supabase
      .from("contact_submissions")
      .update({ is_starred: !currentStarred })
      .eq("id", id);
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, is_starred: !currentStarred } : s,
      ),
    );
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this submission?")) {
      await supabase.from("contact_submissions").delete().eq("id", id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      if (selected?.id === id) setSelected(null);
    }
  };

  const filtered = submissions.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.company ?? "").toLowerCase().includes(q) ||
        s.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: submissions.length,
    new: submissions.filter((s) => s.status === "new").length,
    seen: submissions.filter((s) => s.status === "seen").length,
    replied: submissions.filter((s) => s.status === "replied").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Contact Submissions
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Messages from the public contact form
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["all", "new", "seen", "replied"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`p-3 rounded-xl border text-left transition-all ${filter === s ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/50"}`}
          >
            <p className="text-2xl font-bold text-foreground">{counts[s]}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">
              {s === "all" ? "Total" : s}
            </p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, company..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No submissions found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((sub) => {
            const cfg = STATUS_CONFIG[sub.status];
            return (
              <div
                key={sub.id}
                onClick={() => {
                  setSelected(sub);
                  markStatus(
                    sub.id,
                    sub.status === "new" ? "seen" : sub.status,
                  );
                }}
                className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 hover:bg-card/80 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground text-sm">
                          {sub.name}
                        </p>
                        {sub.status === "new" && (
                          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {sub.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => toggleStar(e, sub.id, sub.is_starred)}
                    >
                      <svg
                        className={`h-4 w-4 transition-colors ${sub.is_starred ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground hover:text-yellow-400"}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(sub.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, sub.id)}
                      className="ml-1 p-1 hover:bg-red-50 text-muted-foreground hover:text-red-500 rounded transition-colors group-hover:opacity-100 sm:opacity-0 focus:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2 pl-12">
                  {sub.message}
                </p>
                {(sub.company || sub.service) && (
                  <div className="flex items-center gap-3 mt-2 pl-12">
                    {sub.company && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {sub.company}
                      </span>
                    )}
                    {sub.service && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {sub.service}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-lg text-foreground">
                Submission Details
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Name</p>
                  <p className="font-medium text-sm text-foreground">
                    {selected.name}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_CONFIG[selected.status].color}`}
                  >
                    {STATUS_CONFIG[selected.status].label}
                  </span>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </p>
                  <a
                    href={`mailto:${selected.email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {selected.email}
                  </a>
                </div>
                {selected.phone && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Phone
                    </p>
                    <a
                      href={`tel:${selected.phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {selected.phone}
                    </a>
                  </div>
                )}
                {selected.company && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">
                      Company
                    </p>
                    <p className="text-sm text-foreground">
                      {selected.company}
                    </p>
                  </div>
                )}
                {selected.service && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">
                      Service Interest
                    </p>
                    <p className="text-sm text-foreground">
                      {selected.service}
                    </p>
                  </div>
                )}
              </div>
              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Message
                </p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {selected.message}
                </p>
              </div>
              <div className="flex items-center gap-2.5 pt-2">
                <a
                  href={`mailto:${selected.email}?subject=Re: Your enquiry to Marketing Solution`}
                  onClick={() => markStatus(selected.id, "replied")}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Mail className="h-4 w-4" /> Reply via Email
                </a>
                {selected.status !== "replied" && (
                  <button
                    onClick={() => markStatus(selected.id, "replied")}
                    className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm hover:bg-muted transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-400" /> Mark
                    Replied
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center flex items-center gap-1 justify-center">
                <Clock className="h-3 w-3" /> Submitted{" "}
                {formatDistanceToNow(new Date(selected.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
