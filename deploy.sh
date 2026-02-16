#!/bin/bash

# Exit on error
set -e

# Define colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== IPCR Early Warning & Response System - AWS CloudFormation Deployment ===${NC}"
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

# Stack name
STACK_NAME="ipcr-ewers-$ENVIRONMENT"

# Ask for parameters
echo -e "${YELLOW}Database configuration:${NC}"
read -p "Database username [dbadmin]: " DB_USERNAME
DB_USERNAME=${DB_USERNAME:-dbadmin}

read -s -p "Database password [auto-generate]: " DB_PASSWORD
echo ""
if [ -z "$DB_PASSWORD" ]; then
    # Generate a random password if not provided
    DB_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9')
    echo -e "${YELLOW}Auto-generated database password (please save this): ${GREEN}$DB_PASSWORD${NC}"
fi

read -p "Instance type for application servers [t3.small]: " APP_INSTANCE_TYPE
APP_INSTANCE_TYPE=${APP_INSTANCE_TYPE:-t3.small}

read -p "Instance type for database [db.t3.small]: " DB_INSTANCE_TYPE
DB_INSTANCE_TYPE=${DB_INSTANCE_TYPE:-db.t3.small}

read -s -p "Session secret [auto-generate]: " SESSION_SECRET
echo ""
if [ -z "$SESSION_SECRET" ]; then
    # Generate a random session secret if not provided
    SESSION_SECRET=$(openssl rand -base64 32)
    echo -e "${YELLOW}Auto-generated session secret (please save this): ${GREEN}$SESSION_SECRET${NC}"
fi

# Ask for confirmation
echo -e "\n${YELLOW}You are about to deploy the IPCR Early Warning & Response System with the following configuration:${NC}"
echo "  - Environment: $ENVIRONMENT"
echo "  - Stack name: $STACK_NAME"
echo "  - Database username: $DB_USERNAME"
echo "  - Database password: [REDACTED]"
echo "  - Application instance type: $APP_INSTANCE_TYPE"
echo "  - Database instance type: $DB_INSTANCE_TYPE"
echo "  - Session secret: [REDACTED]"
echo ""
read -p "Do you want to proceed? (y/n): " CONFIRMATION

if [[ "$CONFIRMATION" != "y" && "$CONFIRMATION" != "Y" ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

# Check if the stack already exists
if aws cloudformation describe-stacks --stack-name $STACK_NAME >/dev/null 2>&1; then
    echo -e "${YELLOW}Stack $STACK_NAME already exists. Updating...${NC}"
    
    # Update the stack
    aws cloudformation update-stack \
        --stack-name $STACK_NAME \
        --template-body file://aws-deploy.yml \
        --parameters \
            ParameterKey=EnvironmentName,ParameterValue=$ENVIRONMENT \
            ParameterKey=DatabaseUsername,ParameterValue=$DB_USERNAME \
            ParameterKey=DatabasePassword,ParameterValue=$DB_PASSWORD \
            ParameterKey=AppInstanceType,ParameterValue=$APP_INSTANCE_TYPE \
            ParameterKey=DatabaseInstanceType,ParameterValue=$DB_INSTANCE_TYPE \
            ParameterKey=SessionSecret,ParameterValue=$SESSION_SECRET \
        --capabilities CAPABILITY_NAMED_IAM
    
    echo -e "${GREEN}Stack update initiated. You can monitor the progress in the AWS CloudFormation console.${NC}"
else
    echo -e "${YELLOW}Creating new stack: $STACK_NAME${NC}"
    
    # Create the stack
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://aws-deploy.yml \
        --parameters \
            ParameterKey=EnvironmentName,ParameterValue=$ENVIRONMENT \
            ParameterKey=DatabaseUsername,ParameterValue=$DB_USERNAME \
            ParameterKey=DatabasePassword,ParameterValue=$DB_PASSWORD \
            ParameterKey=AppInstanceType,ParameterValue=$APP_INSTANCE_TYPE \
            ParameterKey=DatabaseInstanceType,ParameterValue=$DB_INSTANCE_TYPE \
            ParameterKey=SessionSecret,ParameterValue=$SESSION_SECRET \
        --capabilities CAPABILITY_NAMED_IAM \
        --on-failure DO_NOTHING
    
    echo -e "${GREEN}Stack creation initiated. You can monitor the progress in the AWS CloudFormation console.${NC}"
fi

# Monitor the stack creation/update
echo -e "${YELLOW}Waiting for stack operation to complete...${NC}"
aws cloudformation wait stack-create-complete --stack-name $STACK_NAME 2>/dev/null || \
aws cloudformation wait stack-update-complete --stack-name $STACK_NAME 2>/dev/null || \
echo -e "${YELLOW}Stack operation in progress. Check AWS CloudFormation console for status.${NC}"

# Get the outputs
echo -e "\n${YELLOW}Stack outputs:${NC}"
aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs" --output json | jq -r '.[] | "  - \(.OutputKey): \(.OutputValue)"'

echo -e "\n${GREEN}Deployment process completed!${NC}"
echo -e "${YELLOW}Note: Full stack deployment may take up to 15-20 minutes to complete.${NC}"
echo -e "${YELLOW}You can monitor the status in the AWS CloudFormation console.${NC}"