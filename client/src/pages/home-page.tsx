import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCircle, AlertCircle, BookOpen, HeartHandshake, ArrowRight, Coffee, ExternalLink, Mic } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

// Import the IPCR logo and DG image
import ipcr_logo from "@assets/Institute-For-Peace-And-Conflict-Resolution.jpg";
import dg_image from "@assets/DG.png";

export default function HomePage() {
  const { language, setLanguage, t } = useI18n();

  const onLanguageChange = (value: string) => {
    if (value === "en" || value === "ig" || value === "ha" || value === "yo") setLanguage(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      {/* Header with login link */}
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto flex justify-between items-center px-4">
          <div className="flex items-center space-x-2">
            <img src={ipcr_logo} alt="IPCR Logo" className="h-16 w-16" />
            <div>
              <h1 className="text-xl font-bold text-blue-600">{t("home.header.institute")}</h1>
              <p className="text-sm text-gray-500">{t("home.header.system")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger className="w-[180px]">
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
              <Button variant="outline" className="flex items-center gap-2">
                <UserCircle size={16} />
                <span>{t("home.header.login")}</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="py-12 px-4 md:py-20 bg-gradient-to-r from-blue-500 to-sky-400 text-white">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{t("home.hero.title")}</h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8">
            {t("home.hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/report-incident">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 w-full sm:w-auto">
                {t("home.hero.reportIncident")} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/report-by-voice">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 w-full sm:w-auto">
                <Mic className="mr-2 h-5 w-5" />
                Report by Voice
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Main content sections */}
      <section className="py-16 px-4 container mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* About IPCR */}
        <Card className="shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-sky-400 text-white">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              {t("home.aboutIpcr.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center mb-6">
              <img src={ipcr_logo} alt="IPCR Logo" className="h-32" />
            </div>
            <p className="mb-4">
              {t("home.aboutIpcr.p1")}
            </p>
            <p className="mb-4">
              {t("home.aboutIpcr.p2")}
            </p>
            <Button variant="outline" className="mt-2 w-full">
              {t("home.aboutIpcr.learnMore")} <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* About the DG */}
        <Card className="shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-sky-400 text-white">
            <CardTitle className="flex items-center gap-2">
              <Coffee className="h-6 w-6" />
              {t("home.aboutDg.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex justify-center mb-6">
              <img 
                src={dg_image} 
                alt="Director General" 
                className="h-56 rounded-md shadow-md"
              />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t("home.aboutDg.name")}</h3>
            <p className="text-gray-500 mb-2">{t("home.aboutDg.role")}</p>
            <p className="mb-4">
              {t("home.aboutDg.p")}
            </p>
            <Button variant="outline" className="mt-2 w-full">
              {t("home.aboutDg.profile")} <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Report a Crisis & Peace Initiatives */}
      <section className="py-12 px-4 bg-sky-50">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Report a Crisis */}
          <Card className="shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="bg-gradient-to-r from-red-500 to-amber-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6" />
                {t("home.reportCrisis.title")}
              </CardTitle>
              <CardDescription className="text-white/80">
                {t("home.reportCrisis.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="mb-4">
                {t("home.reportCrisis.p1")}
              </p>
              <p className="mb-4">
                {t("home.reportCrisis.p2")}
              </p>
              <div className="space-y-2">
                <Link href="/report-incident">
                  <Button className="w-full">{t("home.reportCrisis.reportOnline")}</Button>
                </Link>
                <Link href="/report-by-voice">
                  <Button variant="outline" className="w-full gap-2">
                    <Mic className="h-4 w-4" /> Report by Voice
                  </Button>
                </Link>
                <Button variant="outline" className="w-full">{t("home.reportCrisis.callHotline")}</Button>
                <Button variant="outline" className="w-full">{t("home.reportCrisis.smsReporting")}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Peace Initiatives */}
          <Card className="shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <HeartHandshake className="h-6 w-6" />
                {t("home.peaceInitiatives.title")}
              </CardTitle>
              <CardDescription className="text-white/80">
                {t("home.peaceInitiatives.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <h3 className="font-medium">{t("home.peaceInitiatives.item1.title")}</h3>
                  <p className="text-sm text-gray-600">
                    {t("home.peaceInitiatives.item1.desc")}
                  </p>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <h3 className="font-medium">{t("home.peaceInitiatives.item2.title")}</h3>
                  <p className="text-sm text-gray-600">
                    {t("home.peaceInitiatives.item2.desc")}
                  </p>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <h3 className="font-medium">{t("home.peaceInitiatives.item3.title")}</h3>
                  <p className="text-sm text-gray-600">
                    {t("home.peaceInitiatives.item3.desc")}
                  </p>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <h3 className="font-medium">{t("home.peaceInitiatives.item4.title")}</h3>
                  <p className="text-sm text-gray-600">
                    {t("home.peaceInitiatives.item4.desc")}
                  </p>
                </div>
              </div>
              
              <Button variant="outline" className="mt-6 w-full">
                {t("home.peaceInitiatives.viewAll")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">{t("home.footer.contact")}</h3>
              <p className="text-gray-300 mb-2">Plot 496 Abogo Largema Street</p>
              <p className="text-gray-300 mb-2">Central Business District</p>
              <p className="text-gray-300 mb-2">Abuja, Nigeria</p>
              <p className="text-gray-300">Email: info@ipcr.gov.ng</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">{t("home.footer.quickLinks")}</h3>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-blue-300">{t("home.footer.home")}</a></li>
                <li><a href="#" className="hover:text-blue-300">{t("home.footer.about")}</a></li>
                <li><a href="#" className="hover:text-blue-300">{t("home.footer.research")}</a></li>
                <li><a href="#" className="hover:text-blue-300">{t("home.footer.careers")}</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">{t("home.footer.resources")}</h3>
              <ul className="space-y-2 text-gray-300">
                <li><Link href="/map" className="hover:text-blue-300">{t("home.footer.map")}</Link></li>
                <li><a href="#" className="hover:text-blue-300">{t("home.footer.toolkit")}</a></li>
                <li><a href="#" className="hover:text-blue-300">{t("home.footer.policy")}</a></li>
                <li><a href="#" className="hover:text-blue-300">{t("home.footer.media")}</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">{t("home.footer.connect")}</h3>
              <div className="flex space-x-4 mb-4">
                <a href="#" className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="h-10 w-10 rounded-full bg-blue-800 flex items-center justify-center hover:bg-blue-900">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                  </svg>
                </a>
                <a href="#" className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                  </svg>
                </a>
              </div>
              <p className="text-gray-300 text-sm">{t("home.footer.newsletter")}</p>
              <div className="mt-2">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">{t("home.footer.subscribe")}</Button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400 text-sm">
            <p>© {new Date().getFullYear()} {t("home.header.institute")}. {t("home.footer.rights")}</p>
            <p className="mt-1">Designed by <a href="https://afrinict.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">afrinict.com</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}