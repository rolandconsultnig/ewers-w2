import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Globe,
  HeartHandshake,
  MapPin,
  Mic,
  ShieldCheck,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

// Import the IPCR logo and DG image
import ipcr_logo from "@assets/Institute-For-Peace-And-Conflict-Resolution.jpg";
import dg_image from "@assets/DG.png";

export default function HomePage() {
  const { language, setLanguage, t } = useI18n();

  const onLanguageChange = (value: string) => {
    if (value === "en" || value === "ig" || value === "ha" || value === "yo") setLanguage(value);
  };

  const { data: cmsContents } = useQuery({
    queryKey: ["/api/cms/content"],
    queryFn: async () => {
      const res = await fetch("/api/cms/content", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const cmsBySection = new Map<string, any>(
    Array.isArray(cmsContents) ? cmsContents.map((c: any) => [c.section, c]) : []
  );

  const aboutIpcr = cmsBySection.get("about_ipcr");
  const aboutDg = cmsBySection.get("about_director");
  const peaceInitiatives = cmsBySection.get("peace_initiatives");
  const heroTitle = cmsBySection.get("home_hero_title");
  const heroSubtitle = cmsBySection.get("home_hero_subtitle");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={ipcr_logo} alt="IPCR Logo" className="h-11 w-11 rounded-md" />
            <div className="leading-tight">
              <div className="text-base md:text-lg font-semibold text-slate-900">
                {t("home.header.institute")}
              </div>
              <div className="text-xs md:text-sm text-slate-500">{t("home.header.system")}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <Link href="/public-map">
                <Button variant="ghost" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  Map
                </Button>
              </Link>
              <Link href="/report-incident">
                <Button variant="ghost" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  {t("home.hero.reportIncident")}
                </Button>
              </Link>
            </div>

            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder={t("settings.system.language")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("language.english")}</SelectItem>
                <SelectItem value="ig">{t("language.igbo")}</SelectItem>
                <SelectItem value="ha">{t("language.hausa")}</SelectItem>
                <SelectItem value="yo">{t("language.yoruba")}</SelectItem>
              </SelectContent>
            </Select>

            <Link href="/auth">
              <Button variant="outline" className="gap-2">
                <UserCircle className="h-4 w-4" />
                <span className="hidden sm:inline">{t("home.header.login")}</span>
                <span className="sm:hidden">Login</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" />
        <div className="absolute -top-16 -right-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />

        <div className="relative container mx-auto px-4 py-14 md:py-20 text-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs md:text-sm">
                <ShieldCheck className="h-4 w-4" />
                Early Warning • Early Response
              </div>
              <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight">
                {heroTitle?.isActive && heroTitle?.content ? heroTitle.content : t("home.hero.title")}
              </h1>
              <p className="mt-5 text-base md:text-xl text-white/90 max-w-2xl">
                {heroSubtitle?.isActive && heroSubtitle?.content ? heroSubtitle.content : t("home.hero.subtitle")}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href="/report-incident">
                  <Button size="lg" className="bg-white text-slate-900 hover:bg-white/90 w-full sm:w-auto">
                    {t("home.hero.reportIncident")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/report-by-voice">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/70 text-white hover:bg-white/10 w-full sm:w-auto"
                  >
                    <Mic className="mr-2 h-5 w-5" />
                    Report by Voice
                  </Button>
                </Link>
                <Link href="/public-map">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto"
                  >
                    <Globe className="mr-2 h-5 w-5" />
                    View Map
                  </Button>
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-3 max-w-xl">
                <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <div className="text-sm text-white/80">Coverage</div>
                  <div className="text-2xl font-semibold">Nigeria</div>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <div className="text-sm text-white/80">Reporting</div>
                  <div className="text-2xl font-semibold">Public + Official</div>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-4 col-span-2 md:col-span-1">
                  <div className="text-sm text-white/80">Response</div>
                  <div className="text-2xl font-semibold">Coordinated</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-white/10 border border-white/15 p-6 md:p-7">
                <div className="text-sm text-white/80">Quick actions</div>
                <div className="mt-4 grid gap-3">
                  <Link href="/report-incident">
                    <Card className="bg-white/10 border-white/15 hover:bg-white/15 transition-colors">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Report online
                        </CardTitle>
                        <CardDescription className="text-white/75">
                          Submit an incident report without signing in
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                  <Link href="/report-by-voice">
                    <Card className="bg-white/10 border-white/15 hover:bg-white/15 transition-colors">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <Mic className="h-4 w-4" />
                          Report by voice
                        </CardTitle>
                        <CardDescription className="text-white/75">
                          Speak your report, we’ll transcribe it
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                  <Link href="/auth">
                    <Card className="bg-white/10 border-white/15 hover:bg-white/15 transition-colors">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <UserCircle className="h-4 w-4" />
                          Official portal
                        </CardTitle>
                        <CardDescription className="text-white/75">
                          Access analytics, review and response tools
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                {aboutIpcr?.title || t("home.aboutIpcr.title")}
              </CardTitle>
              <CardDescription>
                Learn about IPCR and our role in peacebuilding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <img src={ipcr_logo} alt="IPCR" className="h-14 w-14 rounded-md" />
                <div className="text-xs text-slate-500">
                  Institute for Peace and Conflict Resolution
                </div>
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">
                {aboutIpcr?.isActive
                  ? aboutIpcr.content
                  : `${t("home.aboutIpcr.p1")}\n\n${t("home.aboutIpcr.p2")}`}
              </div>
              <Link href="/about-ipcr">
                <Button variant="outline" className="w-full">
                  {t("home.aboutIpcr.learnMore")}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-blue-600" />
                {aboutDg?.title || t("home.aboutDg.title")}
              </CardTitle>
              <CardDescription>
                Leadership and strategic direction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={(aboutDg?.imageUrl as string) || dg_image}
                  alt="Director General"
                  className="h-56 w-auto rounded-xl border bg-white object-cover shadow-sm"
                />
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">
                {aboutDg?.isActive
                  ? aboutDg.content
                  : t("home.aboutDg.p")}
              </div>
              <Link href="/director-general">
                <Button variant="outline" className="w-full">
                  {t("home.aboutDg.profile")}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-emerald-600" />
                {peaceInitiatives?.title || t("home.peaceInitiatives.title")}
              </CardTitle>
              <CardDescription>
                Programs and initiatives that strengthen peace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-700 whitespace-pre-wrap">
                {peaceInitiatives?.isActive
                  ? peaceInitiatives.content
                  : `${t("home.peaceInitiatives.item1.title")}: ${t("home.peaceInitiatives.item1.desc")}\n\n${t("home.peaceInitiatives.item2.title")}: ${t("home.peaceInitiatives.item2.desc")}`}
              </div>
              <Link href="/peace-initiatives">
                <Button variant="outline" className="w-full">
                  {t("home.peaceInitiatives.viewAll")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t bg-slate-950 text-slate-200">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3">
                <img src={ipcr_logo} alt="IPCR" className="h-10 w-10 rounded-md" />
                <div>
                  <div className="font-semibold">{t("home.header.institute")}</div>
                  <div className="text-sm text-slate-400">{t("home.header.system")}</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-400">
                Plot 496 Abogo Largema Street, Central Business District, Abuja, Nigeria
              </div>
              <div className="mt-2 text-sm text-slate-400">Email: info@ipcr.gov.ng</div>
            </div>

            <div>
              <div className="font-semibold mb-3">Resources</div>
              <div className="grid gap-2 text-sm text-slate-400">
                <Link href="/public-map" className="hover:text-white">Map</Link>
                <Link href="/report-incident" className="hover:text-white">Report Incident</Link>
                <Link href="/report-by-voice" className="hover:text-white">Report by Voice</Link>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3">Official</div>
              <div className="grid gap-2 text-sm text-slate-400">
                <Link href="/auth" className="hover:text-white">Login</Link>
                <span className="text-xs"> {new Date().getFullYear()} {t("home.header.institute")}</span>
                <span className="text-xs">Designed by afrinict.com</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}