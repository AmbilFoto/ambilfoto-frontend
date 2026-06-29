import { useEffect, useState } from "react";

const LANGUAGES = ["cURL", "JavaScript", "TypeScript", "PHP", "Go", "Rust", "Java", "Python"] as const;
type Language = typeof LANGUAGES[number];
type Endpoint = "analyze" | "upload" | "match" | "usage";

const CODE_EXAMPLES: Record<Endpoint, Record<Language, string>> = {
  analyze: {
    cURL: `curl -X POST https://api.ambilfoto.id/api/v1/photo/analyze \\
  -H "X-Api-Key: af_prod_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"image": "data:image/jpeg;base64,/9j/4AAQ..."}'`,
    JavaScript: `const response = await fetch(
  "https://api.ambilfoto.id/api/v1/photo/analyze",
  {
    method: "POST",
    headers: {
      "X-Api-Key": "af_prod_xxx",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: "data:image/jpeg;base64,/9j/4AAQ...",
    }),
  }
);
const data = await response.json();
console.log(data.embedding);`,
    TypeScript: `interface AnalyzeResponse {
  success: boolean;
  face_detected: boolean;
  confidence: number;
  embedding_size: number;
  embedding: number[];
}

const analyzePhoto = async (
  imageBase64: string
): Promise<AnalyzeResponse> => {
  const response = await fetch(
    "https://api.ambilfoto.id/api/v1/photo/analyze",
    {
      method: "POST",
      headers: {
        "X-Api-Key": "af_prod_xxx",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageBase64 }),
    }
  );
  return response.json();
};`,
    PHP: `<?php
$client = new \\GuzzleHttp\\Client();
$response = $client->post(
  "https://api.ambilfoto.id/api/v1/photo/analyze",
  [
    "headers" => [
      "X-Api-Key"    => "af_prod_xxx",
      "Content-Type" => "application/json",
    ],
    "json" => [
      "image" => "data:image/jpeg;base64,/9j/4AAQ...",
    ],
  ]
);
$data = json_decode($response->getBody(), true);
print_r($data["embedding"]);`,
    Go: `package main

import (
  "bytes"
  "encoding/json"
  "net/http"
)

func analyzePhoto(imageBase64 string) (map[string]any, error) {
  body, _ := json.Marshal(map[string]string{
    "image": imageBase64,
  })
  req, _ := http.NewRequest(
    "POST",
    "https://api.ambilfoto.id/api/v1/photo/analyze",
    bytes.NewBuffer(body),
  )
  req.Header.Set("X-Api-Key", "af_prod_xxx")
  req.Header.Set("Content-Type", "application/json")

  client := &http.Client{}
  resp, err := client.Do(req)
  if err != nil {
    return nil, err
  }
  defer resp.Body.Close()

  var result map[string]any
  json.NewDecoder(resp.Body).Decode(&result)
  return result, nil
}`,
    Rust: `use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct AnalyzeRequest { image: String }

#[derive(Deserialize, Debug)]
struct AnalyzeResponse {
  success: bool,
  face_detected: bool,
  confidence: f64,
  embedding: Vec<f64>,
}

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
  let client = Client::new();
  let resp: AnalyzeResponse = client
    .post("https://api.ambilfoto.id/api/v1/photo/analyze")
    .header("X-Api-Key", "af_prod_xxx")
    .json(&AnalyzeRequest {
      image: "data:image/jpeg;base64,...".into(),
    })
    .send().await?.json().await?;
  println!("{:?}", resp.embedding);
  Ok(())
}`,
    Java: `import java.net.http.*;
import java.net.URI;

public class AmbilFotoClient {
  private static final String BASE =
    "https://api.ambilfoto.id/api/v1";
  private final HttpClient http = HttpClient.newHttpClient();

  public String analyzePhoto(String imageBase64)
      throws Exception {
    var body = """
      {"image": "%s"}
      """.formatted(imageBase64);
    var req = HttpRequest.newBuilder()
      .uri(URI.create(BASE + "/photo/analyze"))
      .header("X-Api-Key", "af_prod_xxx")
      .header("Content-Type", "application/json")
      .POST(HttpRequest.BodyPublishers.ofString(body))
      .build();
    return http.send(req,
      HttpResponse.BodyHandlers.ofString()).body();
  }
}`,
    Python: `import httpx

def analyze_photo(image_base64: str) -> dict:
    response = httpx.post(
        "https://api.ambilfoto.id/api/v1/photo/analyze",
        headers={"X-Api-Key": "af_prod_xxx"},
        json={"image": image_base64},
    )
    response.raise_for_status()
    return response.json()

data = analyze_photo("data:image/jpeg;base64,...")
print(data["embedding"])`,
  },
  upload: {
    cURL: `curl -X POST https://api.ambilfoto.id/api/v1/photo/upload \\
  -H "X-Api-Key: af_prod_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQ...",
    "filename": "graduation-2025.jpg",
    "metadata": {
      "event_name": "Wisuda 2025",
      "taken_at": "2025-01-18T10:00:00Z"
    }
  }'`,
    JavaScript: `const response = await fetch(
  "https://api.ambilfoto.id/api/v1/photo/upload",
  {
    method: "POST",
    headers: {
      "X-Api-Key": "af_prod_xxx",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: "data:image/jpeg;base64,/9j/4AAQ...",
      filename: "graduation-2025.jpg",
      metadata: {
        event_name: "Wisuda 2025",
        taken_at: "2025-01-18T10:00:00Z",
      },
    }),
  }
);
const data = await response.json();
console.log(\`Photo ID: \${data.photo_id}\`);`,
    TypeScript: `interface UploadRequest {
  image: string;
  filename: string;
  metadata?: {
    event_name?: string;
    taken_at?: string;
    [key: string]: unknown;
  };
}

interface UploadResponse {
  success: boolean;
  photo_id: string;
  faces_detected: number;
  quota: { used: number; limit: number; remaining: number };
}

const uploadPhoto = async (
  payload: UploadRequest
): Promise<UploadResponse> => {
  const response = await fetch(
    "https://api.ambilfoto.id/api/v1/photo/upload",
    {
      method: "POST",
      headers: {
        "X-Api-Key": "af_prod_xxx",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  return response.json();
};`,
    PHP: `<?php
$client = new \\GuzzleHttp\\Client();
$response = $client->post(
  "https://api.ambilfoto.id/api/v1/photo/upload",
  [
    "headers" => [
      "X-Api-Key"    => "af_prod_xxx",
      "Content-Type" => "application/json",
    ],
    "json" => [
      "image"    => "data:image/jpeg;base64,/9j/4AAQ...",
      "filename" => "graduation-2025.jpg",
      "metadata" => [
        "event_name" => "Wisuda 2025",
        "taken_at"   => "2025-01-18T10:00:00Z",
      ],
    ],
  ]
);
$data = json_decode($response->getBody(), true);
echo "Photo ID: " . $data["photo_id"];`,
    Go: `body, _ := json.Marshal(map[string]any{
  "image":    imageBase64,
  "filename": "graduation-2025.jpg",
  "metadata": map[string]string{
    "event_name": "Wisuda 2025",
    "taken_at":   "2025-01-18T10:00:00Z",
  },
})
req, _ := http.NewRequest("POST",
  "https://api.ambilfoto.id/api/v1/photo/upload",
  bytes.NewBuffer(body),
)
req.Header.Set("X-Api-Key", "af_prod_xxx")
req.Header.Set("Content-Type", "application/json")`,
    Rust: `#[derive(Serialize)]
struct UploadRequest {
  image: String,
  filename: String,
  metadata: HashMap<String, String>,
}

let mut meta = HashMap::new();
meta.insert("event_name".into(), "Wisuda 2025".into());
meta.insert("taken_at".into(), "2025-01-18T10:00:00Z".into());

let resp = client
  .post("https://api.ambilfoto.id/api/v1/photo/upload")
  .header("X-Api-Key", "af_prod_xxx")
  .json(&UploadRequest {
    image: image_base64,
    filename: "graduation-2025.jpg".into(),
    metadata: meta,
  })
  .send().await?;`,
    Java: `String body = """
  {
    "image": "%s",
    "filename": "graduation-2025.jpg",
    "metadata": {
      "event_name": "Wisuda 2025",
      "taken_at": "2025-01-18T10:00:00Z"
    }
  }""".formatted(imageBase64);

var req = HttpRequest.newBuilder()
  .uri(URI.create(BASE + "/photo/upload"))
  .header("X-Api-Key", "af_prod_xxx")
  .header("Content-Type", "application/json")
  .POST(HttpRequest.BodyPublishers.ofString(body))
  .build();`,
    Python: `response = httpx.post(
    "https://api.ambilfoto.id/api/v1/photo/upload",
    headers={"X-Api-Key": "af_prod_xxx"},
    json={
        "image": image_base64,
        "filename": "graduation-2025.jpg",
        "metadata": {
            "event_name": "Wisuda 2025",
            "taken_at": "2025-01-18T10:00:00Z",
        },
    },
)
data = response.json()
print(f"Photo ID: {data['photo_id']}")`,
  },
  match: {
    cURL: `curl -X POST https://api.ambilfoto.id/api/v1/photo/match \\
  -H "X-Api-Key: af_prod_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"embedding": [0.123, -0.456, 0.789, ...]}'`,
    JavaScript: `const response = await fetch(
  "https://api.ambilfoto.id/api/v1/photo/match",
  {
    method: "POST",
    headers: {
      "X-Api-Key": "af_prod_xxx",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ embedding }),
  }
);
const { photos } = await response.json();
photos.forEach((p) =>
  console.log(p.filename, p.similarity)
);`,
    TypeScript: `interface MatchResult {
  photo_id: string;
  filename: string;
  similarity: number;
  url: string;
  metadata: Record<string, unknown>;
}

const matchFace = async (
  embedding: number[]
): Promise<MatchResult[]> => {
  const res = await fetch(
    "https://api.ambilfoto.id/api/v1/photo/match",
    {
      method: "POST",
      headers: {
        "X-Api-Key": "af_prod_xxx",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embedding }),
    }
  );
  const data = await res.json();
  return data.photos;
};`,
    PHP: `$response = $client->post(
  "https://api.ambilfoto.id/api/v1/photo/match",
  [
    "headers" => [
      "X-Api-Key"    => "af_prod_xxx",
      "Content-Type" => "application/json",
    ],
    "json" => ["embedding" => $embedding],
  ]
);
$photos = json_decode(
  $response->getBody(), true
)["photos"];`,
    Go: `body, _ := json.Marshal(
  map[string]any{"embedding": embedding},
)
req, _ := http.NewRequest("POST",
  "https://api.ambilfoto.id/api/v1/photo/match",
  bytes.NewBuffer(body),
)
req.Header.Set("X-Api-Key", "af_prod_xxx")
req.Header.Set("Content-Type", "application/json")`,
    Rust: `let resp = client
  .post("https://api.ambilfoto.id/api/v1/photo/match")
  .header("X-Api-Key", "af_prod_xxx")
  .json(&json!({ "embedding": embedding }))
  .send().await?
  .json::<serde_json::Value>().await?;`,
    Java: `String body = objectMapper.writeValueAsString(
  Map.of("embedding", embedding));

var req = HttpRequest.newBuilder()
  .uri(URI.create(BASE + "/photo/match"))
  .header("X-Api-Key", "af_prod_xxx")
  .header("Content-Type", "application/json")
  .POST(HttpRequest.BodyPublishers.ofString(body))
  .build();`,
    Python: `response = httpx.post(
    "https://api.ambilfoto.id/api/v1/photo/match",
    headers={"X-Api-Key": "af_prod_xxx"},
    json={"embedding": embedding},
)
photos = response.json()["photos"]
for p in photos:
    print(p["filename"], p["similarity"])`,
  },
  usage: {
    cURL: `curl https://api.ambilfoto.id/api/v1/usage \\
  -H "X-Api-Key: af_prod_xxx"`,
    JavaScript: `const response = await fetch(
  "https://api.ambilfoto.id/api/v1/usage",
  { headers: { "X-Api-Key": "af_prod_xxx" } }
);
const { data } = await response.json();
console.log(\`\${data.api_hits.remaining} hits remaining\`);`,
    TypeScript: `interface UsageData {
  plan: { name: string; rate_limit_rpm: number };
  days_remaining: number;
  api_hits: {
    used: number;
    limit: number;
    remaining: number;
    pct: number;
  };
}

const res = await fetch(
  "https://api.ambilfoto.id/api/v1/usage",
  { headers: { "X-Api-Key": "af_prod_xxx" } }
);
const { data }: { data: UsageData } = await res.json();`,
    PHP: `$response = $client->get(
  "https://api.ambilfoto.id/api/v1/usage",
  ["headers" => ["X-Api-Key" => "af_prod_xxx"]]
);
$data = json_decode(
  $response->getBody(), true
)["data"];`,
    Go: `req, _ := http.NewRequest("GET",
  "https://api.ambilfoto.id/api/v1/usage", nil)
req.Header.Set("X-Api-Key", "af_prod_xxx")
resp, _ := client.Do(req)`,
    Rust: `let resp = client
  .get("https://api.ambilfoto.id/api/v1/usage")
  .header("X-Api-Key", "af_prod_xxx")
  .send().await?
  .json::<serde_json::Value>().await?;`,
    Java: `var req = HttpRequest.newBuilder()
  .uri(URI.create(BASE + "/usage"))
  .header("X-Api-Key", "af_prod_xxx")
  .GET().build();
var resp = http.send(req,
  HttpResponse.BodyHandlers.ofString());`,
    Python: `response = httpx.get(
    "https://api.ambilfoto.id/api/v1/usage",
    headers={"X-Api-Key": "af_prod_xxx"},
)
data = response.json()["data"]`,
  },
};

