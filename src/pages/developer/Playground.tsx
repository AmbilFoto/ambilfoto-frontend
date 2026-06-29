import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { DeveloperLayout } from "@/components/developer/DeveloperLayout";
import { developerService, ApiKey } from "@/services/api/developer.service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FlaskConical,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Loader2,
  Key,
  Globe,
  Code2,
  Trash2,
  AlertTriangle,
  FileJson,
  History,
  Zap,
  RefreshCw,
  Eye,
  EyeOff,
  Info,
  ChevronRight,
  BookOpen,
  Shield,
  Terminal,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

interface KVRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface RequestHistory {
  id: string;
  method: string;
  url: string;
  status: number | null;
  duration: number | null;
  timestamp: Date;
  success: boolean;
  label?: string;
}

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
  size: string;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// ─── Constants ───────────────────────────────────────────────────────────────

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const METHOD_STYLES: Record<HttpMethod, { bg: string; text: string; border: string }> = {
  GET:    { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30" },
  POST:   { bg: "bg-blue-500/10",    text: "text-blue-500",    border: "border-blue-500/30"    },
  PUT:    { bg: "bg-amber-500/10",   text: "text-amber-500",   border: "border-amber-500/30"   },
  PATCH:  { bg: "bg-violet-500/10",  text: "text-violet-500",  border: "border-violet-500/30"  },
  DELETE: { bg: "bg-red-500/10",     text: "text-red-500",     border: "border-red-500/30"     },
};

const PRESET_ENDPOINTS = [
  {
    label: "Get Usage Stats",
    method: "GET" as HttpMethod,
    path: "/usage",
    description: "Cek statistik penggunaan API kamu bulan ini",
    body: "",
    contentType: "application/json",
    icon: "📊",
  },
  {
    label: "Analyze Photo",
    method: "POST" as HttpMethod,
    path: "/photo/analyze",
    description: "Analisis foto via AI — tags, label, metadata",
    body: JSON.stringify({
      image_url: "https://example.com/photo.jpg",
      options: { tags: true, faces: false, nsfw: true },
    }, null, 2),
    contentType: "application/json",
    icon: "🔍",
  },
  {
    label: "Match Photos",
    method: "POST" as HttpMethod,
    path: "/photo/match",
    description: "Cari foto mirip secara visual dari database",
    body: JSON.stringify({
      image_url: "https://example.com/query.jpg",
      threshold: 0.8,
      limit: 10,
    }, null, 2),
    contentType: "application/json",
    icon: "🖼️",
  },
  {
    label: "Upload Photo",
    method: "POST" as HttpMethod,
    path: "/photo/upload",
    description: "Upload foto (kuota upload). Gunakan multipart/form-data.",
    body: JSON.stringify({ title: "My Photo", description: "Optional description" }, null, 2),
    contentType: "multipart/form-data",
    icon: "📤",
  },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 9);

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const syntaxHighlight = (json: string) =>
  json
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "text-amber-300";
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? "text-sky-300" : "text-emerald-300";
        } else if (/true|false/.test(match)) cls = "text-purple-300";
        else if (/null/.test(match)) cls = "text-rose-400";
        return `<span class="${cls}">${match}</span>`;
      }
    );

