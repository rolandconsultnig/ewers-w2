# IPCR Early Warning & Early Response System

An advanced Early Warning & Early Response System leveraging Natural Language Processing (NLP) for comprehensive threat detection and risk assessment across multiple channels in Nigeria.

## Features

- React.js frontend with TypeScript and Leaflet for geospatial mapping
- Enhanced map visualization with improved marker rendering
- Modular NLP service with intelligent text processing
- Real-time geospatial incident mapping and analysis
- Multi-channel text classification with advanced summarization
- Comprehensive API integration with enhanced error handling
- Social media platform integrations (Twilio, Twitter/X, Facebook, Instagram)

## Quick Start

### Prerequisites

- Node.js (v16 or newer)
- PostgreSQL database
- Git

### Local Development

1. Clone the repository
```bash
git clone https://github.com/yourusername/ipcr-ewers.git
cd ipcr-ewers
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory with the following variables:
```
DATABASE_URL=postgresql://user:password@localhost:5432/ipcr
SESSION_SECRET=your_session_secret
NODE_ENV=development
```

In development, the app uses an **in-memory session store** by default (no Postgres session table required). To use Postgres for sessions in dev, set `USE_PG_SESSION=1`.

4. Start the development server
```bash
npm run dev
```

5. The application will be available at `http://localhost:5000`

### Using Docker (Optional)

1. Build and run with Docker Compose
```bash
docker-compose up -d
```

2. The application will be available at `http://localhost:5000`

## One-Click Deployment to AWS

For easy deployment to AWS, we've created automated deployment scripts.

### Option 1: Deploy with AWS Elastic Beanstalk (Recommended)

```bash
# Make the script executable
chmod +x deploy-eb.sh

# Run the script
./deploy-eb.sh
```

Follow the on-screen instructions to deploy to your desired environment (dev, staging, or production).

### Option 2: Deploy with AWS CloudFormation

```bash
# Make the script executable
chmod +x deploy.sh

# Run the script
./deploy.sh
```

For more deployment options and detailed instructions, see the [DEPLOYMENT.md](./DEPLOYMENT.md) file.

## Configuring External Services

### Social Media Integration

For each social media platform, obtain API keys and configure them as environment variables:

- Twitter/X: `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_SECRET`
- Facebook: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_ACCESS_TOKEN`
- Instagram: `INSTAGRAM_USERNAME`, `INSTAGRAM_PASSWORD`

### SMS Integration

Configure Twilio with these environment variables:
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

## Database Migrations

When `DATABASE_URL` is set, you can run the responder workflow migrations (schema + backfill):

```bash
# Run schema migration (incident_discussions, routing columns, response_teams.response_category, etc.)
npm run db:migrate:responder-schema

# Backfill response_teams.response_category and incidents.processing_status for existing rows
npm run db:migrate:responder-backfill

# Or run both in order
npm run db:migrate:responder
```

## Project Structure

- `/client` - Frontend React application
- `/server` - Backend Express API
- `/shared` - Shared types and schemas
- `/migrations` - Database migration scripts

## License

This project is proprietary and confidential.

## Acknowledgments

Designed by [afrinict.com](https://afrinict.com)