import { db } from './db';
import { incidents } from '@shared/schema';

// Nigerian states and their coordinates
const nigerianLocations = [
  // North Central
  { state: 'FCT', lga: 'Abuja Municipal', region: 'North Central', coords: { lat: 9.0765, lng: 7.3986 } },
  { state: 'FCT', lga: 'Gwagwalada', region: 'North Central', coords: { lat: 8.9428, lng: 7.0839 } },
  { state: 'Benue', lga: 'Makurdi', region: 'North Central', coords: { lat: 7.7322, lng: 8.5391 } },
  { state: 'Benue', lga: 'Gboko', region: 'North Central', coords: { lat: 7.3230, lng: 9.0007 } },
  { state: 'Kogi', lga: 'Lokoja', region: 'North Central', coords: { lat: 7.7974, lng: 6.7406 } },
  { state: 'Kwara', lga: 'Ilorin', region: 'North Central', coords: { lat: 8.4966, lng: 4.5426 } },
  { state: 'Nasarawa', lga: 'Lafia', region: 'North Central', coords: { lat: 8.4939, lng: 8.5211 } },
  { state: 'Niger', lga: 'Minna', region: 'North Central', coords: { lat: 9.6138, lng: 6.5569 } },
  { state: 'Plateau', lga: 'Jos North', region: 'North Central', coords: { lat: 9.8965, lng: 8.8583 } },
  { state: 'Plateau', lga: 'Jos South', region: 'North Central', coords: { lat: 9.8675, lng: 8.8961 } },

  // North East
  { state: 'Adamawa', lga: 'Yola North', region: 'North East', coords: { lat: 9.2094, lng: 12.4807 } },
  { state: 'Bauchi', lga: 'Bauchi', region: 'North East', coords: { lat: 10.3158, lng: 9.8442 } },
  { state: 'Borno', lga: 'Maiduguri', region: 'North East', coords: { lat: 11.8311, lng: 13.1510 } },
  { state: 'Borno', lga: 'Bama', region: 'North East', coords: { lat: 11.5204, lng: 13.6896 } },
  { state: 'Gombe', lga: 'Gombe', region: 'North East', coords: { lat: 10.2897, lng: 11.1689 } },
  { state: 'Taraba', lga: 'Jalingo', region: 'North East', coords: { lat: 8.8932, lng: 11.3598 } },
  { state: 'Yobe', lga: 'Damaturu', region: 'North East', coords: { lat: 11.7471, lng: 11.9609 } },

  // North West
  { state: 'Jigawa', lga: 'Dutse', region: 'North West', coords: { lat: 11.7566, lng: 9.3386 } },
  { state: 'Kaduna', lga: 'Kaduna North', region: 'North West', coords: { lat: 10.5167, lng: 7.4333 } },
  { state: 'Kaduna', lga: 'Zaria', region: 'North West', coords: { lat: 11.0667, lng: 7.7000 } },
  { state: 'Kano', lga: 'Kano Municipal', region: 'North West', coords: { lat: 12.0022, lng: 8.5920 } },
  { state: 'Kano', lga: 'Nassarawa', region: 'North West', coords: { lat: 11.9833, lng: 8.5333 } },
  { state: 'Katsina', lga: 'Katsina', region: 'North West', coords: { lat: 12.9908, lng: 7.6008 } },
  { state: 'Kebbi', lga: 'Birnin Kebbi', region: 'North West', coords: { lat: 12.4539, lng: 4.1975 } },
  { state: 'Sokoto', lga: 'Sokoto North', region: 'North West', coords: { lat: 13.0622, lng: 5.2339 } },
  { state: 'Zamfara', lga: 'Gusau', region: 'North West', coords: { lat: 12.1704, lng: 6.6642 } },

  // South East
  { state: 'Abia', lga: 'Aba North', region: 'South East', coords: { lat: 5.1215, lng: 7.3698 } },
  { state: 'Abia', lga: 'Umuahia', region: 'South East', coords: { lat: 5.5250, lng: 7.4950 } },
  { state: 'Anambra', lga: 'Awka', region: 'South East', coords: { lat: 6.2104, lng: 7.0719 } },
  { state: 'Anambra', lga: 'Onitsha', region: 'South East', coords: { lat: 6.1495, lng: 6.7882 } },
  { state: 'Ebonyi', lga: 'Abakaliki', region: 'South East', coords: { lat: 6.3249, lng: 8.1137 } },
  { state: 'Enugu', lga: 'Enugu North', region: 'South East', coords: { lat: 6.4402, lng: 7.4994 } },
  { state: 'Enugu', lga: 'Nsukka', region: 'South East', coords: { lat: 6.8567, lng: 7.3958 } },
  { state: 'Imo', lga: 'Owerri', region: 'South East', coords: { lat: 5.4840, lng: 7.0351 } },

  // South South
  { state: 'Akwa Ibom', lga: 'Uyo', region: 'South South', coords: { lat: 5.0378, lng: 7.9085 } },
  { state: 'Bayelsa', lga: 'Yenagoa', region: 'South South', coords: { lat: 4.9267, lng: 6.2676 } },
  { state: 'Cross River', lga: 'Calabar', region: 'South South', coords: { lat: 4.9517, lng: 8.3417 } },
  { state: 'Delta', lga: 'Warri', region: 'South South', coords: { lat: 5.5167, lng: 5.7500 } },
  { state: 'Delta', lga: 'Asaba', region: 'South South', coords: { lat: 6.1987, lng: 6.7337 } },
  { state: 'Edo', lga: 'Benin City', region: 'South South', coords: { lat: 6.3350, lng: 5.6037 } },
  { state: 'Rivers', lga: 'Port Harcourt', region: 'South South', coords: { lat: 4.8156, lng: 7.0498 } },
  { state: 'Rivers', lga: 'Obio-Akpor', region: 'South South', coords: { lat: 4.8896, lng: 6.9569 } },

  // South West
  { state: 'Ekiti', lga: 'Ado-Ekiti', region: 'South West', coords: { lat: 7.6211, lng: 5.2200 } },
  { state: 'Lagos', lga: 'Lagos Island', region: 'South West', coords: { lat: 6.4541, lng: 3.3947 } },
  { state: 'Lagos', lga: 'Ikeja', region: 'South West', coords: { lat: 6.5964, lng: 3.3425 } },
  { state: 'Lagos', lga: 'Surulere', region: 'South West', coords: { lat: 6.4969, lng: 3.3614 } },
  { state: 'Ogun', lga: 'Abeokuta', region: 'South West', coords: { lat: 7.1475, lng: 3.3619 } },
  { state: 'Ondo', lga: 'Akure', region: 'South West', coords: { lat: 7.2571, lng: 5.2058 } },
  { state: 'Osun', lga: 'Osogbo', region: 'South West', coords: { lat: 7.7667, lng: 4.5667 } },
  { state: 'Oyo', lga: 'Ibadan North', region: 'South West', coords: { lat: 7.3775, lng: 3.9470 } },
  { state: 'Oyo', lga: 'Ogbomoso', region: 'South West', coords: { lat: 8.1335, lng: 4.2407 } },
];

