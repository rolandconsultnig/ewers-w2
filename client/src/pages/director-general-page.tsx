import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/contexts/I18nContext";
import dg_image from "@assets/DG.png";

export default function DirectorGeneralPage() {
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

  const aboutDg = Array.isArray(cmsContents)
    ? cmsContents.find((c: any) => c.section === "about_director")
    : undefined;

  const title = aboutDg?.isActive && aboutDg?.title ? aboutDg.title : t("home.aboutDg.title");
  const content = aboutDg?.isActive && aboutDg?.content ? aboutDg.content : t("home.aboutDg.p");
  const imageUrl = aboutDg?.isActive && aboutDg?.imageUrl ? (aboutDg.imageUrl as string) : dg_image;

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
            <CardTitle className="text-slate-900">{t("home.aboutDg.name")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <img src={imageUrl} alt="Director General" className="h-72 w-auto rounded-xl border bg-white object-cover shadow-sm" />
            </div>
            <div className="text-sm text-slate-500 text-center">{t("home.aboutDg.role")}</div>
            <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">{content}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