const RESPONSES: Record<Endpoint, string> = {
  analyze: `{
  "success": true,
  "face_detected": true,
  "confidence": 0.98,
  "embedding_size": 512,
  "embedding": [0.123, -0.456, 0.789, "..."]
}`,
  upload: `{
  "success": true,
  "photo_id": "e3f2a1b4-...",
  "faces_detected": 3,
  "quota": {
    "used": 251,
    "limit": 1000,
    "remaining": 749
  }
}`,
  match: `{
  "success": true,
  "matched": 5,
  "photos": [{
    "photo_id": "uuid",
    "filename": "graduation.jpg",
    "similarity": 0.97,
    "url": "https://storage.ambilfoto.id/...",
    "metadata": { "event_name": "Wisuda 2025" }
  }]
}`,
  usage: `{
  "success": true,
  "data": {
    "plan": { "name": "Super 1", "rate_limit_rpm": 60 },
    "billing": { "cycle": "monthly", "price_month": 99000 },
    "days_remaining": 12,
    "api_hits": {
      "used": 250,
      "limit": 1000,
      "remaining": 750,
      "pct": 25
    }
  }
}`,
};

const LANG_STYLE: Record<Language, { pill: string; active: string; dot: string }> = {
  cURL:       { pill: "border-orange-200 text-orange-600 bg-orange-50",       active: "border-orange-400 bg-orange-100 text-orange-700 font-semibold",  dot: "bg-orange-400" },
  JavaScript: { pill: "border-yellow-200 text-yellow-600 bg-yellow-50",       active: "border-yellow-400 bg-yellow-100 text-yellow-700 font-semibold",  dot: "bg-yellow-400" },
  TypeScript: { pill: "border-blue-200 text-blue-600 bg-blue-50",             active: "border-blue-500 bg-blue-100 text-blue-700 font-semibold",        dot: "bg-blue-500"   },
  PHP:        { pill: "border-indigo-200 text-indigo-600 bg-indigo-50",       active: "border-indigo-400 bg-indigo-100 text-indigo-700 font-semibold",  dot: "bg-indigo-400" },
  Go:         { pill: "border-cyan-200 text-cyan-600 bg-cyan-50",             active: "border-cyan-500 bg-cyan-100 text-cyan-700 font-semibold",        dot: "bg-cyan-500"   },
  Rust:       { pill: "border-red-200 text-red-600 bg-red-50",                active: "border-red-400 bg-red-100 text-red-700 font-semibold",           dot: "bg-red-500"    },
  Java:       { pill: "border-amber-200 text-amber-600 bg-amber-50",          active: "border-amber-400 bg-amber-100 text-amber-700 font-semibold",     dot: "bg-amber-500"  },
  Python:     { pill: "border-sky-200 text-sky-600 bg-sky-50",                active: "border-sky-500 bg-sky-100 text-sky-700 font-semibold",           dot: "bg-sky-500"    },
};

