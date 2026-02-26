/**
 * Seed Election Monitoring with 2027 elections, main parties, and 2026 election news.
 * Run: npm run db:seed:election-2026
 */
import "dotenv/config";
import { pool, db } from "../server/db";
import {
  elections,
  politicalParties,
  electionEvents,
  electionActors,
} from "../shared/schema";
import { eq } from "drizzle-orm";

const PARTIES = [
  { name: "All Progressives Congress", abbreviation: "APC", description: "Ruling party. President Bola Tinubu (73) widely expected to seek re-election (not yet officially declared)." },
  { name: "Peoples Democratic Party", abbreviation: "PDP", description: "Major opposition. Several governors and federal lawmakers have defected to APC. Atiku Abubakar (2023 runner-up) among possible candidates." },
  { name: "Labour Party", abbreviation: "LP", description: "Peter Obi (2023 third-place) announced as challenger for 2027." },
  { name: "New Nigeria Peoples Party", abbreviation: "NNPP", description: "Opposition party with strong presence in Kano and elsewhere." },
];

/** Just concluded: last Saturday (election day). */
const JUST_CONCLUDED_ELECTION = {
  name: "Off-Cycle / By-Elections (Just Concluded)",
  type: "gubernatorial",
  region: "Nigeria",
  state: null as string | null,
  electionDate: "2026-02-21",
  status: "completed",
  description: "Election cycle concluded last Saturday. Off-cycle governorship or by-elections as applicable.",
};

const ELECTIONS_2027 = [
  {
    name: "2027 Presidential & National Assembly Elections",
    type: "presidential",
    region: "Nigeria",
    state: null as string | null,
    electionDate: "2027-02-20",
    status: "pre_election",
    description: "Presidential and National Assembly (Senate and House of Representatives) polls. INEC set February 20, 2027. Date may be adjusted to avoid Ramadan (possible December 2026 or January 2027).",
  },
  {
    name: "2027 Gubernatorial & State Assembly Elections",
    type: "gubernatorial",
    region: "Nigeria",
    state: null as string | null,
    electionDate: "2027-03-06",
    status: "pre_election",
    description: "Governorship and State Houses of Assembly. Not held in eight states (Anambra, Bayelsa, Edo, Ekiti, Imo, Kogi, Ondo, Osun) due to off-cycle elections.",
  },
];

// 2026 election news / milestones (type "other", linked to 2027 Presidential election)
const ELECTION_NEWS_2026 = [
  { title: "INEC announces 2027 election timetable", eventDate: "2026-02-13", description: "Independent National Electoral Commission announced official timetable in February 2026. Presidential & NASS: Feb 20, 2027; Gubernatorial & State Assembly: Mar 6, 2027.", severity: "low" },
  { title: "NASS proposes November 2026 for general elections", eventDate: "2026-02-01", description: "National Assembly proposed holding elections in November 2026, about 185 days before end of current administration (May 2027). INEC later set Feb 2027.", severity: "low" },
  { title: "Electoral Act 2026: electronic transmission retained", eventDate: "2026-02-05", description: "Senate retains electronic transmission of results. BVAS to replace smart card readers. Election notice period reduced from 360 to 300 days; increased penalties for electoral offenses; early voting for election workers.", severity: "low" },
  { title: "Party primaries window (May 22 – June 20, 2026)", eventDate: "2026-05-22", description: "Scheduled period for party primaries ahead of 2027 polls.", severity: "medium" },
  { title: "Nomination form submission (July 14–28, 2026)", eventDate: "2026-07-14", description: "Deadline window for parties to submit nomination forms to INEC.", severity: "medium" },
  { title: "Voter registration (April 2026 – January 2027)", eventDate: "2026-04-01", description: "Continuous voter registration period ahead of 2027 elections.", severity: "low" },
  { title: "Publication of final candidate lists (Nov 15, 2026)", eventDate: "2026-11-15", description: "INEC to publish final list of candidates for presidential and NASS elections.", severity: "medium" },
  { title: "Presidential campaign period opens (Sept 23, 2026)", eventDate: "2026-09-23", description: "Official start of presidential campaign period (runs until Feb 18, 2027).", severity: "medium" },
  { title: "Gubernatorial campaign period (Oct 7, 2026 – Mar 4, 2027)", eventDate: "2026-10-07", description: "Campaign period for governorship and state assembly candidates.", severity: "medium" },
  { title: "Opposition coalition against Tinubu", eventDate: "2026-02-16", description: "Semafor: Nigeria launches election race with poll date. Opposition leaders including Atiku Abubakar and Peter Obi forming coalition; PDP has seen defections to APC. Labour Party's Peter Obi announced as challenger.", severity: "low" },
];