const getStatusMeta = (status: number | null) => {
  if (!status || status === 0) return { color: "text-rose-400 border-rose-400/30 bg-rose-400/10", label: "ERR", emoji: "💥" };
  if (status < 200) return { color: "text-sky-400 border-sky-400/30 bg-sky-400/10", label: `${status}`, emoji: "ℹ️" };
  if (status < 300) return { color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10", label: `${status}`, emoji: "✅" };
  if (status < 400) return { color: "text-amber-400 border-amber-400/30 bg-amber-400/10", label: `${status}`, emoji: "↩️" };
  if (status < 500) return { color: "text-orange-400 border-orange-400/30 bg-orange-400/10", label: `${status}`, emoji: "⚠️" };
  return { color: "text-rose-400 border-rose-400/30 bg-rose-400/10", label: `${status}`, emoji: "🔥" };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const MethodBadge = ({ method, size = "sm" }: { method: string; size?: "sm" | "xs" }) => {
  const s = METHOD_STYLES[method as HttpMethod] ?? METHOD_STYLES.GET;
  return (
    <span className={`font-mono font-bold border rounded px-1.5 shrink-0 ${s.bg} ${s.text} ${s.border} ${size === "xs" ? "text-[10px] py-0" : "text-xs py-0.5"}`}>
      {method}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const DeveloperPlayground = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  // Keys
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [showRawKey, setShowRawKey] = useState(false);
  const [keysLoading, setKeysLoading] = useState(true);
  const [rawKey, setRawKey] = useState<string>(() =>
    typeof window !== "undefined" ? (sessionStorage.getItem("pg_raw_key") ?? "") : ""
  );
  const [rawKeyVisible, setRawKeyVisible] = useState(false);
  const [rawKeyError, setRawKeyError] = useState(false);

  const handleRawKeyChange = (val: string) => {
    setRawKey(val);
    setRawKeyError(false);
    if (val.trim()) {
      sessionStorage.setItem("pg_raw_key", val.trim());
    } else {
      sessionStorage.removeItem("pg_raw_key");
    }
  };

  const clearRawKey = () => {
    setRawKey("");
    setRawKeyError(false);
    sessionStorage.removeItem("pg_raw_key");
  };

  const matchKeyFromRaw = (raw: string): ApiKey | null => {
    if (!raw.trim()) return null;
    return keys.find((k) => raw.trim().startsWith(k.key_prefix) && Boolean(k.is_active)) ?? null;
  };

  // Request
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [baseUrl, setBaseUrl] = useState(() =>
    import.meta.env.VITE_API_BASE_URL
      ? `${import.meta.env.VITE_API_BASE_URL}/v1`
      : "http://localhost:5000/api/v1"
  );
  const [path, setPath] = useState("/usage");
  const [headers, setHeaders] = useState<KVRow[]>([
    { id: genId(), key: "Content-Type", value: "application/json", enabled: true },
    { id: genId(), key: "Accept", value: "application/json", enabled: true },
  ]);
  const [params, setParams] = useState<KVRow[]>([
    { id: genId(), key: "page", value: "1", enabled: false },
    { id: genId(), key: "limit", value: "10", enabled: false },
  ]);
  const [body, setBody] = useState("");
  const [isMultipart, setIsMultipart] = useState(false);

  // Response
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [responseTab, setResponseTab] = useState("body");
  const [copied, setCopied] = useState<string | null>(null);

  const responseRef = useRef<HTMLDivElement>(null);

  // ── Load keys ──
  useEffect(() => {
    if (!id) return;
    developerService
      .getKeys(id)
      .then((res) => {
        if (res.success) {
          setKeys(res.data);
          const active = res.data.find((k) => Boolean(k.is_active) && k.key_type === "dev")
            ?? res.data.find((k) => Boolean(k.is_active));
          if (active) setSelectedKeyId(active.id);
        }
      })
      .catch(() => toast({ title: "Gagal memuat API keys", variant: "destructive" }))
      .finally(() => setKeysLoading(false));
  }, [id]);

  const selectedKey = keys.find((k) => k.id === selectedKeyId) ?? null;
  const activeKeys  = keys.filter((k) => Boolean(k.is_active));

  // ── URL builder ──
  const buildUrl = useCallback(() => {
    const activeParams = params.filter((p) => p.enabled && p.key.trim());
    const qs = activeParams.length
      ? "?" + activeParams.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join("&")
      : "";
    return `${baseUrl.replace(/\/$/, "")}${path}${qs}`;
  }, [baseUrl, path, params]);

  // ── cURL builder ──
  const buildCurl = useCallback(() => {
    const url = buildUrl();
    const displayKey = rawKey.trim() ? rawKey.trim() : "YOUR_API_KEY";
    const keyHeader = ` \\\n  -H "X-API-Key: ${displayKey}"`;
    const hdrs = headers
      .filter((h) => h.enabled && h.key.trim() && h.key !== "Content-Type")
      .map((h) => ` \\\n  -H "${h.key}: ${h.value}"`).join("");
    const bodyStr = isMultipart
      ? ` \\\n  -F "file=@/path/to/photo.jpg" \\\n  -F "title=My Photo"`
      : ["POST", "PUT", "PATCH"].includes(method) && body.trim()
        ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${body.replace(/\n/g, " ").replace(/'/g, "\\'")}'`
        : "";
    return `curl -X ${method} "${url}"${keyHeader}${hdrs}${bodyStr}`;
  }, [buildUrl, rawKey, headers, method, body, isMultipart]);

  // ── Send request ──
  const sendRequest = async () => {
    if (!rawKey.trim()) {
      setRawKeyError(true);
      toast({ title: "Masukkan API key terlebih dahulu", description: "Paste key asli kamu di field Step 1.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResponse(null);
    const start = performance.now();
    const url = buildUrl();

    const reqHeaders: Record<string, string> = {};
    headers.filter((h) => h.enabled && h.key.trim()).forEach((h) => {
      reqHeaders[h.key] = h.value;
    });
    reqHeaders["X-API-Key"] = rawKey.trim();

    try {
      const opts: RequestInit = { method, headers: reqHeaders };
      if (["POST", "PUT", "PATCH"].includes(method) && body.trim() && !isMultipart) {
        opts.body = body;
      }

      const res = await fetch(url, opts);
      const duration = Math.round(performance.now() - start);

      let resBody: unknown;
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        resBody = await res.json();
      } else {
        resBody = { _raw: await res.text() };
      }

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => (resHeaders[k] = v));

      const bodyStr = JSON.stringify(resBody, null, 2);
      const size = formatBytes(new TextEncoder().encode(bodyStr).length);

      const apiRes: ApiResponse = {
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: resBody,
        duration,
        size,
      };

      setResponse(apiRes);
      setResponseTab("body");

      setHistory((prev) => [
        { id: genId(), method, url, status: res.status, duration, timestamp: new Date(), success: res.ok },
        ...prev,
      ].slice(0, 30));

      setTimeout(() => responseRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      const msg = err instanceof Error ? err.message : "Network error";

      setResponse({
        status: 0,
        statusText: "Network Error",
        headers: {},
        body: {
          error: msg,
          hint: msg.includes("CORS") || msg.includes("fetch")
            ? "CORS error: Pastikan server API mengizinkan origin browser kamu."
            : "Pastikan server API berjalan dan URL sudah benar.",
        },
        duration,
        size: "—",
      });

      setHistory((prev) => [
        { id: genId(), method, url, status: null, duration, timestamp: new Date(), success: false },
        ...prev,
      ].slice(0, 30));
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: typeof PRESET_ENDPOINTS[number]) => {
    setMethod(preset.method);
    setPath(preset.path);
    setBody(preset.body ?? "");
    const mp = preset.contentType === "multipart/form-data";
    setIsMultipart(mp);
    setHeaders((prev) =>
      prev.map((h) =>
        h.key === "Content-Type"
          ? { ...h, value: mp ? "multipart/form-data" : "application/json", enabled: true }
          : h
      )
    );
    toast({ title: `Preset "${preset.label}" diterapkan` });
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── KV row helpers ──
  const addRow    = (setter: React.Dispatch<React.SetStateAction<KVRow[]>>) =>
    setter((p) => [...p, { id: genId(), key: "", value: "", enabled: true }]);
  const removeRow = (setter: React.Dispatch<React.SetStateAction<KVRow[]>>, rid: string) =>
    setter((p) => p.filter((r) => r.id !== rid));
  const updateRow = (setter: React.Dispatch<React.SetStateAction<KVRow[]>>, rid: string, field: keyof KVRow, val: string | boolean) =>
    setter((p) => p.map((r) => r.id === rid ? { ...r, [field]: val } : r));

  const formatJSON = () => {
    try {
      const clean = body.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
      setBody(JSON.stringify(JSON.parse(clean), null, 2));
    } catch {
      toast({ title: "JSON tidak valid", variant: "destructive" });
    }
  };

  if (!id) return null;

  const statusMeta = response ? getStatusMeta(response.status) : null;

  return (
    <DeveloperLayout developerId={id}>
      {/* Prevent any child from pushing past viewport width */}
      <div className="space-y-4 min-w-0 w-full overflow-x-hidden">

        {/* ── Header ── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              API Playground
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Test endpoint API langsung dari browser — seperti Postman, tanpa install apapun.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowHistory((p) => !p)}
              >
                <History className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Riwayat</span> ({history.length})
                {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            )}
          </div>
        </div>

        {/* ── CORS notice ── */}
        <div className="rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30 px-3 sm:px-4 py-3 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
          <div className="text-sky-700 dark:text-sky-300 space-y-0.5 min-w-0">
            <p className="text-xs sm:text-sm font-medium">Cara penggunaan Playground</p>
            <p className="text-[11px] sm:text-xs opacity-80 leading-relaxed">
              Request dikirim langsung dari browser. Pastikan server API kamu mengaktifkan{" "}
              <code className="bg-sky-100 dark:bg-sky-900 px-1 rounded">CORS</code> untuk origin ini.
              Key dikirim via header{" "}
              <code className="bg-sky-100 dark:bg-sky-900 px-1 rounded">X-API-Key</code>.
            </p>
          </div>
        </div>

        {/* ── Request History ── */}
        {showHistory && history.length > 0 && (
          <Card className="shadow-soft">
            <CardHeader className="pb-2 pt-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Riwayat Request
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
                onClick={() => setHistory([])}>
                Hapus semua
              </Button>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {history.map((h) => {
                  const s = getStatusMeta(h.status);
                  return (
                    <button
                      key={h.id}
                      className="w-full flex items-center gap-2 rounded-lg px-2 sm:px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left group"
                      onClick={() => {
                        setMethod(h.method as HttpMethod);
                        try {
                          const u = new URL(h.url);
                          setBaseUrl(u.origin);
                          setPath(u.pathname);
                        } catch {}
                      }}
                    >
                      <MethodBadge method={h.method} size="xs" />
                      <span className="flex-1 truncate font-mono text-muted-foreground group-hover:text-foreground min-w-0">
                        {h.url}
                      </span>
                      {h.status ? (
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold shrink-0 ${s.color}`}>
                          {h.status}
                        </span>
                      ) : (
                        <span className="text-[10px] text-rose-400 shrink-0">ERR</span>
                      )}
                      {h.duration !== null && (
                        <span className="text-muted-foreground/60 tabular-nums shrink-0 hidden sm:block">{h.duration}ms</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Main grid: stacked on mobile, side-by-side on xl ── */}
        <div className="grid gap-4 xl:grid-cols-[1fr_440px]">

          {/* ═══════ LEFT: Request Builder ═══════ */}
          <div className="space-y-4 min-w-0">

            {/* Step 1 — API Key Input */}
            <Card className={`shadow-soft transition-all ${rawKeyError ? "ring-2 ring-destructive/50 border-destructive/50" : ""}`}>
              <CardContent className="pt-4 pb-4 space-y-3">
                {/* Title row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">1</div>
                    <span className="text-sm font-semibold">Masukkan API Key</span>
                    {rawKey.trim() && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full dark:bg-emerald-900/20 dark:border-emerald-800">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Siap
                      </span>
                    )}
                  </div>
                  {rawKey.trim() && (
                    <button onClick={clearRawKey} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors shrink-0">
                      <Trash2 className="h-3 w-3" /> Hapus
                    </button>
                  )}
                </div>

                {/* Info box */}
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                    Paste <strong>key asli</strong> di sini — hanya ditampilkan <strong>sekali saat dibuat/di-regenerate</strong>. Tidak disimpan permanen, hanya di memory tab ini.
                  </p>
                </div>

                {/* Input — overflow handled by min-w-0 on parent */}
                <div className="relative min-w-0">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type={rawKeyVisible ? "text" : "password"}
                    value={rawKey}
                    onChange={(e) => handleRawKeyChange(e.target.value)}
                    placeholder="af_dev_xxxx…"
                    spellCheck={false}
                    autoComplete="off"
                    className={`w-full min-w-0 pl-9 pr-10 py-2.5 rounded-lg border font-mono text-xs sm:text-sm bg-background transition-colors
                      focus:outline-none focus:ring-2 focus:ring-primary/30
                      ${rawKeyError ? "border-destructive bg-destructive/5" : "border-input hover:border-muted-foreground/40"}
                    `}
                  />
                  <button
                    type="button"
                    onClick={() => setRawKeyVisible((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {rawKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {rawKeyError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" /> API key wajib diisi sebelum mengirim request.
                  </p>
                )}

                {/* Key match info */}
                {rawKey.trim() && (() => {
                  const matched = matchKeyFromRaw(rawKey);
                  return matched ? (
                    <div className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${matched.key_type === "prod" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-sky-100 dark:bg-sky-900/30"}`}>
                        <Key className={`h-3.5 w-3.5 ${matched.key_type === "prod" ? "text-amber-600" : "text-sky-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          ✓ Cocok dengan {matched.key_type.toUpperCase()} key di akun kamu
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground truncate">{matched.key_preview}</p>
                      </div>
                      {matched.key_type === "prod" && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 text-amber-600 border-amber-300">PROD</Badge>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                      <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <p className="text-[11px] text-muted-foreground">
                        Header <code className="bg-muted px-1 rounded font-mono">X-API-Key</code> akan dikirim dengan value ini.
                      </p>
                    </div>
                  );
                })()}

                {/* Active keys reference */}
                {!keysLoading && activeKeys.length > 0 && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Key aktif di akunmu (referensi prefix):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeKeys.map((k) => (
                        <div key={k.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40 border border-border text-[11px] font-mono">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${k.key_type === "prod" ? "bg-amber-500" : "bg-sky-500"}`} />
                          <span className="truncate max-w-[120px] sm:max-w-none">{k.key_preview}</span>
                          <span className="text-muted-foreground/60 capitalize shrink-0">({k.key_type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2 — Preset & URL */}
            <Card className="shadow-soft">
              <CardContent className="pt-4 pb-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">2</div>
                  <span className="text-sm font-semibold">Pilih Endpoint</span>
                </div>

                {/* Presets — 1 col on xs, 2 col on sm+ */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Quick start — klik untuk langsung isi form:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRESET_ENDPOINTS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => applyPreset(preset)}
                        className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all hover:shadow-sm w-full min-w-0 ${
                          path === preset.path && method === preset.method
                            ? "border-primary/40 bg-primary/5"
                            : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                        }`}
                      >
                        <span className="text-base shrink-0 mt-0.5">{preset.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <MethodBadge method={preset.method} size="xs" />
                            <span className="text-xs font-medium">{preset.label}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">{preset.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* URL Bar — stack vertically on mobile */}
                <div className="space-y-2">
                  {/* Row 1: Method + Send button (mobile), full bar (desktop) */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Method + path on mobile: method select above, path below */}
                    <div className="flex gap-2 sm:flex-1 min-w-0">
                      <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
                        <SelectTrigger className={`w-24 sm:w-28 font-mono font-bold text-xs h-10 border shrink-0 ${METHOD_STYLES[method].bg} ${METHOD_STYLES[method].text} ${METHOD_STYLES[method].border}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HTTP_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              <MethodBadge method={m} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Path input only — base URL moved below on mobile */}
                      <Input
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        className="h-10 font-mono text-xs flex-1 min-w-0"
                        placeholder="/endpoint"
                      />
                    </div>

                    <Button
                      className="h-10 px-4 sm:px-5 gap-2 font-semibold w-full sm:w-auto"
                      onClick={sendRequest}
                      disabled={loading || !selectedKeyId}
                    >
                      {loading
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim…</>
                        : <><Play className="h-4 w-4 fill-current" /> Kirim</>
                      }
                    </Button>
                  </div>

                  {/* Base URL — separate row, collapsible feel */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">BASE</span>
                    <Input
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="h-8 font-mono text-xs text-muted-foreground bg-muted/30 flex-1 min-w-0"
                      placeholder="Base URL"
                    />
                  </div>

                  {/* URL preview */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg min-w-0">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <code className="text-[10px] sm:text-[11px] text-muted-foreground truncate flex-1 font-mono min-w-0">{buildUrl()}</code>
                    <button onClick={() => copyText(buildUrl(), "url")} className="text-muted-foreground hover:text-foreground shrink-0 ml-1">
                      {copied === "url" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3 — Headers / Params / Body */}
            <Card className="shadow-soft">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">3</div>
                  <span className="text-sm font-semibold">Konfigurasi Request</span>
                </div>

                <Tabs defaultValue="headers">
                  <TabsList className="h-8 w-full">
                    <TabsTrigger value="headers" className="text-xs h-7 flex-1">
                      Headers
                      {headers.filter((h) => h.enabled && h.key).length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4 hidden sm:inline-flex">
                          {headers.filter((h) => h.enabled && h.key).length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="params" className="text-xs h-7 flex-1">
                      Params
                      {params.filter((p) => p.enabled && p.key).length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4 hidden sm:inline-flex">
                          {params.filter((p) => p.enabled && p.key).length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="body" className="text-xs h-7 flex-1" disabled={method === "GET" || method === "DELETE"}>
                      Body
                      {body.trim() && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary inline-block" />}
                    </TabsTrigger>
                  </TabsList>

                  {/* Headers */}
                  <TabsContent value="headers" className="mt-4 space-y-2">
                    {headers.map((h) => (
                      <div key={h.id} className="flex items-center gap-1.5 sm:gap-2">
                        <input type="checkbox" checked={h.enabled}
                          onChange={(e) => updateRow(setHeaders, h.id, "enabled", e.target.checked)}
                          className="accent-primary h-3.5 w-3.5 shrink-0" />
                        <Input value={h.key} onChange={(e) => updateRow(setHeaders, h.id, "key", e.target.value)}
                          placeholder="Header" className="h-8 text-xs font-mono flex-1 min-w-0" />
                        <Input value={h.value} onChange={(e) => updateRow(setHeaders, h.id, "value", e.target.value)}
                          placeholder="Value" className="h-8 text-xs font-mono flex-1 min-w-0" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow(setHeaders, h.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => addRow(setHeaders)}>
                      + Tambah Header
                    </Button>
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        Header <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">X-API-Key</code> sudah otomatis dikirim. Tidak perlu tambah manual.
                      </p>
                    </div>
                  </TabsContent>

                  {/* Query Params */}
                  <TabsContent value="params" className="mt-4 space-y-2">
                    {params.map((p) => (
                      <div key={p.id} className="flex items-center gap-1.5 sm:gap-2">
                        <input type="checkbox" checked={p.enabled}
                          onChange={(e) => updateRow(setParams, p.id, "enabled", e.target.checked)}
                          className="accent-primary h-3.5 w-3.5 shrink-0" />
                        <Input value={p.key} onChange={(e) => updateRow(setParams, p.id, "key", e.target.value)}
                          placeholder="Parameter" className="h-8 text-xs font-mono flex-1 min-w-0" />
                        <Input value={p.value} onChange={(e) => updateRow(setParams, p.id, "value", e.target.value)}
                          placeholder="Value" className="h-8 text-xs font-mono flex-1 min-w-0" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow(setParams, p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => addRow(setParams)}>
                      + Tambah Parameter
                    </Button>
                  </TabsContent>

                  {/* Body */}
                  <TabsContent value="body" className="mt-4 space-y-2">
                    {isMultipart && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          Endpoint ini menggunakan <strong>multipart/form-data</strong> untuk upload file.
                          Preview di bawah hanya referensi — gunakan Postman untuk kirim file.
                        </p>
                      </div>
                    )}
                    <div className="relative">
                      <Textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder={'{\n  "key": "value"\n}'}
                        className="font-mono text-xs min-h-48 resize-y leading-relaxed"
                        spellCheck={false}
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-muted-foreground bg-background/80 backdrop-blur-sm"
                          onClick={formatJSON}>
                          <Code2 className="h-3 w-3 mr-1" /> Format
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-muted-foreground bg-background/80 backdrop-blur-sm"
                          onClick={() => setBody("")}>
                          Hapus
                        </Button>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <FileJson className="h-3 w-3" />
                      {isMultipart ? "Referensi field (gunakan multipart/form-data untuk file)" : "Format: JSON body"}
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* ═══════ RIGHT: Response ═══════ */}
          <div ref={responseRef} className="space-y-4 min-w-0">

            {/* Response Card */}
            <Card className="shadow-soft">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    Response
                    {statusMeta && response && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${statusMeta.color}`}>
                        {statusMeta.emoji} {response.status || "ERR"} {response.statusText}
                      </span>
                    )}
                  </CardTitle>
                  {response && (
                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 tabular-nums">
                        <Clock className="h-3 w-3" /> {response.duration}ms
                      </span>
                      <span>{response.size}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => copyText(JSON.stringify(response.body, null, 2), "response")}>
                        {copied === "response"
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {/* Loading */}
                {loading && (
                  <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-medium">Mengirim request…</p>
                    <p className="text-xs opacity-50">Menunggu respons dari server</p>
                  </div>
                )}

                {/* Empty state */}
                {!loading && !response && (
                  <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-muted-foreground">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                      <Terminal className="h-7 w-7 sm:h-8 sm:w-8 opacity-30" />
                    </div>
                    <p className="text-sm font-medium">Respons akan muncul di sini</p>
                    <p className="text-xs opacity-50 text-center">Klik tombol <strong>Kirim</strong> untuk memulai</p>
                    <div className="flex flex-col items-start gap-1.5 mt-2 p-3 rounded-xl bg-muted/30 text-xs text-muted-foreground w-full max-w-xs">
                      <p className="font-medium text-foreground flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Tips</p>
                      <p>① Paste API key asli di Step 1</p>
                      <p>② Klik preset endpoint atau isi manual</p>
                      <p>③ Klik Kirim dan lihat respons</p>
                    </div>
                  </div>
                )}

                {/* Response content */}
                {!loading && response && (
                  <Tabs value={responseTab} onValueChange={setResponseTab}>
                    <TabsList className="mb-3 h-8">
                      <TabsTrigger value="body" className="text-xs h-7">Body</TabsTrigger>
                      <TabsTrigger value="headers" className="text-xs h-7">
                        Headers
                        <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 h-4">
                          {Object.keys(response.headers).length}
                        </Badge>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="body" className="mt-0">
                      <div className="rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                        <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-zinc-800 bg-zinc-900/80">
                          <div className="flex items-center gap-2">
                            {response.status >= 200 && response.status < 300
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              : <XCircle className="h-3.5 w-3.5 text-rose-400" />
                            }
                            <span className="text-xs text-zinc-400 font-mono">JSON Response</span>
                          </div>
                          <span className="text-[10px] text-zinc-500">{response.size}</span>
                        </div>
                        <pre
                          className="p-3 sm:p-4 text-[11px] sm:text-xs font-mono overflow-auto max-h-72 sm:max-h-80 text-zinc-100 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: syntaxHighlight(JSON.stringify(response.body, null, 2)) }}
                        />
                      </div>

                      {/* Error hint */}
                      {(response.status === 0 || response.status >= 400) && (
                        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-900/10 dark:border-rose-800">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <div className="text-[11px] text-rose-700 dark:text-rose-300 space-y-1">
                            {response.status === 401 && <p><strong>401 Unauthorized:</strong> API key tidak valid. Cek header X-API-Key.</p>}
                            {response.status === 403 && <p><strong>403 Forbidden:</strong> Key aktif tapi tidak punya akses endpoint ini.</p>}
                            {response.status === 429 && <p><strong>429 Too Many Requests:</strong> Rate limit tercapai. Tunggu sebentar.</p>}
                            {response.status === 0 && <p><strong>Network Error:</strong> Tidak bisa connect. Cek server berjalan dan CORS dikonfigurasi.</p>}
                            {response.status >= 500 && <p><strong>Server Error:</strong> Masalah di server API. Hubungi tim support.</p>}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="headers" className="mt-0">
                      <div className="rounded-xl border overflow-hidden">
                        {Object.entries(response.headers).length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-8">Tidak ada response headers</p>
                        ) : (
                          Object.entries(response.headers).map(([k, v], i) => (
                            <div key={k} className={`flex items-start gap-2 sm:gap-3 px-2 sm:px-3 py-2 text-[11px] sm:text-xs font-mono ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                              <span className="text-sky-500 shrink-0 w-28 sm:min-w-[160px] truncate">{k}</span>
                              <span className="text-muted-foreground break-all">{v}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>

            {/* cURL Snippet */}
            <Card className="shadow-soft">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  cURL Command
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                  <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                    <span className="text-[10px] text-zinc-500 font-mono">Terminal / bash</span>
                    <Button
                      variant="ghost" size="sm"
                      className="h-6 text-[10px] px-2 text-zinc-400 hover:text-zinc-100"
                      onClick={() => { copyText(buildCurl(), "curl"); toast({ title: "cURL disalin!" }); }}
                    >
                      {copied === "curl" ? <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copied === "curl" ? "Tersalin!" : "Salin"}
                    </Button>
                  </div>
                  <pre className="p-3 sm:p-4 text-[10px] sm:text-[11px] font-mono text-zinc-300 overflow-auto whitespace-pre-wrap break-all leading-relaxed max-h-48">
                    <span className="text-emerald-400">curl</span>{" "}
                    <span className="text-sky-300">-X {method}</span>{" \\\n"}
                    {"  "}<span className="text-amber-300">"{buildUrl()}"</span>{" \\\n"}
                    {"  "}<span className="text-zinc-400">-H</span>{" "}
                    <span className="text-emerald-300">"X-API-Key: {rawKey.trim() ? (rawKeyVisible ? rawKey.trim() : rawKey.trim().slice(0, 12) + "••••••••") : "YOUR_API_KEY"}"</span>
                    {headers.filter((h) => h.enabled && h.key.trim() && h.key !== "Content-Type").map((h) => (
                      <span key={h.id}>{" \\\n  "}<span className="text-zinc-400">-H</span>{" "}<span className="text-emerald-300">"{h.key}: {h.value}"</span></span>
                    ))}
                    {isMultipart
                      ? <span>{" \\\n  "}<span className="text-zinc-400">-F</span>{" "}<span className="text-purple-300">"file=@/path/to/photo.jpg"</span>{" \\\n  "}<span className="text-zinc-400">-F</span>{" "}<span className="text-purple-300">"title=My Photo"</span></span>
                      : ["POST", "PUT", "PATCH"].includes(method) && body.trim()
                        ? <span>{" \\\n  "}<span className="text-zinc-400">-H</span>{" "}<span className="text-emerald-300">"Content-Type: application/json"</span>{" \\\n  "}<span className="text-zinc-400">-d</span>{" "}<span className="text-purple-300">'{body.replace(/\n/g, " ").replace(/'/g, "\\'")}'</span></span>
                        : null
                    }
                  </pre>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </DeveloperLayout>
  );
};

export default DeveloperPlayground;