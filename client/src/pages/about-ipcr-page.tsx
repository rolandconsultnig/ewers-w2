import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/contexts/I18nContext";
import ipcr_logo from "@assets/Institute-For-Peace-And-Conflict-Resolution.jpg";

export default function AboutIpcrPage() {
  const { t } = useI18n();

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

  const aboutIpcr = Array.isArray(cmsContents)
    ? cmsContents.find((c: any) => c.section === "about_ipcr")
    : undefined;

  const title = aboutIpcr?.isActive && aboutIpcr?.title ? aboutIpcr.title : t("home.aboutIpcr.title");
  const content = aboutIpcr?.isActive && aboutIpcr?.content
    ? aboutIpcr.content
    : `${t("home.aboutIpcr.p1")}\n\n${t("home.aboutIpcr.p2")}`;
  const imageUrl = aboutIpcr?.isActive && aboutIpcr?.imageUrl ? (aboutIpcr.imageUrl as string) : ipcr_logo;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">{title}</h1>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">{t("home.header.institute")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <img src={imageUrl} alt="IPCR" className="h-40 w-auto rounded-xl border bg-white object-cover shadow-sm" />
            </div>
            <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">{content}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