// Incident templates with variety
const incidentTemplates = [
  // Violence & Conflict
  { category: 'violence', title: 'Armed Robbery at {location}', description: 'Armed robbers attacked {location}, stealing valuables and causing panic among residents. Multiple victims reported injuries.', severity: 'high' },
  { category: 'violence', title: 'Communal Clash in {location}', description: 'Violent confrontation between two communities in {location} over land disputes. Several casualties reported.', severity: 'high' },
  { category: 'violence', title: 'Cult Clash in {location}', description: 'Rival cult groups engaged in violent confrontation in {location}, causing fear among residents.', severity: 'medium' },
  { category: 'violence', title: 'Domestic Violence Incident', description: 'Domestic violence case reported in {location}. Victim received medical attention.', severity: 'medium' },
  { category: 'violence', title: 'Bar Brawl in {location}', description: 'Fight broke out at a bar in {location}, resulting in injuries and property damage.', severity: 'low' },
  
  // Terrorism & Kidnapping
  { category: 'terrorism', title: 'Terrorist Attack in {location}', description: 'Suspected terrorists attacked {location}, causing multiple casualties and widespread destruction.', severity: 'critical' },
  { category: 'terrorism', title: 'IED Explosion in {location}', description: 'Improvised explosive device detonated in {location}, causing casualties and panic.', severity: 'critical' },
  { category: 'kidnapping', title: 'School Kidnapping in {location}', description: 'Armed group abducted students from a school in {location}. Security forces mobilized.', severity: 'critical' },
  { category: 'kidnapping', title: 'Highway Kidnapping near {location}', description: 'Travelers kidnapped on highway near {location}. Ransom demands made.', severity: 'high' },
  { category: 'kidnapping', title: 'Businessman Kidnapped in {location}', description: 'Local businessman abducted from his residence in {location}.', severity: 'high' },
  
  // Protests & Civil Unrest
  { category: 'protest', title: 'Student Protest in {location}', description: 'University students staged protest in {location} over tuition fee increases.', severity: 'low' },
  { category: 'protest', title: 'Workers Strike in {location}', description: 'Workers in {location} went on strike demanding better wages and working conditions.', severity: 'medium' },
  { category: 'protest', title: 'Anti-Government Protest', description: 'Citizens in {location} protested against government policies. Police deployed to maintain order.', severity: 'medium' },
  { category: 'protest', title: 'Market Traders Protest', description: 'Market traders in {location} protested against new taxation policies.', severity: 'low' },
  
  // Natural Disasters
  { category: 'natural_disaster', title: 'Flooding in {location}', description: 'Heavy rainfall caused severe flooding in {location}, displacing hundreds of families.', severity: 'high' },
  { category: 'natural_disaster', title: 'Erosion Threat in {location}', description: 'Severe erosion threatening homes and infrastructure in {location}.', severity: 'medium' },
  { category: 'natural_disaster', title: 'Windstorm Damage in {location}', description: 'Strong windstorm destroyed houses and properties in {location}.', severity: 'medium' },
  { category: 'natural_disaster', title: 'Drought Conditions in {location}', description: 'Prolonged drought affecting agriculture and water supply in {location}.', severity: 'medium' },
  
  // Infrastructure
  { category: 'infrastructure', title: 'Building Collapse in {location}', description: 'Multi-story building collapsed in {location}, trapping several people.', severity: 'critical' },
  { category: 'infrastructure', title: 'Bridge Collapse near {location}', description: 'Major bridge collapsed near {location}, disrupting transportation.', severity: 'high' },
  { category: 'infrastructure', title: 'Power Grid Failure in {location}', description: 'Major power outage affecting {location} due to grid failure.', severity: 'medium' },
  { category: 'infrastructure', title: 'Water Pipeline Burst in {location}', description: 'Major water pipeline burst in {location}, causing water shortage.', severity: 'medium' },
  { category: 'infrastructure', title: 'Road Accident in {location}', description: 'Multiple vehicle accident on highway near {location} with casualties.', severity: 'high' },
  { category: 'infrastructure', title: 'Fire Outbreak at Market', description: 'Major fire destroyed shops at {location} market, causing significant losses.', severity: 'high' },
  
  // Economic
  { category: 'economic', title: 'Bank Robbery in {location}', description: 'Armed robbers attacked bank in {location}, making away with cash.', severity: 'high' },
  { category: 'economic', title: 'Market Fire in {location}', description: 'Fire outbreak destroyed goods worth millions at {location} market.', severity: 'high' },
  { category: 'economic', title: 'Fuel Scarcity in {location}', description: 'Severe fuel scarcity causing long queues and business disruption in {location}.', severity: 'medium' },
  { category: 'economic', title: 'Food Price Hike in {location}', description: 'Sharp increase in food prices causing hardship for residents of {location}.', severity: 'low' },
  
  // Political
  { category: 'political', title: 'Political Rally Violence in {location}', description: 'Violence erupted during political rally in {location}, several injured.', severity: 'high' },
  { category: 'political', title: 'Election Violence in {location}', description: 'Clashes between political supporters in {location} during elections.', severity: 'high' },
  { category: 'political', title: 'Political Assassination Attempt', description: 'Assassination attempt on political figure in {location}.', severity: 'critical' },
  
  // SGBV
  { category: 'sgbv', title: 'Sexual Assault Case in {location}', description: 'Sexual assault case reported in {location}. Suspect arrested.', severity: 'high' },
  { category: 'sgbv', title: 'Domestic Abuse in {location}', description: 'Domestic abuse case involving gender-based violence in {location}.', severity: 'medium' },
  { category: 'sgbv', title: 'Child Abuse Case in {location}', description: 'Child abuse case reported in {location}. Child welfare services involved.', severity: 'high' },
  
  // Conflict
  { category: 'conflict', title: 'Farmer-Herder Clash in {location}', description: 'Violent clash between farmers and herders in {location} over grazing rights.', severity: 'high' },
  { category: 'conflict', title: 'Ethnic Tension in {location}', description: 'Rising ethnic tensions in {location} following recent incidents.', severity: 'medium' },
  { category: 'conflict', title: 'Religious Conflict in {location}', description: 'Religious conflict erupted in {location}, requiring security intervention.', severity: 'high' },
  { category: 'conflict', title: 'Land Dispute in {location}', description: 'Violent land dispute between families in {location}.', severity: 'medium' },
];

