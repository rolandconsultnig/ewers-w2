/**
 * Pre-configured Nigerian news sources focused on conflict, security, and crisis reporting
 * These sources can be seeded into the database for real-time news monitoring
 */

export const nigerianNewsSources = [
  {
    name: "Premium Times Nigeria - Security",
    type: "news_media",
    description: "Leading Nigerian newspaper covering security, conflict, and crisis news across all regions",
    apiEndpoint: "https://www.premiumtimesng.com/category/news/security/feed",
    region: "Nigeria",
    frequency: "hourly",
    dataFormat: "xml",
    status: "active",
    metadata: {
      category: "security",
      language: "en",
      coverage: "national",
      rssEnabled: true
    }
  },
  {
    name: "Vanguard Nigeria - Security",
    type: "news_media",
    description: "Major Nigerian daily newspaper with comprehensive security and conflict coverage",
    apiEndpoint: "https://www.vanguardngr.com/category/news/security/feed",
    region: "Nigeria",
    frequency: "hourly",
    dataFormat: "xml",
    status: "active",
    metadata: {
      category: "security",
      language: "en",
      coverage: "national",
      rssEnabled: true
    }
  },
  {
    name: "The Guardian Nigeria - Security",
    type: "news_media",
    description: "Reputable Nigerian newspaper focusing on security, politics, and national issues",
    apiEndpoint: "https://guardian.ng/category/news/national/feed",
    region: "Nigeria",
    frequency: "hourly",
    dataFormat: "xml",
    status: "active",
    metadata: {
      category: "national_news",
      language: "en",
      coverage: "national",
      rssEnabled: true
    }
  },
  {
    name: "Daily Trust - Security & Crisis",
    type: "news_media",
    description: "Northern Nigeria-focused newspaper with strong coverage of Boko Haram, banditry, and farmer-herder conflicts",
    apiEndpoint: "https://dailytrust.com/category/news/security/feed",
    region: "Nigeria",
    frequency: "hourly",
    dataFormat: "xml",
    status: "active",
    metadata: {
      category: "security",
      language: "en",
      coverage: "national",
      focus: "northern_nigeria",
      rssEnabled: true
    }
  },
  {
    name: "Punch Nigeria - Metro & Crime",
    type: "news_media",
    description: "Popular Nigerian newspaper covering crime, violence, and urban conflicts",
    apiEndpoint: "https://punchng.com/topics/crime/feed",
    region: "Nigeria",
    frequency: "hourly",
    dataFormat: "xml",
    status: "active",
    metadata: {
      category: "crime",
      language: "en",
      coverage: "national",
      rssEnabled: true
    }
  },
  {
    name: "Sahara Reporters",
    type: "news_media",
    description: "Investigative journalism platform covering corruption, security issues, and human rights violations in Nigeria",
    apiEndpoint: "https://saharareporters.com/latest/feed",
    region: "Nigeria",
    frequency: "hourly",
    dataFormat: "xml",
    status: "active",
    metadata: {
      category: "investigative",
      language: "en",
      coverage: "national",
      rssEnabled: true
    }
  },
  {
    name: "Channels TV News",
    type: "news_media",
    description: "Leading Nigerian broadcast news covering breaking security incidents and conflicts",
    apiEndpoint: "https://www.channelstv.com/feed",
    region: "Nigeria",
    frequency: "real-time",
    dataFormat: "xml",
    status: "active",
    metadata: {
      category: "broadcast",
      language: "en",
      coverage: "national",
      rssEnabled: true
    }
  },
  {
    name: "This Day Live - Security",
    type: "news_media",
    description: "Nigerian newspaper with focus on national security, terrorism, and political conflicts",
    apiEndpoint: "https://www.thisdaylive.com/index.php/category/news/feed",
    region: "Nigeria",
    frequency: "hourly",
    dataFormat: "xml",
    status: "active",
    metadata: {
      category: "news",
      language: "en",
      coverage: "national",
      rssEnabled: true
    }
  },
  {
    name: "The Cable - Security & Politics",
    type: "news_media",
    description: "Online Nigerian news platform covering security, politics, and governance issues",
    apiEndpoint: "https://www.thecable.ng/feed",
    region: "Nigeria",
    frequency: "hourly",
    dataFormat: "xml",
    status: "active",
    metadata: {
      category: "politics_security",
      language: "en",
      coverage: "national",
      rssEnabled: true
    }
  },
  {
    name: "Leadership Nigeria - Security",
    type: "news_media",
    description: "Nigerian newspaper focusing on governance, security, and conflict resolution",
    apiEndpoint: "https://leadership.ng/category/news/feed",
    region: "Nigeria",
    frequency: "hourly",
    dataFormat: "xml",
    status: "active",
    metadata: {
      category: "news",
      language: "en",
      coverage: "national",
      rssEnabled: true
    }
  },
  {
    name: "ACLED Nigeria Data",
    type: "ngo_report",
    description: "Armed Conflict Location & Event Data Project - Real-time conflict data for Nigeria",
    apiEndpoint: "https://api.acleddata.com/acled/read?country=Nigeria&limit=100",
    apiKey: "ACLED_API_KEY_REQUIRED",
    region: "Nigeria",
    frequency: "daily",
    dataFormat: "json",
    status: "active",
    metadata: {
      category: "conflict_data",
      language: "en",
      coverage: "national",
      requiresAuth: true,
      dataType: "structured"
    }
  },
  {
    name: "Nigeria Security Tracker (CFR)",
    type: "ngo_report",
    description: "Council on Foreign Relations Nigeria Security Tracker - Weekly conflict casualty data",
    apiEndpoint: "https://www.cfr.org/nigeria/nigeria-security-tracker/feed",
    region: "Nigeria",
    frequency: "weekly",
    dataFormat: "xml",
    status: "active",
    metadata: {
      category: "conflict_tracking",
      language: "en",
      coverage: "national",
      dataType: "casualty_data",
      rssEnabled: true
    }
  },
  {
    name: "HumAngle - Conflict & Humanitarian",
    type: "news_media",
    description: "Specialized media covering conflict, terrorism, and humanitarian crises in Nigeria and West Africa",
    apiEndpoint: "https://humanglemedia.com/feed",
    region: "Nigeria",
    frequency: "daily",
    dataFormat: "xml",
    status: "active",
    metadata: {
      category: "conflict_humanitarian",
      language: "en",
      coverage: "national",
      focus: "northeast_nigeria",
      rssEnabled: true
    }
  },
  {
    name: "GDELT Nigeria Conflict Events",
    type: "satellite",
    description: "Global Database of Events, Language, and Tone - Nigeria conflict monitoring",
    apiEndpoint: "https://api.gdeltproject.org/api/v2/doc/doc?query=Nigeria%20conflict&mode=artlist&format=json",
    region: "Nigeria",
    frequency: "real-time",
    dataFormat: "json",
    status: "active",
    metadata: {
      category: "global_events",
      language: "multi",
      coverage: "national",
      dataType: "event_detection"
    }
  },
  {
    name: "Nigeria Info FM News",
    type: "news_media",
    description: "Radio news network covering real-time incidents across Nigerian cities",
    apiEndpoint: "https://www.nigeriainfofm.com/feed",
    region: "Nigeria",
    frequency: "real-time",
    dataFormat: "xml",
    status: "active",
    metadata: {
      category: "broadcast",
      language: "en",
      coverage: "multi_city",
      rssEnabled: true
    }
  }
];