const SECTIONS = [
  { id: "quickstart",     label: "Quick Start"         },
  { id: "authentication", label: "Authentication"      },
  { id: "analyze",        label: "POST /photo/analyze" },
  { id: "upload",         label: "POST /photo/upload"  },
  { id: "match",          label: "POST /photo/match"   },
  { id: "usage",          label: "GET /usage"          },
  { id: "errors",         label: "Error Reference"     },
];

/* ─── CodeBlock ─────────────────────────────────────────────────── */
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dotClass = LANG_STYLE[lang as Language]?.dot ?? "bg-slate-400";

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
          <span className="text-xs font-mono font-semibold text-slate-300 truncate">{lang}</span>
        </div>
        <button
          onClick={copy}
          className={`text-xs px-2.5 py-1 rounded-md border transition-all duration-200 cursor-pointer flex-shrink-0 ml-2
            ${copied
              ? "border-emerald-400 text-emerald-400 bg-emerald-400/10"
              : "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200"
            }`}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      {/* KEY FIX: max-w-full + overflow-x-auto prevents horizontal bleed on mobile */}
      <pre className="bg-slate-900 m-0 px-4 py-4 overflow-x-auto text-xs sm:text-sm leading-relaxed text-slate-100 font-mono max-w-full">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ─── LangTabs ──────────────────────────────────────────────────── */
