import { useI18n } from "@/contexts/I18nContext";

export default function Footer() {
  const { t } = useI18n();
  const linkClass = "text-white hover:text-white/90 underline underline-offset-4";

  return (
    <footer className="bg-gradient-to-r from-green-800 to-green-700 border-t border-red-600/30 py-4 px-6">
      <div className="flex flex-col md:flex-row justify-between items-center text-sm text-white/80">
        <div className="flex flex-col items-center md:items-start">
          <div>© {new Date().getFullYear()} {t("layout.footer.system")}</div>
          <div className="mt-1 text-xs">
            {t("layout.footer.designedBy")}{" "}
            <a href="https://afrinict.com" target="_blank" rel="noopener noreferrer" className={linkClass}>
              afrinict.com
            </a>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex gap-4">
          <a href="#" className={linkClass}>{t("layout.footer.privacy")}</a>
          <a href="#" className={linkClass}>{t("layout.footer.terms")}</a>
          <a href="#" className={linkClass}>{t("layout.footer.help")}</a>
        </div>
      </div>
    </footer>
  );
}
