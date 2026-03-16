import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/contexts/I18nContext";

export default function PeaceInitiativesPage() {
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

  const peaceInitiatives = Array.isArray(cmsContents)
    ? cmsContents.find((c: any) => c.section === "peace_initiatives")
    : undefined;

  const title = peaceInitiatives?.isActive && peaceInitiatives?.title
    ? peaceInitiatives.title
    : t("home.peaceInitiatives.title");

  const fallbackContent = `${t("home.peaceInitiatives.item1.title")}: ${t("home.peaceInitiatives.item1.desc")}\n\n${t("home.peaceInitiatives.item2.title")}: ${t("home.peaceInitiatives.item2.desc")}\n\n${t("home.peaceInitiatives.item3.title")}: ${t("home.peaceInitiatives.item3.desc")}\n\n${t("home.peaceInitiatives.item4.title")}: ${t("home.peaceInitiatives.item4.desc")}`;

  const content = peaceInitiatives?.isActive && peaceInitiatives?.content
    ? peaceInitiatives.content
    : fallbackContent;

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
            <CardTitle className="text-slate-900">{t("home.peaceInitiatives.subtitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">{content}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
