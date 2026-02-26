/**
 * Seed recent Nigeria issues (Feb 2025) as incidents so they appear in
 * the crisis map, case management, and dashboards.
 */
import "dotenv/config";
import { pool, db } from "../server/db";
import { incidents, users } from "../shared/schema";
import { eq } from "drizzle-orm";

const NIGERIA_RECENT_ISSUES = [
  {
    title: "Civilian deaths in military airstrike targeting rebels",
    description: "Several civilians were killed in a military airstrike targeting rebels in Nigeria, according to officials. The incident has drawn concern over collateral damage in counter-insurgency operations.",
    location: "Borno State",
    region: "Nigeria",
    state: "Borno",
    severity: "high",
    category: "violence",
    status: "active",
    verificationStatus: "verified",
    isPinned: true,
  },
  {
    title: "At least 22 soldiers killed in insurgent counter-assault (Borno)",
    description: "Insurgents countered military operations with IEDs and suicide bombers. At least 22 Nigerian soldiers killed and several wounded. Islamic State claimed responsibility for attack on army base in remote Borno.",
    location: "Borno State (remote base)",
    region: "Nigeria",
    state: "Borno",
    severity: "critical",
    category: "terrorism",
    status: "active",
    verificationStatus: "verified",
    isPinned: true,
  },
  {
    title: "Mass kidnapping in Zamfara – 200+ abducted (Maru LGA)",
    description: "At least 200 people, mostly women and children, abducted in Maru LGA. Surge in kidnappings in Zamfara with Operation Fansan Yamma targeting bandit leaders.",
    location: "Maru LGA",
    region: "Nigeria",
    state: "Zamfara",
    lga: "Maru",
    severity: "critical",
    category: "kidnapping",
    status: "active",
    verificationStatus: "verified",
    impactedPopulation: 200,
  },
  {
    title: "Kidnapping in Gana town, Zamfara – 46 abducted",
    description: "46 people abducted in Gana town, Zamfara State. Part of broader wave of banditry and kidnappings in the northwest.",
    location: "Gana town",
    region: "Nigeria",
    state: "Zamfara",
    severity: "high",
    category: "kidnapping",
    status: "active",
    verificationStatus: "verified",
    impactedPopulation: 46,
  },
  {
    title: "Armed bandits attack Edu community, Kaduna – 3,042 displaced",
    description: "Armed bandits attacked Edu community in Kaduna State (30 Jan 2025). IOM reports 3,042 individuals displaced.",
    location: "Edu community",
    region: "Nigeria",
    state: "Kaduna",
    severity: "high",
    category: "violence",
    status: "active",
    verificationStatus: "verified",
    impactedPopulation: 3042,
  },
  {
    title: "Farmer-herder clash in Benue – 1 fatality, 37 displaced",
    description: "Farmer-herders clash in Benue State (31 Jan 2025). One fatality and 37 people displaced. IOM Flash Report.",
    location: "Benue State",
    region: "Nigeria",
    state: "Benue",
    severity: "medium",
    category: "conflict",
    status: "active",
    verificationStatus: "verified",
    impactedPopulation: 37,
  },
  {
    title: "Nigeria forex reserves decline – naira stability at risk",
    description: "Foreign exchange reserves have fallen for 33 consecutive days, down $2.2B from January peak. Central bank support for naira raises concerns over currency stability (Bloomberg, Feb 2025).",
    location: "National",
    region: "Nigeria",
    state: undefined,
    severity: "medium",
    category: "economic",
    status: "active",
    verificationStatus: "verified",
  },
  {
    title: "Shell divestment – oil production restart in Niger Delta",
    description: "Nigeria moves to restart oil production in the vulnerable Niger Delta region after Shell sold much of its business. Security and stability in the region remain a focus (AP, Feb 2025).",
    location: "Niger Delta",
    region: "Nigeria",
    state: undefined,
    severity: "medium",
    category: "political",
    status: "active",
    verificationStatus: "verified",
  },
  {
    title: "Humanitarian crisis – nearly 8 million in need of assistance",
    description: "ReliefWeb Jan 2025: Nearly 8 million Nigerians require assistance. Women and girls face heightened vulnerability to gender-based violence. Borno IDP camp closures began 31 Jan for durable solutions.",
    location: "North-east / National",
    region: "Nigeria",
    state: "Borno",
    severity: "high",
    category: "political",
    status: "active",
    verificationStatus: "verified",
    impactedPopulation: 8000000,
  },
];

async function seedNigeriaRecentIssues() {
  try {
    const [systemUser] = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
    const reportedBy = systemUser?.id ?? 1;

    let inserted = 0;
    for (const issue of NIGERIA_RECENT_ISSUES) {
      const [existing] = await db
        .select()
        .from(incidents)
        .where(eq(incidents.title, issue.title))
        .limit(1);
      if (existing) continue;

      await db.insert(incidents).values({
        title: issue.title,
        description: issue.description,
        location: issue.location,
        region: issue.region,
        state: issue.state ?? undefined,
        lga: issue.lga ?? undefined,
        severity: issue.severity,
        category: issue.category,
        status: issue.status,
        reportedBy,
        verificationStatus: issue.verificationStatus,
        isPinned: issue.isPinned ?? false,
        impactedPopulation: issue.impactedPopulation ?? undefined,
      });
      inserted++;
    }

    console.log(`Nigeria recent issues: ${inserted} new incident(s) added.`);
  } catch (error) {
    console.error("Error seeding Nigeria recent issues:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedNigeriaRecentIssues();
