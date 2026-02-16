#!/bin/bash

# Exit on error
set -e

# Define colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== IPCR Early Warning & Response System - Elastic Beanstalk Deployment ===${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Please install it first:${NC}"
    echo "https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS CLI is configured
aws sts get-caller-identity > /dev/null 2>&1 || {
    echo -e "${RED}AWS CLI not configured. Please run:${NC}"
    echo "aws configure"
    exit 1
}

# Ask for environment
echo -e "${YELLOW}Select deployment environment:${NC}"
echo "1) Development"
echo "2) Staging"
echo "3) Production"
read -p "Enter your choice (1-3): " env_choice

case $env_choice in
    1) ENVIRONMENT="dev" ;;
    2) ENVIRONMENT="staging" ;;
    3) ENVIRONMENT="prod" ;;
    *) echo -e "${RED}Invalid choice. Exiting.${NC}"; exit 1 ;;
esac

# Application name
APP_NAME="ipcr-ewers-$ENVIRONMENT"

# Create a temporary deployment directory
DEPLOY_DIR="deploy-$ENVIRONMENT-$(date +%Y%m%d%H%M%S)"
mkdir -p $DEPLOY_DIR

echo -e "${YELLOW}Building the application...${NC}"
npm run build

echo -e "${YELLOW}Preparing deployment package...${NC}"
# Copy necessary files to deployment directory
cp -r dist $DEPLOY_DIR/
cp -r .ebextensions $DEPLOY_DIR/
cp package.json package-lock.json $DEPLOY_DIR/
cp Dockerfile $DEPLOY_DIR/

# Create Procfile for Elastic Beanstalk
echo "web: npm start" > $DEPLOY_DIR/Procfile

# Create zip file for deployment
cd $DEPLOY_DIR
zip -r ../deployment.zip .
cd ..

echo -e "${YELLOW}Checking if application exists...${NC}"
# Check if the application already exists
if aws elasticbeanstalk describe-applications --application-names $APP_NAME > /dev/null 2>&1; then
    echo -e "${GREEN}Application $APP_NAME exists. Proceeding with deployment.${NC}"
else
    echo -e "${YELLOW}Creating new Elastic Beanstalk application: $APP_NAME${NC}"
    aws elasticbeanstalk create-application --application-name $APP_NAME
fi

# Get environment variables for the selected environment
ENV_FILE=".env.$ENVIRONMENT"
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Loading environment variables from $ENV_FILE${NC}"
    # Create environment configuration file
    ENV_CONFIG="option_settings.json"
    echo "{\"OptionSettings\": [" > $ENV_CONFIG
    
    FIRST=true
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Skip comments and empty lines
        [[ $key == \#* ]] || [ -z "$key" ] && continue
        
        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            echo "," >> $ENV_CONFIG
        fi
        
        # Add environment variable
        echo "{\"Namespace\": \"aws:elasticbeanstalk:application:environment\", \"OptionName\": \"$key\", \"Value\": \"$value\"}" >> $ENV_CONFIG
    done < "$ENV_FILE"
    
    echo "]}" >> $ENV_CONFIG
else
    echo -e "${YELLOW}No environment file found at $ENV_FILE. Using default settings.${NC}"
    # Create default environment configuration
    ENV_CONFIG="option_settings.json"
    echo "{\"OptionSettings\": [" > $ENV_CONFIG
    echo "{\"Namespace\": \"aws:elasticbeanstalk:application:environment\", \"OptionName\": \"NODE_ENV\", \"Value\": \"production\"}" >> $ENV_CONFIG
    echo "]}" >> $ENV_CONFIG
fi

# Check if environment exists
ENV_NAME="$APP_NAME-env"
if aws elasticbeanstalk describe-environments --environment-names $ENV_NAME --include-deleted=false > /dev/null 2>&1; then
    echo -e "${YELLOW}Updating existing environment: $ENV_NAME${NC}"
    
    # Update environment configuration
    aws elasticbeanstalk update-environment \
        --environment-name $ENV_NAME \
        --option-settings file://$ENV_CONFIG
    
    # Deploy new version
    VERSION_LABEL="v$(date +%Y%m%d%H%M%S)"
    echo -e "${YELLOW}Creating application version: $VERSION_LABEL${NC}"
    
    aws elasticbeanstalk create-application-version \
        --application-name $APP_NAME \
        --version-label $VERSION_LABEL \
        --source-bundle S3Bucket="elasticbeanstalk-$AWS_REGION-$(aws sts get-caller-identity --query Account --output text)",S3Key="deployment.zip" \
        --auto-create-application
    
    echo -e "${YELLOW}Updating environment with new version...${NC}"
    aws elasticbeanstalk update-environment \
        --environment-name $ENV_NAME \
        --version-label $VERSION_LABEL
else
    echo -e "${YELLOW}Creating new environment: $ENV_NAME${NC}"
    
    # Upload the deployment package to S3
    S3_BUCKET="elasticbeanstalk-$AWS_REGION-$(aws sts get-caller-identity --query Account --output text)"
    aws s3 cp deployment.zip s3://$S3_BUCKET/
    
    # Create a new version
    VERSION_LABEL="v$(date +%Y%m%d%H%M%S)"
    aws elasticbeanstalk create-application-version \
        --application-name $APP_NAME \
        --version-label $VERSION_LABEL \
        --source-bundle S3Bucket=$S3_BUCKET,S3Key="deployment.zip" \
        --auto-create-application
    
    # Create the environment
    aws elasticbeanstalk create-environment \
        --application-name $APP_NAME \
        --environment-name $ENV_NAME \
        --solution-stack-name "64bit Amazon Linux 2 v5.8.0 running Node.js 16" \
        --option-settings file://$ENV_CONFIG \
        --version-label $VERSION_LABEL
fi

# Clean up
rm -rf $DEPLOY_DIR
rm deployment.zip
rm $ENV_CONFIG

echo -e "${GREEN}Deployment initiated for $APP_NAME to environment $ENV_NAME!${NC}"
echo -e "${YELLOW}You can check the deployment status using:${NC}"
echo "aws elasticbeanstalk describe-environments --environment-names $ENV_NAME"