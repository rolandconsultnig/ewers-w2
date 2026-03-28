import { storage } from '../storage';
import { db } from '../db';
import { 
  insertCollectedDataSchema, 
  dataSources,
  collectedData
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';

/**
 * Data Source Service
 * 
 * This service is responsible for collecting data from various sources,
 * processing it, and storing it in the database.
 */
export class DataSourceService {
  /**
   * Fetch data from all active sources
   */
  async fetchFromAllSources() {
    try {
      // Get all active data sources
      const sources = await db.select().from(dataSources).where(eq(dataSources.status, 'active'));
      
      if (!sources || sources.length === 0) {
        console.log('No active data sources found');
        return;
      }
      
      // Process each source
      for (const source of sources) {
        try {
          await this.fetchFromSource(source.id);
        } catch (error) {
          console.error(`Error fetching from source ${source.id} (${source.name}):`, error);
        }
      }
    } catch (error) {
      console.error('Error fetching from all sources:', error);
    }
  }
  
  /**
   * Fetch data from a specific source
   */
  async fetchFromSource(sourceId: number) {
    try {
      const source = await db.select().from(dataSources).where(eq(dataSources.id, sourceId)).limit(1);
      
      if (!source || source.length === 0) {
        throw new Error(`Source not found: ${sourceId}`);
      }
      
      const dataSource = source[0];
      
      // Skip if source is not active
      if (dataSource.status !== 'active') {
        console.log(`Source ${dataSource.id} (${dataSource.name}) is not active, skipping`);
        return;
      }
      
      // Fetch data based on source type
      let collectedItems: any[] = [];
      
      switch (dataSource.type) {
        case 'rss':
          collectedItems = await this.fetchFromRSS(dataSource);
          break;
        case 'api':
          collectedItems = await this.fetchFromAPI(dataSource);
          break;
        case 'social':
          collectedItems = await this.fetchFromSocial(dataSource);
          break;
        case 'manual':
          // Manual sources don't fetch automatically
          break;
        default:
          console.log(`Unsupported source type: ${dataSource.type}`);
          return;
      }
      
      // Save collected data to database
      if (collectedItems.length > 0) {
        for (const item of collectedItems) {
          const dataToInsert = {
            sourceId: dataSource.id,
            content: item.content || '',
            region: item.metadata?.region || 'Nigeria',
            location: item.metadata?.location || null,
            coordinates: item.metadata?.coordinates || null,
            status: 'pending'
          };
          
          await db.insert(collectedData).values([dataToInsert]);
        }
        
        console.log(`Collected ${collectedItems.length} items from source ${dataSource.id} (${dataSource.name})`);
      } else {
        console.log(`No data collected from source ${dataSource.id} (${dataSource.name})`);
      }
      
      // Update source lastFetchedAt
      await db.update(dataSources)
        .set({ lastFetchedAt: new Date() })
        .where(eq(dataSources.id, dataSource.id));
      
    } catch (error) {
      console.error(`Error fetching from source ${sourceId}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetch data from RSS feed
   */
  private async fetchFromRSS(source: any) {
    try {
      // Simulated data for Nigeria conflict news
      const conflictData = [
        {
          content: 'Renewed clashes between farmers and herders in Benue State resulted in 5 casualties',
          metadata: {
            title: 'Farmer-Herder Conflict in Benue',
            location: '7.7322,8.5391',
            region: 'North Central',
            severity: 'high',
            date: new Date().toISOString(),
            source: 'RSS Feed',
            url: 'https://example.com/news/1'
          }
        },
        {
          content: 'Suspected insurgents attacked a village in Borno State, security forces responding',
          metadata: {
            title: 'Insurgent Activity in Borno',
            location: '11.8311,13.1510',
            region: 'North East',
            severity: 'high',
            date: new Date().toISOString(),
            source: 'RSS Feed',
            url: 'https://example.com/news/2'
          }
        }
      ];
      
      return conflictData;
    } catch (error) {
      console.error('Error fetching from RSS:', error);
      return [];
    }
  }
  
  /**
   * Fetch data from API
   */
  private async fetchFromAPI(source: any) {
    try {
      // Simulated data for Nigeria conflict from API
      const apiData = [
        {
          content: 'Protests erupted in Lagos over fuel price increases, police deployed to maintain order',
          metadata: {
            title: 'Protests in Lagos',
            location: '6.5244,3.3792',
            region: 'South West',
            severity: 'medium',
            date: new Date().toISOString(),
            source: 'API Feed',
            url: 'https://api.example.com/events/lagos'
          }
        },
        {
          content: 'Oil pipeline vandalism reported in Rivers State, environmental impact being assessed',
          metadata: {
            title: 'Pipeline Vandalism in Rivers',
            location: '4.8156,7.0498',
            region: 'South South',
            severity: 'medium',
            date: new Date().toISOString(),
            source: 'API Feed',
            url: 'https://api.example.com/events/rivers'
          }
        }
      ];
      
      return apiData;
    } catch (error) {
      console.error('Error fetching from API:', error);
      return [];
    }
  }
  
  /**
   * Fetch data from social media
   */
  private async fetchFromSocial(source: any) {
    try {
      // Simulated social media data about Nigerian conflicts
      const socialData = [
        {
          content: 'Reports of inter-communal tensions rising in Jos, Plateau State #NigeriaConflict',
          metadata: {
            title: 'Inter-communal Tension in Jos',
            location: '9.8965,8.8583',
            region: 'North Central',
            severity: 'low',
            date: new Date().toISOString(),
            source: 'Social Media',
            platform: 'Twitter',
            user: '@conflict_watch'
          }
        },
        {
          content: 'Eyewitness accounts of clashes between rival groups in Kaduna, security forces deployed #NigeriaAlert',
          metadata: {
            title: 'Group Clashes in Kaduna',
            location: '10.5167,7.4333',
            region: 'North West',
            severity: 'medium',
            date: new Date().toISOString(),
            source: 'Social Media',
            platform: 'Twitter',
            user: '@security_alert'
          }
        }
      ];
      
      return socialData;
    } catch (error) {
      console.error('Error fetching from social media:', error);
      return [];
    }
  }
  
  /**
   * Add data from manual source
   */
  async addManualData(sourceId: number, data: any) {
    try {
      const source = await db.select().from(dataSources).where(eq(dataSources.id, sourceId)).limit(1);
      
      if (!source || source.length === 0) {
        throw new Error(`Source not found: ${sourceId}`);
      }
      
      const dataSource = source[0];
      
      // Prepare data for insertion
      const dataToInsert = {
        sourceId: dataSource.id,
        content: data.content || '',
        region: data.metadata?.region || 'Nigeria',
        location: data.metadata?.location || null,
        coordinates: data.metadata?.coordinates || null,
        status: 'pending'
      };
      
      // Insert data
      const result = await db.insert(collectedData).values([dataToInsert]).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error adding manual data:', error);
      throw error;
    }
  }
  
  /**
   * Process collected data into incidents
   */
  async processCollectedData() {
    try {
      // Get unprocessed data
      const unprocessedData = await db.select().from(collectedData).where(eq(collectedData.status, 'pending'));
      
      if (!unprocessedData || unprocessedData.length === 0) {
        console.log('No unprocessed data found');
        return;
      }
      
      console.log(`Processing ${unprocessedData.length} collected data items`);
      
      // Process each item
      for (const data of unprocessedData) {
        try {
          await this.processDataItem(data);
        } catch (error) {
          console.error(`Error processing data item ${data.id}:`, error);
          await db.update(collectedData)
            .set({ status: 'failed', processedAt: new Date() })
            .where(eq(collectedData.id, data.id));
        }
      }
    } catch (error) {
      console.error('Error processing collected data:', error);
    }
  }
  
  /**
   * Process a single data item
   */
  private async processDataItem(data: any) {
    try {
      // Extract metadata
      const metadata = data.metadata || {};
      
      // Create incident from data
      if (metadata.title && metadata.location) {
        const incidentData = {
          title: metadata.title,
          description: data.content,
          severity: metadata.severity || 'medium',
          status: 'active',
          region: metadata.region || 'Unknown',
          location: metadata.location,
          reportedBy: 1, // Default to admin user
          category: 'conflict',
          reportedAt: new Date(),
          sourceId: data.sourceId
        };
        
        // Check if similar incident already exists
        // For simplicity, we'll just check by title
        const existingIncidents = await storage.getIncidentsByTitle(metadata.title);
        
        if (!existingIncidents || existingIncidents.length === 0) {
          // Create new incident
          const incident = await storage.createIncident(incidentData);
          console.log(`Created new incident from collected data: ${incident.id}`);
        } else {
          console.log(`Similar incident already exists, skipping: ${metadata.title}`);
        }
      }
      
      // Mark data as processed
      await db.update(collectedData)
        .set({ status: 'processed', processedAt: new Date() })
        .where(eq(collectedData.id, data.id));
      
    } catch (error) {
      console.error('Error processing data item:', error);
      throw error;
    }
  }
}

export const dataSourceService = new DataSourceService();