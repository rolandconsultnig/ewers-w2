import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type SupportedLanguage = "en" | "ig" | "ha" | "yo";

type Translations = Record<SupportedLanguage, Record<string, string>>;

type I18nContextValue = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
};

const translations: Translations = {
  en: {
    "language.english": "English",
    "language.igbo": "Igbo",
    "language.hausa": "Hausa",
    "language.yoruba": "Yoruba",

    "home.header.institute": "Institute For Peace And Conflict Resolution",
    "home.header.system": "Early Warning & Early Response System",
    "home.header.login": "Official Login",
    "home.hero.title": "Building Peace Through Early Prevention",
    "home.hero.subtitle": "Monitoring, analyzing, and responding to conflict indicators for a peaceful Nigeria",
    "home.hero.reportIncident": "Report an Incident",

    "home.aboutIpcr.title": "About IPCR",
    "home.aboutIpcr.p1": "The Institute for Peace and Conflict Resolution (IPCR) is a Nigerian government agency dedicated to strengthening Nigeria's capacity for the promotion of peace, conflict prevention, management, and resolution.",
    "home.aboutIpcr.p2": "Established in February 2000, IPCR serves as a research center, think tank, and agency for peacebuilding with a mandate to conduct research, engage in policy advocacy, and intervene in conflict areas.",
    "home.aboutIpcr.learnMore": "Learn More",

    "home.aboutDg.title": "About the Director General",
    "home.aboutDg.name": "Dr. Joseph Ochogwu",
    "home.aboutDg.role": "Director General, IPCR",
    "home.aboutDg.p": "Dr. Joseph Ochogwu brings extensive experience in peace research, conflict resolution, and strategic leadership to the institute. Under his guidance, IPCR has strengthened its early warning systems and enhanced Nigeria's peacebuilding capacity.",
    "home.aboutDg.profile": "Full Profile",

    "home.reportCrisis.title": "Report a Crisis",
    "home.reportCrisis.subtitle": "Help us respond quickly to emerging conflicts",
    "home.reportCrisis.p1": "Our Early Warning & Early Response system relies on timely information from communities. If you observe signs of emerging conflict, violence, or peace threats, please report them through our secure channels.",
    "home.reportCrisis.p2": "Your report will be handled confidentially and could help prevent escalation of violence and save lives.",
    "home.reportCrisis.reportOnline": "Report Online",
    "home.reportCrisis.callHotline": "Call Hotline: 0800-PEACE-NG",
    "home.reportCrisis.smsReporting": "SMS Reporting",

    "home.peaceInitiatives.title": "Peace Initiatives",
    "home.peaceInitiatives.subtitle": "Ongoing programs to foster peace and stability",
    "home.peaceInitiatives.item1.title": "Community Dialogue Forums",
    "home.peaceInitiatives.item1.desc": "Creating spaces for inclusive dialogue among diverse communities",
    "home.peaceInitiatives.item2.title": "Conflict Sensitivity Training",
    "home.peaceInitiatives.item2.desc": "Building capacity for peaceful conflict resolution",
    "home.peaceInitiatives.item3.title": "Peace Education Programs",
    "home.peaceInitiatives.item3.desc": "Promoting a culture of peace through education",
    "home.peaceInitiatives.item4.title": "Regional Early Response Networks",
    "home.peaceInitiatives.item4.desc": "Coordinated response to emerging conflicts",
    "home.peaceInitiatives.viewAll": "View All Initiatives",

    "home.footer.contact": "Contact Us",
    "home.footer.quickLinks": "Quick Links",
    "home.footer.resources": "Resources",
    "home.footer.connect": "Connect With Us",
    "home.footer.home": "Home",
    "home.footer.about": "About IPCR",
    "home.footer.research": "Research Publications",
    "home.footer.careers": "Career Opportunities",
    "home.footer.map": "Nigeria Crisis Map",
    "home.footer.toolkit": "Peace Building Toolkit",
    "home.footer.policy": "Policy Briefs",
    "home.footer.media": "Media Gallery",
    "home.footer.newsletter": "Subscribe to our newsletter for updates on peace initiatives and upcoming events.",
    "home.footer.subscribe": "Subscribe",
    "home.footer.rights": "All rights reserved.",

    "layout.sidebar.mainNavigation": "Main Navigation",
    "layout.sidebar.aiAssistant": "AI Assistant",
    "layout.sidebar.dataCollection": "Data Collection & Processing",
    "layout.sidebar.riskAssessment": "Risk Assessment",
    "layout.sidebar.responseManagement": "Response Management",
    "layout.sidebar.communications": "Communications",
    "layout.sidebar.socialMedia": "Social Media",
    "layout.sidebar.administration": "Administration",
    "layout.sidebar.externalLinks": "External Links",
    "layout.sidebar.ipcrWebsite": "IPCR Website",
    "layout.sidebar.official": "Official",
    "layout.sidebar.tagline": "Early Warning & Early Response",

    "nav.dashboard": "Dashboard",
    "nav.executiveDashboard": "Executive Dashboard",
    "nav.situationRoom": "Situation Room",
    "nav.crisisManagement": "Conflict Management",
    "nav.nigeriaCrisisMap": "Nigeria Crisis Map",
    "nav.aiAnalysis": "AI Analysis",
    "nav.predictiveModels": "Predictive Models",
    "nav.responseAdvisor": "Response Advisor",
    "nav.dataCollection": "Data Collection",
    "nav.dataProcessing": "Data Processing & Analysis",
    "nav.riskAssessment": "Risk Assessment",
    "nav.visualization": "Visualization",
    "nav.alertsNotifications": "Alerts & Notifications",
    "nav.caseManagement": "Case Management",
    "nav.smsManagement": "SMS Management",
    "nav.composeSms": "Compose SMS",
    "nav.smsTemplates": "SMS Templates",
    "nav.messagingLogs": "Messaging Logs",
    "nav.socialDashboard": "Social Dashboard",
    "nav.auditLogs": "Audit Logs",
    "nav.enterpriseSettings": "Enterprise Settings",
    "nav.userManagement": "User Management",
    "nav.integrations": "Integrations",
    "nav.reporting": "Reporting",
    "nav.settings": "Settings",

    "layout.footer.system": "Early Warning & Early Response System",
    "layout.footer.designedBy": "Designed by",
    "layout.footer.privacy": "Privacy Policy",
    "layout.footer.terms": "Terms of Service",
    "layout.footer.help": "Help Center",

    "settings.system.title": "System Settings",
    "settings.system.description": "Configure global system preferences",
    "settings.system.language": "Language",
    "settings.system.languagePlaceholder": "Select a language",
    "settings.system.languageHelp": "The language used throughout the system interface",
  },
  ig: {
    "language.english": "Bekee",
    "language.igbo": "Igbo",
    "language.hausa": "Hausa",
    "language.yoruba": "Yoruba",

    "home.header.institute": "Institute For Peace And Conflict Resolution",
    "home.header.system": "Early Warning & Early Response System",
    "home.header.login": "Nbanye Ndị Ọrụ",
    "home.hero.title": "Ịkụ Udo Site N’Ịche Mgbochi Tupu O Mee",
    "home.hero.subtitle": "Ịlele, ịtụle, na ịzaghachi ihe ngosi esemokwu iji nweta Nigeria dị jụụ",
    "home.hero.reportIncident": "Kọwaa Ihe Merenụ",

    "home.aboutIpcr.title": "Banyere IPCR",
    "home.aboutIpcr.p1": "Institute for Peace and Conflict Resolution (IPCR) bụ ụlọ ọrụ gọọmenti Nigeria nke raara nye ịkwalite ikike Nigeria n’ịkwalite udo, igbochi esemokwu, ijikwa ya, na idozi ya.",
    "home.aboutIpcr.p2": "E guzobere ya na Febrụwarị 2000; IPCR na-arụ ọrụ dịka ụlọ nyocha na think tank maka iwulite udo, na-arụkwa ọrụ n’ịmụ ihe, ịtụ aro iwu, na ịbanye n’ebe esemokwu na-eme.",
    "home.aboutIpcr.learnMore": "Mụta Ọzọ",

    "home.aboutDg.title": "Banyere Onye Isi Ndu",
    "home.aboutDg.name": "Dr. Joseph Ochogwu",
    "home.aboutDg.role": "Onye Isi, IPCR",
    "home.aboutDg.p": "Dr. Joseph Ochogwu nwere ahụmịhe sara mbara n’ọrụ nyocha udo, idozi esemokwu, na nduzi atụmatụ. N’okpuru nduzi ya, IPCR emeela ka usoro ịdọ aka ná ntị ya sikwuo ike.",
    "home.aboutDg.profile": "Profaịlụ Zuru Ezu",

    "home.reportCrisis.title": "Kọwaa Ọnọdụ Mberede",
    "home.reportCrisis.subtitle": "Nyere anyị aka ịzaghachi ngwa ngwa na esemokwu na-apụta",
    "home.reportCrisis.p1": "Usoro ịdọ aka ná ntị na mmeghachi ọsọ na-adabere na ozi n’oge sitere n’obodo. Ọ bụrụ na i hụ ihe ngosi nke esemokwu ma ọ bụ ihe iyi egwu udo, biko kọọ ya site n’ụzọ nchekwa anyị.",
    "home.reportCrisis.p2": "A ga-edobe akụkọ gị n’uzo nzuzo ma nwee ike igbochi imebi udo ma chekwaa ndụ.",
    "home.reportCrisis.reportOnline": "Kọwaa Online",
    "home.reportCrisis.callHotline": "Kpọọ Hotline: 0800-PEACE-NG",
    "home.reportCrisis.smsReporting": "Kọwaa Site na SMS",

    "home.peaceInitiatives.title": "Mmepụta Udo",
    "home.peaceInitiatives.subtitle": "Mmemme na-aga n’ihu iji wulite udo na ịdị n’udo",
    "home.peaceInitiatives.item1.title": "Ogige Mkparịta Ụka Obodo",
    "home.peaceInitiatives.item1.desc": "Ịmepụta ohere maka mkparịta ụka gụnyere mmadụ niile",
    "home.peaceInitiatives.item2.title": "Nkuzi Ichebara Esemokwu",
    "home.peaceInitiatives.item2.desc": "Ịkwalite ikike maka idozi esemokwu n’udo",
    "home.peaceInitiatives.item3.title": "Mmụta Udo",
    "home.peaceInitiatives.item3.desc": "Ịkwalite omenala udo site n’ọmụmụ",
    "home.peaceInitiatives.item4.title": "Netwọk Mmeghachi Ọsọ Mpaghara",
    "home.peaceInitiatives.item4.desc": "Mmeghachi jikọtara ọnụ na esemokwu na-apụta",
    "home.peaceInitiatives.viewAll": "Lee Ha Nile",

    "home.footer.contact": "Kpọtụrụ Anyị",
    "home.footer.quickLinks": "Njikọ Ngwa ngwa",
    "home.footer.resources": "Akụrụngwa",
    "home.footer.connect": "Soro Anyị Kpọọ",
    "home.footer.home": "Ụlọ",
    "home.footer.about": "Banyere IPCR",
    "home.footer.research": "Akwụkwọ Nnyocha",
    "home.footer.careers": "Ọrụ",
    "home.footer.map": "Map Nigeria",
    "home.footer.toolkit": "Ngwaọrụ Iwulite Udo",
    "home.footer.policy": "Ntụziaka Iwu",
    "home.footer.media": "Galarị Media",
    "home.footer.newsletter": "Debanye aha ka ị nweta akụkọ ọhụrụ banyere mmepụta udo na ihe omume na-abịa.",
    "home.footer.subscribe": "Debanye Aha",
    "home.footer.rights": "Ikike niile echekwara.",

    "layout.sidebar.mainNavigation": "Nnyocha Isi",
    "layout.sidebar.aiAssistant": "Onye Enyemaka AI",
    "layout.sidebar.dataCollection": "Nchịkọta & Nhazi Data",
    "layout.sidebar.riskAssessment": "Ntụle Ihe ize ndụ",
    "layout.sidebar.responseManagement": "Njikwa Mmeghachi",
    "layout.sidebar.communications": "Nkwukọrịta",
    "layout.sidebar.socialMedia": "Mgbasa Ozi",
    "layout.sidebar.administration": "Nlekọta",
    "layout.sidebar.externalLinks": "Njikọ Mpụga",
    "layout.sidebar.ipcrWebsite": "Weebụsaịtị IPCR",
    "layout.sidebar.official": "Onye Ọrụ",
    "layout.sidebar.tagline": "Ịdọ Aka Ná Ntị & Mmeghachi Ọsọ",

    "nav.dashboard": "Dasbọọdụ",
    "nav.executiveDashboard": "Dasbọọdụ Ndị Ndu",
    "nav.situationRoom": "Ụlọ Ọnọdụ",
    "nav.crisisManagement": "Njikwa Ọnọdụ Mberede",
    "nav.nigeriaCrisisMap": "Map Ọnọdụ Nigeria",
    "nav.aiAnalysis": "Nnyocha AI",
    "nav.predictiveModels": "Ụdị Amụma",
    "nav.responseAdvisor": "Onye Ndụmọdụ Mmeghachi",
    "nav.dataCollection": "Nchịkọta Data",
    "nav.dataProcessing": "Nhazi & Nnyocha Data",
    "nav.riskAssessment": "Ntụle Ihe ize ndụ",
    "nav.visualization": "Ngosipụta",
    "nav.alertsNotifications": "Ịdọ Aka Ná Ntị",
    "nav.caseManagement": "Njikwa Ikpe",
    "nav.smsManagement": "Njikwa SMS",
    "nav.composeSms": "Dee SMS",
    "nav.smsTemplates": "Ụdị SMS",
    "nav.messagingLogs": "Ndekọ Ozi",
    "nav.socialDashboard": "Dasbọọdụ Mgbasa Ozi",
    "nav.auditLogs": "Ndekọ Nnyocha",
    "nav.enterpriseSettings": "Ntọala Ọtù",
    "nav.userManagement": "Njikwa Ndị Ọrụ",
    "nav.integrations": "Njikọta",
    "nav.reporting": "Akụkọ",
    "nav.settings": "Ntọala",

    "layout.footer.system": "Usoro Ịdọ Aka Ná Ntị Na Mmeghachi Ọsọ",
    "layout.footer.designedBy": "E mere ya site n'aka",
    "layout.footer.privacy": "Iwu Nzuzo",
    "layout.footer.terms": "Usoro Ọrụ",
    "layout.footer.help": "Ebe Enyemaka",

    "settings.system.title": "Ntọala Sistem",
    "settings.system.description": "Hazie mmasị sistem",
    "settings.system.language": "Asụsụ",
    "settings.system.languagePlaceholder": "Họrọ asụsụ",
    "settings.system.languageHelp": "Asụsụ a na-eji n’ime sistem",
  },
  ha: {
    "language.english": "Turanci",
    "language.igbo": "Igbo",
    "language.hausa": "Hausa",
    "language.yoruba": "Yarbanci",

    "home.header.institute": "Institute For Peace And Conflict Resolution",
    "home.header.system": "Early Warning & Early Response System",
    "home.header.login": "Shiga Na Hukuma",
    "home.hero.title": "Gina Zaman Lafiya Ta Hanyar Rigakafi Tun Farko",
    "home.hero.subtitle": "Sa ido, nazari, da martani ga alamomin rikici domin Najeriya mai zaman lafiya",
    "home.hero.reportIncident": "Bayar da Rahoton Lamari",

    "home.aboutIpcr.title": "Game da IPCR",
    "home.aboutIpcr.p1": "Institute for Peace and Conflict Resolution (IPCR) hukuma ce ta gwamnatin Najeriya da ke mayar da hankali wajen karfafa ikon Najeriya wajen inganta zaman lafiya, rigakafin rikici, gudanarwa da warware rikice-rikice.",
    "home.aboutIpcr.p2": "An kafa ta a Fabrairu 2000; IPCR cibiyar bincike ce da think tank don gina zaman lafiya tare da aikin bincike, shawarwari kan manufofi, da shiga a wuraren rikici.",
    "home.aboutIpcr.learnMore": "Kara Sani",

    "home.aboutDg.title": "Game da Darakta Janar",
    "home.aboutDg.name": "Dr. Joseph Ochogwu",
    "home.aboutDg.role": "Darakta Janar, IPCR",
    "home.aboutDg.p": "Dr. Joseph Ochogwu na da kwarewa a binciken zaman lafiya, warware rikici, da jagoranci. A karkashin jagorancinsa, IPCR ta inganta tsarin gargadi da martani.",
    "home.aboutDg.profile": "Cikakken Bayani",

    "home.reportCrisis.title": "Bayar da Rahoton Gaggawa",
    "home.reportCrisis.subtitle": "Taimaka mana mu yi martani da sauri ga rikice-rikicen da ke tasowa",
    "home.reportCrisis.p1": "Tsarin gargadi da martani na gaggawa yana bukatar bayanai cikin lokaci daga al'umma. Idan ka ga alamun rikici ko barazanar zaman lafiya, don Allah ka bayar da rahoto ta hanyoyinmu na tsaro.",
    "home.reportCrisis.p2": "Za a rike rahotonka cikin sirri kuma zai iya hana tashin hankali da ceton rayuka.",
    "home.reportCrisis.reportOnline": "Rahoto Ta Intanet",
    "home.reportCrisis.callHotline": "Kira Hotline: 0800-PEACE-NG",
    "home.reportCrisis.smsReporting": "Rahoto Ta SMS",

    "home.peaceInitiatives.title": "Shirye-shiryen Zaman Lafiya",
    "home.peaceInitiatives.subtitle": "Shirye-shirye masu gudana don karfafa zaman lafiya da kwanciyar hankali",
    "home.peaceInitiatives.item1.title": "Dandalin Tattaunawar Al'umma",
    "home.peaceInitiatives.item1.desc": "Samar da dama don tattaunawa mai hada kowa",
    "home.peaceInitiatives.item2.title": "Horar da Fahimtar Rikici",
    "home.peaceInitiatives.item2.desc": "Gina kwarewa don warware rikici cikin lumana",
    "home.peaceInitiatives.item3.title": "Shirin Ilimin Zaman Lafiya",
    "home.peaceInitiatives.item3.desc": "Inganta al'adar zaman lafiya ta hanyar ilimi",
    "home.peaceInitiatives.item4.title": "Hanyoyin Martani na Yanki",
    "home.peaceInitiatives.item4.desc": "Martani tare ga rikice-rikicen da ke tasowa",
    "home.peaceInitiatives.viewAll": "Duba Duka",

    "home.footer.contact": "Tuntube Mu",
    "home.footer.quickLinks": "Hanyoyi Masu Sauri",
    "home.footer.resources": "Albarkatu",
    "home.footer.connect": "Hada Kai Da Mu",
    "home.footer.home": "Gida",
    "home.footer.about": "Game da IPCR",
    "home.footer.research": "Wallafe-wallafen Bincike",
    "home.footer.careers": "Ayyuka",
    "home.footer.map": "Taswirar Rikici ta Najeriya",
    "home.footer.toolkit": "Kayan Aikin Gina Zaman Lafiya",
    "home.footer.policy": "Takardun Manufofi",
    "home.footer.media": "Gidan Hotuna",
    "home.footer.newsletter": "Yi rajista don samun sabbin labarai kan shirye-shiryen zaman lafiya da abubuwan da ke tafe.",
    "home.footer.subscribe": "Yi Rajista",
    "home.footer.rights": "Dukkan hakkoki an kiyaye.",

    "layout.sidebar.mainNavigation": "Babban Kewayawa",
    "layout.sidebar.aiAssistant": "Mataimakin AI",
    "layout.sidebar.dataCollection": "Tattara & Sarrafa Bayanai",
    "layout.sidebar.riskAssessment": "Tantance Hadari",
    "layout.sidebar.responseManagement": "Gudanar da Martani",
    "layout.sidebar.communications": "Sadarwa",
    "layout.sidebar.socialMedia": "Kafofin Sadarwa",
    "layout.sidebar.administration": "Gudanarwa",
    "layout.sidebar.externalLinks": "Hanyoyi Na Waje",
    "layout.sidebar.ipcrWebsite": "Shafin IPCR",
    "layout.sidebar.official": "Jami'i",
    "layout.sidebar.tagline": "Gargadi & Martani Na Gaggawa",

    "nav.dashboard": "Dashboard",
    "nav.executiveDashboard": "Dashboard na Shugabanni",
    "nav.situationRoom": "Dakin Kulawa",
    "nav.crisisManagement": "Gudanar da Rikici",
    "nav.nigeriaCrisisMap": "Taswirar Rikici ta Najeriya",
    "nav.aiAnalysis": "Nazarin AI",
    "nav.predictiveModels": "Samfuran Hasashe",
    "nav.responseAdvisor": "Mai Ba da Shawara",
    "nav.dataCollection": "Tattara Bayanai",
    "nav.dataProcessing": "Sarrafa & Nazari",
    "nav.riskAssessment": "Tantance Hadari",
    "nav.visualization": "Nuni",
    "nav.alertsNotifications": "Gargadi & Sanarwa",
    "nav.caseManagement": "Gudanar da Shari'a",
    "nav.smsManagement": "Gudanar da SMS",
    "nav.composeSms": "Rubuta SMS",
    "nav.smsTemplates": "Samfuran SMS",
    "nav.messagingLogs": "Rajistan Saƙo",
    "nav.socialDashboard": "Dashboard na Kafofi",
    "nav.auditLogs": "Rajistan Bita",
    "nav.enterpriseSettings": "Saitunan Kamfani",
    "nav.userManagement": "Gudanar da Masu Amfani",
    "nav.integrations": "Haɗawa",
    "nav.reporting": "Rahoto",
    "nav.settings": "Saituna",

    "layout.footer.system": "Tsarin Gargadi da Martani na Gaggawa",
    "layout.footer.designedBy": "An tsara ta",
    "layout.footer.privacy": "Manufar Sirri",
    "layout.footer.terms": "Sharuddan Sabis",
    "layout.footer.help": "Cibiyar Taimako",

    "settings.system.title": "Saitunan Tsari",
    "settings.system.description": "Saita zaɓuɓɓukan tsarin gaba ɗaya",
    "settings.system.language": "Harshe",
    "settings.system.languagePlaceholder": "Zaɓi harshe",
    "settings.system.languageHelp": "Harshe da ake amfani da shi a cikin tsarin",
  },
  yo: {
    "language.english": "Gẹ̀ẹ́sì",
    "language.igbo": "Igbo",
    "language.hausa": "Hausa",
    "language.yoruba": "Yorùbá",

    "home.header.institute": "Institute For Peace And Conflict Resolution",
    "home.header.system": "Early Warning & Early Response System",
    "home.header.login": "Ìwọlé Ọ́fíṣialì",
    "home.hero.title": "Kíkó Aláfíà Nípasẹ̀ Ìdènà Tẹ́lẹ̀",
    "home.hero.subtitle": "Ìtọ́jú, ìtúpalẹ̀, àti ìdáhùn sí àwọn àfihàn ìjà fún Nàìjíríà aláfíà",
    "home.hero.reportIncident": "Ròyìn Ìṣẹ̀lẹ̀",

    "home.aboutIpcr.title": "Nípa IPCR",
    "home.aboutIpcr.p1": "Institute for Peace and Conflict Resolution (IPCR) jẹ́ ilé-iṣẹ́ ìjọba Nàìjíríà tó dojukọ́ fífi agbára Nàìjíríà pọ̀ síi nínú ìmúlò aláfíà, ìdènà ìjà, ìṣàkóso àti ìtúpalẹ̀ ìjà.",
    "home.aboutIpcr.p2": "A dá a sílẹ̀ ní Kínní 2000; IPCR jẹ́ ilé-iṣẹ́ ìwádìí àti think tank fún ìkọ́ aláfíà, pẹ̀lú ìṣẹ́ ìwádìí, ìmòràn lórí ìlànà, àti ìfarahàn níbi ìjà.",
    "home.aboutIpcr.learnMore": "Kọ́ Sìi",

    "home.aboutDg.title": "Nípa Olùdarí Gbogbogbo",
    "home.aboutDg.name": "Dr. Joseph Ochogwu",
    "home.aboutDg.role": "Olùdarí Gbogbogbo, IPCR",
    "home.aboutDg.p": "Dr. Joseph Ochogwu ní irírí púpọ̀ nínú ìwádìí aláfíà, ìtúpalẹ̀ ìjà, àti ìdarí. Ní ìsàkóso rẹ̀, IPCR ti mú ètò ìkìlọ̀ tẹ́lẹ̀ rẹ̀ lágbára.",
    "home.aboutDg.profile": "Profaili Kíkún",

    "home.reportCrisis.title": "Ròyìn Ìpọnjú",
    "home.reportCrisis.subtitle": "Ràn wá lọ́wọ́ láti dáhùn kánkán sí ìjà tó ń yọ",
    "home.reportCrisis.p1": "Ètò ìkìlọ̀ tẹ́lẹ̀ àti ìdáhùn kánkán ń gbẹ́kẹ̀lé ìròyìn tó pé ní àsìkò láti ọ̀dọ̀ àwùjọ. Tí o bá rí àfihàn ìjà tàbí ewu aláfíà, jọ̀wọ́ ròyìn rẹ̀ nípasẹ̀ ọ̀nà ààbò wa.",
    "home.reportCrisis.p2": "A ó tọju ìròyìn rẹ ní ìkọ̀kọ̀, ó sì lè dènà ìkórìíra àti gba ẹ̀mí là.",
    "home.reportCrisis.reportOnline": "Ròyìn Lórí Ayelujara",
    "home.reportCrisis.callHotline": "Pe Hotline: 0800-PEACE-NG",
    "home.reportCrisis.smsReporting": "Ròyìn Pẹ̀lú SMS",

    "home.peaceInitiatives.title": "Àwọn Ìdájọ́ Aláfíà",
    "home.peaceInitiatives.subtitle": "Àwọn ètò tó ń lọ lọwọ́ láti fi aláfíà àti ìdákẹ́jẹ̀ múlẹ̀",
    "home.peaceInitiatives.item1.title": "Àpéjọ Ìjíròrò Àwùjọ",
    "home.peaceInitiatives.item1.desc": "Ṣíṣe àyè fún ìjíròrò tó kó gbogbo ènìyàn pọ̀",
    "home.peaceInitiatives.item2.title": "Ìkẹ́kọ̀ọ́ Ìfarabalẹ̀ Sí Ìjà",
    "home.peaceInitiatives.item2.desc": "Kíkó agbára fún ìtúpalẹ̀ ìjà ní ìbáṣepọ̀",
    "home.peaceInitiatives.item3.title": "Ètò Ẹ̀kọ́ Aláfíà",
    "home.peaceInitiatives.item3.desc": "Ìgbéga àṣà aláfíà nípasẹ̀ ẹ̀kọ́",
    "home.peaceInitiatives.item4.title": "Nẹ́tíwọ́ọ̀kì Ìdáhùn Agbègbè",
    "home.peaceInitiatives.item4.desc": "Ìdáhùn pọ̀ sí ìjà tó ń yọ",
    "home.peaceInitiatives.viewAll": "Wo Gbogbo Ètò",

    "home.footer.contact": "Kàn Sí Wa",
    "home.footer.quickLinks": "Àwọn Ọ̀nà Títẹ̀",
    "home.footer.resources": "Àwọn Ohun Èlò",
    "home.footer.connect": "Bá Wa Sopọ̀",
    "home.footer.home": "Ilé",
    "home.footer.about": "Nípa IPCR",
    "home.footer.research": "Àwọn Ìtẹ̀jáde Ìwádìí",
    "home.footer.careers": "Àwọn Iṣẹ́",
    "home.footer.map": "Máàpù Ìpọnjú Nàìjíríà",
    "home.footer.toolkit": "Kítì Ìkọ́ Aláfíà",
    "home.footer.policy": "Àwọn Ìwé Ìlànà",
    "home.footer.media": "Gbùngbùn Mídíà",
    "home.footer.newsletter": "Forúkọsílẹ̀ fún ìmúdójúìwọ̀n nípa àwọn ètò aláfíà àti iṣẹ́lẹ̀ tó ń bọ.",
    "home.footer.subscribe": "Forúkọsílẹ̀",
    "home.footer.rights": "Gbogbo ẹ̀tọ́ ni a dáàbò bo.",

    "layout.sidebar.mainNavigation": "Ìtọ́sọ́nà Àkọ́kọ́",
    "layout.sidebar.aiAssistant": "Olùrànlọ́wọ́ AI",
    "layout.sidebar.dataCollection": "Ìkójọ & Ìṣèdáta",
    "layout.sidebar.riskAssessment": "Ìṣírò Ewú",
    "layout.sidebar.responseManagement": "Ìṣàkóso Ìdáhùn",
    "layout.sidebar.communications": "Ìbánisọ̀rọ̀",
    "layout.sidebar.socialMedia": "Mídíà Àwùjọ",
    "layout.sidebar.administration": "Ìṣàkóso",
    "layout.sidebar.externalLinks": "Àwọn Ọ̀nà Ita",
    "layout.sidebar.ipcrWebsite": "Ojú-ọ̀nà IPCR",
    "layout.sidebar.official": "Ọ́fíṣialì",
    "layout.sidebar.tagline": "Ìkìlọ̀ Tẹ́lẹ̀ & Ìdáhùn Kánkán",

    "nav.dashboard": "Dásíbọ́ọ̀du",
    "nav.executiveDashboard": "Dásíbọ́ọ̀du Alákóso",
    "nav.situationRoom": "Yàrá Ìpò",
    "nav.crisisManagement": "Ìṣàkóso Ìpọnjú",
    "nav.nigeriaCrisisMap": "Máàpù Ìpọnjú Nàìjíríà",
    "nav.aiAnalysis": "Ìtúpalẹ̀ AI",
    "nav.predictiveModels": "Àwọn Àpẹẹrẹ Àsọtẹ́lẹ̀",
    "nav.responseAdvisor": "Olùmọ̀ràn Ìdáhùn",
    "nav.dataCollection": "Ìkójọ Dátà",
    "nav.dataProcessing": "Ìṣèdáta & Ìtúpalẹ̀",
    "nav.riskAssessment": "Ìṣírò Ewú",
    "nav.visualization": "Àfihàn",
    "nav.alertsNotifications": "Ìkìlọ̀ & Ìfitónilétí",
    "nav.caseManagement": "Ìṣàkóso Ọ̀ràn",
    "nav.smsManagement": "Ìṣàkóso SMS",
    "nav.composeSms": "Kọ SMS",
    "nav.smsTemplates": "Àpẹrẹ SMS",
    "nav.messagingLogs": "Ìkọ̀wé Ifiranṣẹ",
    "nav.socialDashboard": "Dásíbọ́ọ̀du Mídíà",
    "nav.auditLogs": "Ìkọ̀wé Àyẹ̀wò",
    "nav.enterpriseSettings": "Àwọn Sètìngì Ilé-iṣẹ́",
    "nav.userManagement": "Ìṣàkóso Olùlò",
    "nav.integrations": "Ìṣọ̀kan",
    "nav.reporting": "Ìròyìn",
    "nav.settings": "Àwọn Sètìngì",

    "layout.footer.system": "Ètò Ìkìlọ̀ Tẹ́lẹ̀ àti Ìdáhùn Kánkán",
    "layout.footer.designedBy": "A ṣe é nípasẹ̀",
    "layout.footer.privacy": "Ìlànà Ìkọ̀kọ̀",
    "layout.footer.terms": "Àwọn Òfin Iṣẹ́",
    "layout.footer.help": "Ile-iṣẹ́ Ìrànlọ́wọ́",

    "settings.system.title": "Àwọn Sètìngì Ètò",
    "settings.system.description": "Ṣètò àwọn àyànfẹ́ ètò",
    "settings.system.language": "Èdè",
    "settings.system.languagePlaceholder": "Yan èdè",
    "settings.system.languageHelp": "Èdè tí a fi ń lò gbogbo ètò",
  },
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "language";

function readStoredLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "ig" || stored === "ha" || stored === "yo" || stored === "en") return stored;
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      return readStoredLanguage();
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore
    }
  }, [language]);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
  };

  const t = useMemo(() => {
    return (key: string) => {
      const langDict = translations[language];
      return langDict[key] ?? translations.en[key] ?? key;
    };
  }, [language]);

  const value = useMemo<I18nContextValue>(() => ({ language, setLanguage, t }), [language, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