// Additional specific incidents
const specificIncidents = [
  { category: 'violence', title: 'Prison Break Attempt', location: 'Kuje Prison, FCT', description: 'Inmates attempted to break out of Kuje Prison, security forces responded.', severity: 'critical' },
  { category: 'terrorism', title: 'Boko Haram Attack', location: 'Borno State', description: 'Boko Haram militants attacked villages in Borno State.', severity: 'critical' },
  { category: 'infrastructure', title: 'Airport Security Breach', location: 'Murtala Muhammed Airport, Lagos', description: 'Security breach at Lagos airport caused temporary shutdown.', severity: 'high' },
  { category: 'natural_disaster', title: 'Cholera Outbreak', location: 'Multiple LGAs', description: 'Cholera outbreak affecting multiple communities.', severity: 'critical' },
  { category: 'economic', title: 'Oil Pipeline Vandalism', location: 'Rivers State', description: 'Oil pipeline vandalized causing environmental damage and economic loss.', severity: 'high' },
];

async function seedIncidents() {
  console.log('Starting to seed incidents...');
  
  const incidentsToCreate = [];
  let count = 0;

  // Generate incidents from templates
  for (let i = 0; i < 115; i++) {
    const template = incidentTemplates[i % incidentTemplates.length];
    const location = nigerianLocations[Math.floor(Math.random() * nigerianLocations.length)];
    
    const locationName = `${location.lga}, ${location.state}`;
    const title = template.title.replace('{location}', locationName);
    const description = template.description.replace(/{location}/g, locationName);
    
    // Vary the dates over the past 6 months
    const daysAgo = Math.floor(Math.random() * 180);
    const reportedAt = new Date();
    reportedAt.setDate(reportedAt.getDate() - daysAgo);
    
    // Vary status
    const statuses = ['active', 'active', 'active', 'resolved', 'pending'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Vary verification status
    const verificationStatuses = ['verified', 'verified', 'partially_verified', 'unverified'];
    const verificationStatus = verificationStatuses[Math.floor(Math.random() * verificationStatuses.length)];
    
    // Random impacted population
    const impactedPopulation = Math.floor(Math.random() * 50000) + 100;
    
    // Random reporting method
    const reportingMethods = ['text', 'text', 'text', 'voice', 'sms', 'web_form'];
    const reportingMethod = reportingMethods[Math.floor(Math.random() * reportingMethods.length)];
    
    incidentsToCreate.push({
      title,
      description,
      location: locationName,
      region: location.region,
      state: location.state,
      lga: location.lga,
      severity: template.severity,
      status,
      category: template.category,
      reportedBy: 1, // Assuming admin user with ID 1
      coordinates: JSON.stringify(location.coords),
      impactedPopulation,
      verificationStatus,
      reportingMethod,
      reportedAt,
    });
    
    count++;
  }

  // Add specific incidents
  for (const incident of specificIncidents) {
    const location = nigerianLocations[Math.floor(Math.random() * nigerianLocations.length)];
    
    const daysAgo = Math.floor(Math.random() * 90);
    const reportedAt = new Date();
    reportedAt.setDate(reportedAt.getDate() - daysAgo);
    
    incidentsToCreate.push({
      title: incident.title,
      description: incident.description,
      location: incident.location,
      region: location.region,
      state: location.state,
      lga: location.lga || 'N/A',
      severity: incident.severity,
      status: 'active',
      category: incident.category,
      reportedBy: 1,
      coordinates: JSON.stringify(location.coords),
      impactedPopulation: Math.floor(Math.random() * 100000) + 500,
      verificationStatus: 'verified',
      reportingMethod: 'text',
      reportedAt,
    });
    
    count++;
  }

  // Insert all incidents
  console.log(`Inserting ${count} incidents into database...`);
  
  try {
    await db.insert(incidents).values(incidentsToCreate);
    console.log(`✅ Successfully seeded ${count} incidents!`);
    
    // Print summary
    const categoryCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    const regionCounts: Record<string, number> = {};
    
    incidentsToCreate.forEach(inc => {
      categoryCounts[inc.category] = (categoryCounts[inc.category] || 0) + 1;
      severityCounts[inc.severity] = (severityCounts[inc.severity] || 0) + 1;
      regionCounts[inc.region] = (regionCounts[inc.region] || 0) + 1;
    });
    
    console.log('\n📊 Summary:');
    console.log('\nBy Category:');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
    
    console.log('\nBy Severity:');
    Object.entries(severityCounts).forEach(([sev, count]) => {
      console.log(`  ${sev}: ${count}`);
    });
    
    console.log('\nBy Region:');
    Object.entries(regionCounts).forEach(([reg, count]) => {
      console.log(`  ${reg}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding incidents:', error);
    throw error;
  }
}

// Run the seed function
seedIncidents()
  .then(() => {
    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
