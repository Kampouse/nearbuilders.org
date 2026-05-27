import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_layout/builders/")({
  head: () => ({
    meta: [
      { title: "Builders | NEAR Builders" },
      {
        name: "description",
        content: "Discover builders in the NEAR ecosystem. Find collaborators, explore profiles, and connect with the community.",
      },
    ],
  }),
  component: BuildersPage,
});

interface Builder {
  id: string;
  name: string;
  nearAccount: string;
  bio: string;
  skills: string[];
  projectCount: number;
  avatarColor: string;
  location?: string;
}

const DUMMY_BUILDERS: Builder[] = [
  {
    id: "1",
    name: "Elliot B.",
    nearAccount: "efiz.near",
    bio: "Building open infrastructure for the NEAR ecosystem. Fullstack, protocol layer, and tooling.",
    skills: ["React", "TypeScript", "Rust", "Smart Contracts"],
    projectCount: 12,
    avatarColor: "#00C08B",
    location: "Remote",
  },
  {
    id: "2",
    name: "Maria Santos",
    nearAccount: "maria.near",
    bio: "DeFi protocol engineer. Passionate about building financial primitives that are accessible to everyone.",
    skills: ["Rust", "Smart Contracts", "DeFi", "Solidity"],
    projectCount: 8,
    avatarColor: "#00C1DE",
    location: "São Paulo, BR",
  },
  {
    id: "3",
    name: "Jake Lee",
    nearAccount: "jake.near",
    bio: "Frontend developer and UI/UX designer. Making web3 interfaces that don't suck.",
    skills: ["React", "Figma", "CSS", "TypeScript"],
    projectCount: 15,
    avatarColor: "#7c3aed",
    location: "Seoul, KR",
  },
  {
    id: "4",
    name: "Priya Nair",
    nearAccount: "priya.near",
    bio: "Infrastructure and DevOps for decentralized apps. Validator operator and tooling builder.",
    skills: ["DevOps", "Rust", "Node.js", "Kubernetes"],
    projectCount: 6,
    avatarColor: "#f59e0b",
    location: "Bengaluru, IN",
  },
  {
    id: "5",
    name: "Carlos Rivera",
    nearAccount: "carlosrivera.near",
    bio: "Game developer exploring on-chain mechanics and NFT integrations on NEAR.",
    skills: ["Unity", "JavaScript", "NFTs", "Game Design"],
    projectCount: 9,
    avatarColor: "#ef4444",
    location: "Mexico City, MX",
  },
  {
    id: "6",
    name: "Yuki Tanaka",
    nearAccount: "yuki.near",
    bio: "Backend engineer focused on scalability. Building APIs and indexers for the open web.",
    skills: ["Go", "PostgreSQL", "GraphQL", "Indexers"],
    projectCount: 11,
    avatarColor: "#0072CE",
    location: "Tokyo, JP",
  },
  {
    id: "7",
    name: "Amara Osei",
    nearAccount: "amara.near",
    bio: "Community builder and developer advocate. Helping more people build on NEAR.",
    skills: ["Community", "Education", "JavaScript", "Writing"],
    projectCount: 4,
    avatarColor: "#00C08B",
    location: "Accra, GH",
  },
  {
    id: "8",
    name: "Dmitri Volkov",
    nearAccount: "dmitri.near",
    bio: "Protocol researcher and smart contract auditor. Finding bugs before they find you.",
    skills: ["Security", "Rust", "Auditing", "ZK Proofs"],
    projectCount: 7,
    avatarColor: "#6366f1",
    location: "Berlin, DE",
  },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function BuildersPage() {
  const [query, setQuery] = useState("");

  const filtered = DUMMY_BUILDERS.filter((builder) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      builder.name.toLowerCase().includes(q) ||
      builder.nearAccount.toLowerCase().includes(q) ||
      builder.bio.toLowerCase().includes(q) ||
      builder.skills.some((s) => s.toLowerCase().includes(q)) ||
      (builder.location?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tight text-foreground mb-2">Builders</h1>
        <p className="text-muted-foreground text-lg mb-6 max-w-2xl">
          Discover the people building on NEAR. Find collaborators, explore their work, and
          connect with the community.
        </p>

        <div className="relative w-full sm:max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            type="search"
            placeholder="Search by name, skill, or location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 rounded-full bg-secondary border-border focus-visible:ring-brand-green"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-4xl mb-4">🔭</div>
          <p className="text-lg font-semibold text-foreground mb-1">No builders found</p>
          <p className="text-sm text-muted-foreground">
            Try a different search — more builders join every day.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((builder) => (
            <BuilderCard key={builder.id} builder={builder} />
          ))}
        </div>
      )}

      <div className="mt-16 rounded-lg bg-brand-chartreuse p-8">
        <h2 className="text-xl font-black text-black mb-1">Are you building on NEAR?</h2>
        <p className="text-sm text-black/70 mb-4">
          Claim your builder profile by connecting your NEAR wallet and creating an account.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-sm font-bold hover:bg-black/80 transition-colors"
        >
          Connect your wallet
        </Link>
      </div>
    </div>
  );
}

function BuilderCard({ builder }: { builder: Builder }) {
  return (
    <div className="group bg-card border border-border rounded-lg p-6 hover:shadow-lg hover:border-border/80 transition-all duration-200 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div
          className="size-12 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
          style={{ backgroundColor: builder.avatarColor }}
        >
          {getInitials(builder.name)}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-foreground leading-tight truncate">{builder.name}</div>
          <div className="text-xs font-mono text-brand-cyan mt-0.5 truncate">
            {builder.nearAccount}
          </div>
          {builder.location && (
            <div className="text-xs text-muted-foreground mt-0.5">{builder.location}</div>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
        {builder.bio}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {builder.skills.map((skill) => (
          <Badge key={skill} variant="secondary" className="text-xs px-2 py-0.5 rounded-full font-medium">
            {skill}
          </Badge>
        ))}
      </div>

      <div className="pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{builder.projectCount}</span>{" "}
          {builder.projectCount === 1 ? "project" : "projects"}
        </span>
        <Link
          to="/projects"
          className="text-xs font-semibold text-brand-cyan hover:underline transition-colors"
        >
          View projects →
        </Link>
      </div>
    </div>
  );
}