async function seedElection2026() {
  try {
    let partyIds: Record<string, number> = {};
    for (const p of PARTIES) {
      const [existing] = await db.select().from(politicalParties).where(eq(politicalParties.name, p.name)).limit(1);
      if (existing) {
        partyIds[p.abbreviation] = existing.id;
        continue;
      }
      const [inserted] = await db.insert(politicalParties).values({
        name: p.name,
        abbreviation: p.abbreviation,
        description: p.description,
      }).returning();
      if (inserted) partyIds[p.abbreviation] = inserted.id;
    }
    console.log("Political parties:", Object.keys(partyIds).length, "ensured.");

    // Add just-concluded election (last Saturday) so it appears in Recent Elections
    const [existingConcluded] = await db.select().from(elections).where(eq(elections.name, JUST_CONCLUDED_ELECTION.name)).limit(1);
    if (!existingConcluded) {
      await db.insert(elections).values({
        name: JUST_CONCLUDED_ELECTION.name,
        type: JUST_CONCLUDED_ELECTION.type,
        region: JUST_CONCLUDED_ELECTION.region,
        state: JUST_CONCLUDED_ELECTION.state,
        electionDate: JUST_CONCLUDED_ELECTION.electionDate,
        status: JUST_CONCLUDED_ELECTION.status,
        description: JUST_CONCLUDED_ELECTION.description,
      }).returning();
      console.log("Just-concluded election (last Saturday) added to Recent Elections.");
    }

    let presidentialElectionId: number | null = null;
    for (const e of ELECTIONS_2027) {
      const [existing] = await db.select().from(elections).where(eq(elections.name, e.name)).limit(1);
      if (existing) {
        if (e.type === "presidential") presidentialElectionId = existing.id;
        continue;
      }
      const [inserted] = await db.insert(elections).values({
        name: e.name,
        type: e.type,
        region: e.region,
        state: e.state,
        electionDate: e.electionDate,
        status: e.status,
        description: e.description,
      }).returning();
      if (inserted && e.type === "presidential") presidentialElectionId = inserted.id;
    }

    if (!presidentialElectionId) {
      const [pres] = await db.select().from(elections).where(eq(elections.type, "presidential")).limit(1);
      presidentialElectionId = pres?.id ?? null;
    }
    if (!presidentialElectionId) {
      console.warn("No presidential election found; skipping events.");
    } else {
      for (const ev of ELECTION_NEWS_2026) {
        const [existing] = await db.select().from(electionEvents).where(eq(electionEvents.title, ev.title)).limit(1);
        if (existing) continue;
        await db.insert(electionEvents).values({
          electionId: presidentialElectionId,
          title: ev.title,
          description: ev.description,
          type: "other",
          severity: ev.severity,
          eventDate: new Date(ev.eventDate),
        });
      }
      console.log("Election news 2026: events added for election ID", presidentialElectionId);
    }

    // Add INEC as actor for the presidential election if we have it
    if (presidentialElectionId) {
      const inecForElection = await db.select().from(electionActors).where(eq(electionActors.electionId, presidentialElectionId));
      const hasInec = inecForElection.some((a) => a.name === "INEC");
      if (!hasInec) {
        await db.insert(electionActors).values({
          electionId: presidentialElectionId,
          name: "INEC",
          type: "actor",
          role: "Electoral body",
          description: "Independent National Electoral Commission. Announces timetable, conducts voter registration and polls.",
        });
        console.log("INEC actor added for 2027 presidential election.");
      }
    }

    console.log("Election Monitoring 2026 news seed complete.");
  } catch (error) {
    console.error("Error seeding election 2026 news:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedElection2026();
