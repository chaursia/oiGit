import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/StatsCard";
import { LanguageCard } from "@/components/LanguageCard";
import { StreakCard } from "@/components/StreakCard";
import { Trophies } from "@/components/Trophies";
import { ProfileCard } from "@/components/ProfileCard";
import { TopReposCard } from "@/components/TopReposCard";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { ActivityOverview } from "@/components/ActivityOverview";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Github, Share2, Copy, Check, ArrowLeft, Code, AlertCircle, Info, BarChart2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { GitHubStats } from "@shared/types";

export default function UserProfile() {
  const [match, params] = useRoute("/u/:username");
  const [, setLocation] = useLocation();
  const username = params?.username || "";

  const [inputValue, setInputValue] = useState("");
  const [copied, setCopied] = useState(false);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [embedType, setEmbedType] = useState<"stats" | "languages" | "streak" | "trophies" | "overview" | "heatmap" | "repos" | "composite">("stats");
  const [compositeSelection, setCompositeSelection] = useState({
    stats: true,
    languages: true,
    streak: true,
    trophies: true,
    overview: true,
    heatmap: true,
    repos: true
  });
  const [useNewsprintTheme, setUseNewsprintTheme] = useState(false);

  const { data, isLoading, error } = useQuery<GitHubStats>({
    queryKey: ["github-stats", username],
    queryFn: async () => {
      const response = await fetch(`/api/user/${username}`);
      if (!response.ok) {
        // Safely parse error: some environments return HTML/text on errors
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const err = await response.json();
          throw new Error(err.error || "Failed to fetch stats");
        } else {
          const text = await response.text();
          // Extract a meaningful snippet if it's an HTML page
          const match = text.match(/<title>([^<]*)<\/title>/i);
          throw new Error(match?.[1] ?? text.slice(0, 120) ?? "Failed to fetch stats");
        }
      }
      return response.json();
    },
    retry: 1,
    staleTime: 1000 * 60 * 30, // 30 min
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setLocation(`/u/${inputValue.trim()}`);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to clipboard", description: "Paste into your GitHub README." });
    setTimeout(() => setCopied(false), 2000);
  };

  const openEmbedDialog = (type: typeof embedType) => {
    setEmbedType(type);
    setEmbedDialogOpen(true);
  };

  const getEmbedCode = (type: string) => {
    const baseUrl = window.location.origin + "/api";
    const themeParam = useNewsprintTheme ? "&theme=newsprint" : "";
    
    if (type === "composite") {
      const types = Object.keys(compositeSelection).filter(k => compositeSelection[k as keyof typeof compositeSelection]);
      return {
        markdown: types.map(t => `[![${username}'s GitHub ${t}](${baseUrl}?username=${username}&type=${t}${themeParam})](https://github.com/${username})`).join('\n'),
        html: types.map(t => `<a href="https://github.com/${username}"><img src="${baseUrl}?username=${username}&type=${t}${themeParam}" alt="${username}'s GitHub ${t}" /></a>`).join('\n'),
        link: types.map(t => `${baseUrl}?username=${username}&type=${t}${themeParam}`).join('\n'),
      };
    }

    const altText = `${username}'s GitHub ${type}`;
    return {
      markdown: `[![${altText}](${baseUrl}?username=${username}&type=${type}${themeParam})](https://github.com/${username})`,
      html: `<a href="https://github.com/${username}"><img src="${baseUrl}?username=${username}&type=${type}${themeParam}" alt="${altText}" /></a>`,
      link: `${baseUrl}?username=${username}&type=${type}${themeParam}`,
    };
  };

  const currentEmbedCode = getEmbedCode(embedType);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] text-[#111111] newsprint-texture p-8 flex items-center justify-center">
        <div className="max-w-md w-full border-4 border-[#111111] bg-white p-8">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b-2 border-[#111111]">
            <AlertCircle size={32} className="text-[#CC0000]" />
            <h1 className="text-3xl font-serif font-black uppercase tracking-tighter">Error</h1>
          </div>
          <p className="font-mono text-sm uppercase tracking-widest mb-8">
            {error instanceof Error ? error.message : "Failed to load GitHub stats."}
          </p>
          <Button onClick={() => setLocation("/")} className="w-full h-12 sharp-corners">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7] text-[#111111] newsprint-texture flex flex-col">
      {/* ── Header ── */}
      <header className="w-full border-b-4 border-[#111111] bg-white relative z-10">
        <div className="flex justify-between items-center px-4 py-2 border-b border-[#111111] text-[10px] sm:text-xs font-mono uppercase tracking-widest">
          <span>Profile Report</span>
          <span className="hidden sm:inline">{today}</span>
          <span>Vol. 1.0</span>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 lg:p-6 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="shrink-0 h-10 w-10 border border-[#111111] sharp-corners hover:bg-[#111111] hover:text-white">
              <ArrowLeft size={16} strokeWidth={1.5} />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 border border-[#111111] bg-[#111111] overflow-hidden">
                 <img src="/favicon.png" alt="Oi Git Logo" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tighter uppercase leading-none mt-1">
                <span className="text-[#CC0000]">@</span>{username}
              </h1>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <form onSubmit={handleSearch} className="flex flex-1 md:w-64">
              <div className="relative flex-1 border border-[#111111] bg-white border-r-0">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-[#111111]" size={15} />
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Search user..."
                  className="pl-9 bg-transparent border-none font-mono h-10 text-xs rounded-none focus-visible:ring-0"
                />
              </div>
              <Button type="submit" className="h-10 px-4 sharp-corners border border-[#111111] border-l-0">
                <Search size={15} strokeWidth={2} />
              </Button>
            </form>

            {!isLoading && data && (
              <Button
                onClick={() => openEmbedDialog("composite")}
                className="bg-[#CC0000] hover:bg-[#990000] text-white gap-2 h-10 px-4 sharp-corners shrink-0"
              >
                <Code size={14} /> Embed
              </Button>
            )}
            <a href="https://github.com/chaursia/oiGit" target="_blank" rel="noreferrer">
              <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10 border border-[#111111] sharp-corners hover:bg-[#111111] hover:text-white" aria-label="View Source">
                <Github size={16} strokeWidth={1.5} />
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* ── Degraded mode notice ── */}
      {!isLoading && data && !data.isFullData && (
        <div className="bg-[#111111] text-[#F9F9F7] py-2 px-4 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest border-b border-[#404040]">
          <span className="text-[#CC0000] font-bold">WARNING:</span> Running in limited mode without GITHUB_TOKEN. Stats are approximate.
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 lg:p-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <Skeleton className="md:col-span-4 h-96 bg-neutral-200 sharp-corners" />
            <Skeleton className="md:col-span-8 h-96 bg-neutral-200 sharp-corners" />
          </div>
        ) : data ? (
          <div className="flex flex-col gap-8">
            
            {/* Top Row: Profile + Stats Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
               <div className="lg:col-span-4">
                  <ProfileCard
                    username={data.username}
                    name={data.name}
                    avatarUrl={data.avatarUrl}
                    bio={data.bio}
                    location={data.location}
                    company={data.company}
                    blog={data.blog}
                    followers={data.followers}
                    following={data.following}
                    publicRepos={data.publicRepos}
                  />
               </div>
               <div className="lg:col-span-8 flex flex-col gap-8">
                  <div className="flex-1">
                    <StatsCard
                      username={data.username}
                      totalStars={data.totalStars}
                      totalCommits={data.totalCommits}
                      totalPRs={data.totalPRs}
                      totalIssues={data.totalIssues}
                      contributedTo={data.contributedTo}
                      prsReviewed={data.prsReviewed}
                      mergedPRs={data.mergedPRs}
                      totalForks={data.totalForks}
                      organizations={data.organizations}
                      accountAgeDays={data.accountAgeDays}
                      onEmbed={() => openEmbedDialog("stats")}
                    />
                  </div>
               </div>
            </div>

            {/* Middle Row: Languages, Streaks, Score */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
               <LanguageCard languages={data.languages} onEmbed={() => openEmbedDialog("languages")} />
               <StreakCard
                  currentStreak={data.streak.current}
                  longestStreak={data.streak.longest}
                  totalContributions={data.streak.total}
                  startDate={data.streak.start}
                  endDate={data.streak.end}
                  onEmbed={() => openEmbedDialog("streak")}
                />
               <ActivityOverview
                  totalCommits={data.totalCommits}
                  totalPRs={data.totalPRs}
                  totalIssues={data.totalIssues}
                  totalStars={data.totalStars}
                  followers={data.followers}
                  contributedTo={data.contributedTo}
                  publicRepos={data.publicRepos}
                  isFullData={data.isFullData}
                  onEmbed={() => openEmbedDialog("overview")}
                />
            </div>

            {/* Bottom Row: Heatmap */}
            <div>
               <ActivityHeatmap
                weeklyContributions={data.weeklyContributions}
                username={data.username}
                isFullData={data.isFullData}
                onEmbed={() => openEmbedDialog("heatmap")}
              />
            </div>

            {/* Top Repos */}
            <div>
              <TopReposCard repos={data.topRepos} onEmbed={() => openEmbedDialog("repos")} />
            </div>

            {/* Trophies */}
            <div>
               <Trophies trophies={data.trophies} onEmbed={() => openEmbedDialog("trophies")} />
            </div>

          </div>
        ) : null}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t-4 border-[#111111] bg-white py-6 mt-8">
         <div className="max-w-[1600px] mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono uppercase tracking-widest text-[#737373]">
            <span>© {new Date().getFullYear()} Oi Git Publishing.</span>
            <span className="text-[#111111] font-bold">End of Report.</span>
         </div>
      </footer>

      {/* ── Embed Dialog ── */}
      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border-4 border-[#111111] sharp-corners p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b-2 border-[#111111] bg-[#F9F9F7]">
            <DialogTitle className="flex items-center gap-2 capitalize font-serif font-black text-2xl uppercase">
              <Share2 size={20} strokeWidth={2} /> Share {embedType === "composite" ? "All" : embedType}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs uppercase tracking-widest text-[#737373]">
              Copy snippets to your GitHub README.
            </DialogDescription>
            <div className="mt-2 pt-2 border-t border-dotted border-[#737373]">
               <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest cursor-pointer text-[#111111]">
                  <input 
                    type="checkbox" 
                    className="accent-[#111111] w-3 h-3 cursor-pointer"
                    checked={useNewsprintTheme}
                    onChange={(e) => setUseNewsprintTheme(e.target.checked)}
                  />
                  Use Newsprint Design Theme
               </label>
            </div>
            {embedType === "composite" && (
              <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-[#111111]">
                {(["stats", "languages", "streak", "trophies", "overview", "heatmap", "repos"] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="accent-[#111111] w-4 h-4 cursor-pointer"
                      checked={compositeSelection[t]}
                      onChange={(e) => setCompositeSelection(s => ({...s, [t]: e.target.checked}))}
                    />
                    {t}
                  </label>
                ))}
              </div>
            )}
          </DialogHeader>

          <Tabs defaultValue="markdown" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#111111] text-[#F9F9F7] rounded-none h-12 p-0 border-b-2 border-[#111111]">
              <TabsTrigger value="markdown" className="rounded-none sharp-corners data-[state=active]:bg-white data-[state=active]:text-[#111111] font-mono text-xs uppercase tracking-widest">Markdown</TabsTrigger>
              <TabsTrigger value="html" className="rounded-none sharp-corners data-[state=active]:bg-white data-[state=active]:text-[#111111] font-mono text-xs uppercase tracking-widest">HTML</TabsTrigger>
              <TabsTrigger value="link" className="rounded-none sharp-corners data-[state=active]:bg-white data-[state=active]:text-[#111111] font-mono text-xs uppercase tracking-widest">Link</TabsTrigger>
            </TabsList>

            {(["markdown", "html", "link"] as const).map((tab) => (
              <TabsContent key={tab} value={tab} className="p-6 m-0 bg-white">
                <div className="p-4 bg-neutral-100 font-mono text-xs text-[#111111] break-all whitespace-pre-wrap border border-[#111111] mb-4 overflow-y-auto max-h-48">
                  {currentEmbedCode[tab]}
                </div>
                <Button onClick={() => handleCopy(currentEmbedCode[tab])} className="w-full h-12 sharp-corners border border-[#111111]">
                  {copied ? <><Check size={16} strokeWidth={2} className="mr-2 text-green-500" /> COPIED!</> : <><Copy size={16} strokeWidth={2} className="mr-2" /> COPY {tab.toUpperCase()}</>}
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
