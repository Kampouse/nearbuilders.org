import { createFileRoute, Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpen, Code2, ExternalLink, FileText, Globe, LayoutGrid, Shield, Sparkles, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_layout/")({
  head: () => ({
    meta: [
      { title: "NEAR Builders — The builder's fastest path to market" },
      {
        name: "description",
        content:
          "An open platform for builders on NEAR. Find collaborators, share projects, and build the open web together.",
      },
    ],
  }),
  component: HomePage,
});

const features = [
  {
    icon: Users,
    title: "Build Community-Owned Apps",
    description:
      "Make sustainable apps that are 100% owned and operated by users. No gatekeepers, no lock-in.",
  },
  {
    icon: Zap,
    title: "Move at Builder Speed",
    description:
      "Common-sense tooling, fast iteration, and a community of builders ready to collaborate.",
  },
  {
    icon: Code2,
    title: "Open Source Everything",
    description:
      "Every project on this platform is built in the open. Fork, contribute, and build on what others have started.",
  },
  {
    icon: Globe,
    title: "The Open Web",
    description:
      "NEAR makes it possible for apps to be truly interoperable. Everything here is designed to work together.",
  },
] as const;

const stats = [
  { value: "100+", label: "Builders" },
  { value: "200+", label: "Projects" },
  { value: "50+", label: "Open Apps" },
] as const;