function LangTabs({
  endpoint,
  activeLang,
  setActiveLang,
}: {
  endpoint: Endpoint;
  activeLang: Language;
  setActiveLang: (l: Language) => void;
}) {
  return (
    <div>
      {/* Scrollable row on mobile so pills don't wrap excessively */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {LANGUAGES.map((lang) => {
          const s = LANG_STYLE[lang];
          const isActive = activeLang === lang;
          return (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={`text-xs px-3 py-1 rounded-full border transition-all duration-150 cursor-pointer whitespace-nowrap flex-shrink-0
                ${isActive ? s.active : `${s.pill} hover:opacity-80`}`}
            >
              {lang}
            </button>
          );
        })}
      </div>
      <CodeBlock code={CODE_EXAMPLES[endpoint][activeLang]} lang={activeLang} />
    </div>
  );
}

/* ─── EndpointSection ───────────────────────────────────────────── */
interface EndpointProps {
  method: "POST" | "GET";
  path: string;
  description: string;
  endpoint: Endpoint;
}

function EndpointSection({ method, path, description, endpoint }: EndpointProps) {
  const [activeLang, setActiveLang] = useState<Language>("cURL");

  const methodCls =
    method === "POST"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : "text-blue-700 bg-blue-50 border-blue-200";

  return (
    <div>
      <div className="mb-5">
        {/* Stack on mobile, inline on sm+ */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-md border flex-shrink-0 ${methodCls}`}>
            {method}
          </span>
          {/* Path truncates and scrolls on tiny screens */}
          <code className="text-xs sm:text-sm font-mono text-slate-700 bg-slate-100 border border-slate-200 px-2 sm:px-3 py-0.5 rounded-md overflow-x-auto max-w-full">
            {path}
          </code>
          <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex-shrink-0">
            X-Api-Key
          </span>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>

      <div className="grid gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Request</p>
          <LangTabs endpoint={endpoint} activeLang={activeLang} setActiveLang={setActiveLang} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
            Response <span className="text-emerald-600 normal-case tracking-normal font-mono">200 OK</span>
          </p>
          <CodeBlock code={RESPONSES[endpoint]} lang="JSON" />
        </div>
      </div>
    </div>
  );
}

/* ─── MobileNav ─────────────────────────────────────────────────── */
function MobileNav({ activeSection, onSelect }: { activeSection: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="lg:hidden border-b border-slate-200 bg-white sticky top-14 z-40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-700 font-medium"
      >
        <span className="truncate">{current?.label ?? "Menu"}</span>
        <span className="ml-2 text-slate-400 flex-shrink-0">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 bg-white shadow-lg">
          {SECTIONS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => { setOpen(false); onSelect(id); }}
              className={`block px-5 py-2.5 text-sm transition-colors
                ${activeSection === id
                  ? "text-blue-600 font-semibold bg-blue-50"
                  : "text-slate-600 hover:bg-slate-50"
                }`}
              style={{ textDecoration: "none" }}
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── DeveloperDocs ─────────────────────────────────────────────── */
export default function DeveloperDocs() {
  const [activeSection, setActiveSection] = useState("quickstart");

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
    script.onload = () => {
      const gsap = (window as any).gsap;
      gsap.fromTo(".docs-header",  { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
      gsap.fromTo(".docs-sidebar", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, delay: 0.15, ease: "power2.out" });
      gsap.fromTo(".content-block",{ opacity: 0, y: 24 },  { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, delay: 0.25, ease: "power2.out" });
    };
    document.head.appendChild(script);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id); });
      },
      { rootMargin: "-25% 0px -65% 0px" }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="docs-header sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200 h-14 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img
            src="https://res.cloudinary.com/dwyi4d3rq/image/upload/v1765171746/ambilfoto-logo_hvn8s2.png"
            alt="AmbilFoto.id"
            className="h-7 sm:h-8 w-auto flex-shrink-0"
          />
          <span className="text-slate-300 select-none hidden sm:inline">/</span>
          <span className="text-xs sm:text-sm text-slate-500 font-medium hidden sm:inline truncate">API Reference</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 hidden sm:inline">
            v1
          </span>
          <a href="/developer/pricing">
            <button className="text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer whitespace-nowrap">
              Get API Key →
            </button>
          </a>
        </div>
      </header>

      {/* ── MOBILE NAV DROPDOWN ─────────────────────────────────── */}
      <MobileNav activeSection={activeSection} onSelect={setActiveSection} />

      <div className="flex max-w-screen-xl mx-auto">

        {/* ── SIDEBAR (desktop only) ──────────────────────────── */}
        <aside className="docs-sidebar hidden lg:block w-56 shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto border-r border-slate-200 py-6">
          <p className="px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            API Reference
          </p>

          {SECTIONS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`flex items-center gap-2.5 px-5 py-2 text-sm transition-all duration-150
                ${activeSection === id
                  ? "text-blue-600 font-semibold bg-blue-50 border-l-2 border-blue-500"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-l-2 border-transparent"
                }`}
              style={{ textDecoration: "none" }}
            >
              {label}
            </a>
          ))}

          <div className="px-5 pt-5 mt-5 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Support</p>
            <a href="mailto:support@ambilfoto.id" className="text-xs text-slate-500 hover:text-blue-600 transition-colors" style={{ textDecoration: "none" }}>
              📧 support@ambilfoto.id
            </a>
          </div>
        </aside>

        {/* ── MAIN ───────────────────────────────────────────────── */}
        {/* px responsive: tight on mobile, generous on desktop */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-12 py-8 sm:py-10 w-full">

          {/* Quick Start */}
          <div id="quickstart" className="content-block mb-10 sm:mb-12 pb-10 sm:pb-12 border-b border-slate-100">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4">
              ⚡ Quick Start
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
              AmbilFoto API<br />
              <span className="text-blue-600">Reference</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-xl mb-6 sm:mb-8">
              Integrate AI-powered face recognition into your app. Detect, index, and match faces across thousands of event photos in milliseconds.
            </p>

            <div className="grid gap-2.5">
              {[
                { n: "01", title: "Create an account",   desc: "Register at ambilfoto.id and verify your email" },
                { n: "02", title: "Choose a plan",        desc: "Select a subscription that fits your usage" },
                { n: "03", title: "Complete payment",     desc: "Secure checkout via Midtrans payment gateway" },
                { n: "04", title: "Get your API keys",    desc: "Keys sent via email and available in dashboard" },
                { n: "05", title: "Start integrating",    desc: "Use the examples below to make your first request" },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3 px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                  <span className="text-[11px] font-bold font-mono text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md shrink-0 mt-0.5">
                    {s.n}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 mb-0.5">{s.title}</p>
                    <p className="text-xs text-slate-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Authentication */}
          <section id="authentication" className="content-block mb-10 sm:mb-12 pb-10 sm:pb-12 border-b border-slate-100">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-xl">🔑</span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Authentication</h2>
            </div>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              AmbilFoto menggunakan <strong>dua jenis autentikasi</strong> yang berbeda tergantung endpoint yang diakses.
            </p>

            {/* Stack on mobile, 2-col on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="border border-violet-200 rounded-xl p-4 bg-violet-50/40">
                <p className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-2">
                  🔐 JWT Bearer Token
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  Untuk <code className="font-mono bg-white border border-slate-200 px-1 rounded">/api/auth/*</code> dan <code className="font-mono bg-white border border-slate-200 px-1 rounded">/api/developer/*</code>
                </p>
                <CodeBlock code="Authorization: Bearer eyJhbGci..." lang="HTTP" />
                <p className="text-xs text-slate-400 mt-2">Dapatkan dari <code className="font-mono">POST /api/auth/login</code></p>
              </div>

              <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/40">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">
                  🗝️ X-Api-Key Header
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  Khusus untuk <code className="font-mono bg-white border border-slate-200 px-1 rounded">/api/v1/*</code> saja
                </p>
                <CodeBlock code="X-Api-Key: af_prod_xxx" lang="HTTP" />
                <p className="text-xs text-slate-400 mt-2">Dapatkan dari Developer Dashboard setelah subscribe</p>
              </div>
            </div>

            <div className="grid gap-2 mb-4">
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-1.5">
                  Development (sandbox)
                </p>
                <CodeBlock code="X-Api-Key: af_dev_xxxxxxxxxxxxxxxxxxxxxxxx" lang="HTTP" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1.5">
                  Production (live)
                </p>
                <CodeBlock code="X-Api-Key: af_prod_xxxxxxxxxxxxxxxxxxxxxxxx" lang="HTTP" />
              </div>
            </div>

            <div className="flex gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              <span className="shrink-0">🚫</span>
              <p className="text-xs sm:text-sm leading-relaxed">
                <strong>Jangan</strong> gunakan{" "}
                <code className="text-xs bg-white border border-red-200 px-1.5 rounded font-mono">Authorization: Bearer</code>{" "}
                untuk endpoint <code className="text-xs bg-white border border-red-200 px-1.5 rounded font-mono">/api/v1/*</code>.
                {" "}Akan ditolak dengan error 401 dan pesan yang mengarahkan ke <code className="text-xs bg-white border border-red-200 px-1.5 rounded font-mono">X-Api-Key</code>.
              </p>
            </div>

            <div className="flex gap-3 p-3.5 mt-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <span className="shrink-0">💡</span>
              <p className="text-xs sm:text-sm leading-relaxed">
                Gunakan <code className="text-xs bg-white border border-amber-200 px-1.5 rounded font-mono">af_dev_xxx</code> untuk testing — fitur sama, tidak berdampak ke produksi.
                Switch ke <code className="text-xs bg-white border border-amber-200 px-1.5 rounded font-mono">af_prod_xxx</code> untuk live traffic.
              </p>
            </div>
          </section>

          {/* Endpoint sections */}
          {(
            [
              {
                id: "analyze",
                method: "POST",
                path: "/api/v1/photo/analyze",
                description: "Detect faces in an image and extract a 512-dimension face embedding vector for later matching.",
              },
              {
                id: "upload",
                method: "POST",
                path: "/api/v1/photo/upload",
                description: "Upload a photo to the index. Faces are automatically detected, embedded, and indexed for similarity search.",
              },
              {
                id: "match",
                method: "POST",
                path: "/api/v1/photo/match",
                description: "Search all indexed photos for a given face embedding. Use the embedding returned from /analyze.",
              },
              {
                id: "usage",
                method: "GET",
                path: "/api/v1/usage",
                description: "Check your current API hit quota, subscription status, billing cycle, and rate limits.",
              },
            ] as { id: Endpoint; method: "POST" | "GET"; path: string; description: string }[]
          ).map(({ id, method, path, description }) => (
            <section key={id} id={id} className="content-block mb-10 sm:mb-12 pb-10 sm:pb-12 border-b border-slate-100">
              <div className="border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
                <EndpointSection method={method} path={path} description={description} endpoint={id} />
              </div>
            </section>
          ))}

          {/* Error Reference */}
          <section id="errors" className="content-block mb-10 sm:mb-12">
            <div className="border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-xl">📖</span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Error Reference</h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">All errors return a consistent JSON envelope:</p>

              <CodeBlock lang="JSON" code={`{
  "success": false,
  "code": 429,
  "error": "Rate limit exceeded. Slow down and retry.",
  "retry_after": "60 seconds",
  "limit_rpm": 60
}`} />

              {/* Table: scrollable on mobile */}
              <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 -mx-0">
                <table className="w-full text-sm border-collapse min-w-[480px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {["HTTP", "Penyebab", "Solusi"].map((h) => (
                        <th key={h} className="text-left px-3 sm:px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["401", "API Key tidak ada atau format salah (bukan af_prod_/af_dev_)",     "Gunakan header X-Api-Key dengan format yang benar",                     "amber"],
                      ["401", "Menggunakan Authorization: Bearer di /api/v1/*",                  "Ganti ke X-Api-Key header — Bearer hanya untuk /api/auth/* dan /api/developer/*", "amber"],
                      ["401", "JWT token expired atau tidak valid",                              "Login ulang untuk mendapat token baru",                                "amber"],
                      ["402", "Subscription tidak aktif atau expired",                          "Renew subscription di Developer Dashboard",                             "red"],
                      ["429", "Rate limit exceeded (per menit per API key)",                    "Tunggu 60 detik, cek field retry_after di response",                    "violet"],
                      ["507", "API hit limit bulan ini habis",                                  "Upgrade plan atau tunggu billing period berikutnya",                    "rose"],
                    ].map(([code, desc, fix, color]) => {
                      const codeCls: Record<string, string> = {
                        amber:  "text-amber-700 bg-amber-50 border-amber-200",
                        red:    "text-red-700 bg-red-50 border-red-200",
                        violet: "text-violet-700 bg-violet-50 border-violet-200",
                        rose:   "text-rose-700 bg-rose-50 border-rose-200",
                      };
                      return (
                        <tr key={desc} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-3 sm:px-4 py-3">
                            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${codeCls[color]}`}>
                              {code}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-slate-600 text-xs sm:text-sm">{desc}</td>
                          <td className="px-3 sm:px-4 py-3 text-slate-400 text-xs">{fix}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className="content-block text-center px-4 sm:px-8 py-10 sm:py-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">Ready to integrate?</p>
            <p className="text-sm text-slate-500 mb-6 sm:mb-7">
              Choose a plan and get your API keys in minutes. Start with the development sandbox key.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <a href="/developer/pricing">
                <button className="px-5 sm:px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer shadow-sm">
                  View Pricing Plans →
                </button>
              </a>
              <a href="/developer/dashboard">
                <button className="px-5 sm:px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl border border-slate-200 transition-colors cursor-pointer">
                  Go to Dashboard
                </button>
              </a>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}