function HomePage() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <HighlightSection />
      <CtaSection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.07] dark:opacity-[0.12]"
          style={{
            background:
              "radial-gradient(circle, var(--brand-cyan) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-[0.05] dark:opacity-[0.08]"
          style={{
            background:
              "radial-gradient(circle, var(--brand-green) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="max-w-4xl">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-none tracking-tight text-foreground mb-6">
            The builder's
            <br />
            <span className="text-brand-green">fastest path</span>
            <br />
            to market.
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed font-medium">
            An open-source platform for builders on NEAR. Find collaborators, discover projects,
            and ship community-owned apps — without asking anyone's permission.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              size="lg"
              className="rounded-full text-base font-bold px-8 h-14 bg-brand-green hover:bg-brand-green/90 text-black shadow-lg shadow-brand-green/20 transition-all hover:scale-105 hover:shadow-xl hover:shadow-brand-green/30"
            >
              <Link to="/builders">
                Find Builders
                <ArrowRight size={18} />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full text-base font-bold px-8 h-14 border-border hover:border-foreground transition-all"
            >
              <Link to="/projects">Browse Projects</Link>
            </Button>
          </div>

          <EcosystemStrip />
        </div>
      </div>
    </section>
  );
}

interface EcosystemLink {
  href: string;
  label: string;
  tagline: string;
  domain: string;
  mascot?: true;
  legion?: true;
  icon?: LucideIcon;
}

const ecosystemLinks: EcosystemLink[] = [
  {
    href: "https://ironclaw.com",
    label: "IronClaw",
    tagline: "Secure AI agent OS",
    domain: "ironclaw.com",
    mascot: true,
  },
  {
    href: "https://near.ai",
    label: "NEAR AI",
    tagline: "AI platform & inference",
    domain: "near.ai",
    icon: Sparkles,
  },
  {
    href: "https://docs.near.ai",
    label: "NEAR AI Docs",
    tagline: "Build with NEAR AI",
    domain: "docs.near.ai",
    icon: BookOpen,
  },
  {
    href: "https://near.org",
    label: "NEAR Protocol",
    tagline: "The blockchain",
    domain: "near.org",
    icon: Globe,
  },
  {
    href: "https://docs.near.org",
    label: "NEAR Docs",
    tagline: "Protocol documentation",
    domain: "docs.near.org",
    icon: FileText,
  },
  {
    href: "https://near.dev",
    label: "NEAR Dev",
    tagline: "DevRel & support",
    domain: "near.dev",
    icon: Code2,
  },
  {
    href: "https://nearcatalog.xyz",
    label: "NEAR Catalog",
    tagline: "Discover NEAR apps",
    domain: "nearcatalog.xyz",
    icon: LayoutGrid,
  },
  {
    href: "https://nearlegion.com",
    label: "Join the Legion",
    tagline: "Prepare for NEARvana",
    domain: "nearlegion.com",
    icon: Shield,
    legion: true,
  },
];



function EcosystemStrip() {
  return (
    <div className="mt-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Explore the ecosystem
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ecosystemLinks.map((item) => {
          if (item.mascot) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex-none w-[152px] snap-start rounded-lg border border-slate-700 bg-slate-900 p-4 pt-3 flex flex-col items-center text-center hover:border-slate-500 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                <ExternalLink
                  size={10}
                  className="absolute top-2.5 right-2.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <img
                  src="https://ironclaw.com/images/iron_claw_guy1.png"
                  alt="IronClaw mascot"
                  className="w-16 h-16 object-contain mb-2 group-hover:-translate-y-1 transition-transform duration-200"
                />
                <span className="text-sm font-bold text-white leading-tight">{item.label}</span>
                <span className="text-[11px] text-slate-400 mt-0.5 leading-tight">{item.tagline}</span>
                <span className="text-[10px] text-slate-600 mt-1.5">{item.domain}</span>
              </a>
            );
          }

          if (item.legion) {
            const Icon = item.icon!;
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex-none w-[152px] snap-start rounded-lg border border-brand-green/40 bg-brand-green/5 p-4 flex flex-col hover:border-brand-green hover:bg-brand-green/10 hover:shadow-lg hover:shadow-brand-green/10 transition-all duration-200"
              >
                <ExternalLink
                  size={10}
                  className="absolute top-2.5 right-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <div className="size-8 rounded-md bg-brand-green/15 flex items-center justify-center mb-3">
                  <Icon size={16} className="text-brand-green" />
                </div>
                <span className="text-sm font-bold text-foreground leading-tight">{item.label}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{item.tagline}</span>
                <span className="text-[10px] text-brand-green/60 mt-1.5">{item.domain}</span>
              </a>
            );
          }

          const Icon = item.icon!;
          return (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex-none w-[152px] snap-start rounded-lg border border-border bg-card p-4 flex flex-col hover:border-brand-cyan/40 hover:shadow-md transition-all duration-200"
            >
              <ExternalLink
                size={10}
                className="absolute top-2.5 right-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <div className="size-8 rounded-md bg-secondary flex items-center justify-center mb-3">
                <Icon size={16} className="text-muted-foreground group-hover:text-brand-cyan transition-colors" />
              </div>
              <span className="text-sm font-bold text-foreground leading-tight">{item.label}</span>
              <span className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{item.tagline}</span>
              <span className="text-[10px] text-muted-foreground/50 mt-1.5">{item.domain}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className="bg-secondary/50 border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-4">
            Build on blockchain like never before
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            NEAR gives builders the tools to create apps that are fast, cheap, and truly
            community-owned.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group bg-card border border-border rounded-lg p-8 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-default"
              >
                <div className="size-12 rounded-lg bg-brand-green/10 flex items-center justify-center mb-5 group-hover:bg-brand-green/20 transition-colors">
                  <Icon size={22} className="text-brand-green" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="bg-background border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-3 gap-8 sm:gap-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl sm:text-5xl font-black text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-sm sm:text-base text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HighlightSection() {
  return (
    <section className="bg-brand-chartreuse">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-2xl sm:text-3xl font-bold text-black leading-snug">
            The open web is possible when builders work together. This is where that happens —
            find your collaborators, ship your ideas.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 h-12 bg-black text-white hover:bg-black/80 font-bold"
            >
              <Link to="/builders">Meet the builders</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="rounded-full px-8 h-12 text-black hover:bg-black/10 font-bold"
            >
              <Link to="/projects">See what's being built</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
            Belong here.
          </h2>
          <p className="text-lg opacity-70 mb-10 leading-relaxed">
            Join a global community of explorers and builders seeking a better, more open web.
            Your NEAR wallet is all you need to get started.
          </p>
          <Button
            asChild
            size="lg"
            className="rounded-full px-10 h-14 text-base font-bold bg-brand-green hover:bg-brand-green/90 text-black shadow-lg shadow-brand-green/30 hover:scale-105 transition-all"
          >
            <Link to="/login">
              Connect your wallet
              <ArrowRight size={18} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
