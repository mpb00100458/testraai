#!/bin/bash

# Agentium Setup Script
# This script helps you set up the Agentium application

set -e

echo "🚀 Agentium Setup Script"
echo "========================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if PostgreSQL is installed
echo "Step 1: Checking PostgreSQL installation..."
if command -v psql &> /dev/null; then
    print_success "PostgreSQL is installed"
    POSTGRES_VERSION=$(psql --version | awk '{print $3}')
    print_info "Version: $POSTGRES_VERSION"
else
    print_warning "PostgreSQL is not installed"
    echo ""
    echo "To install PostgreSQL on macOS:"
    echo "  brew install postgresql@14"
    echo "  brew services start postgresql@14"
    echo ""
    echo "Or use Neon (cloud PostgreSQL): https://neon.tech"
    echo ""
    read -p "Do you want to continue without local PostgreSQL? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "Step 2: Database Setup"
echo "----------------------"
echo "Choose your database option:"
echo "  1) Local PostgreSQL (recommended for development)"
echo "  2) Neon Serverless PostgreSQL (cloud)"
echo "  3) I already have a DATABASE_URL"
echo ""
read -p "Enter your choice (1-3): " DB_CHOICE

if [ "$DB_CHOICE" = "1" ]; then
    # Local PostgreSQL setup
    print_info "Setting up local PostgreSQL database..."
    
    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw agentium; then
        print_warning "Database 'agentium' already exists"
    else
        print_info "Creating database 'agentium'..."
        createdb agentium || print_error "Failed to create database"
        print_success "Database created"
    fi

    DATABASE_URL="postgresql://localhost/agentium"
    
elif [ "$DB_CHOICE" = "2" ]; then
    # Neon setup
    print_info "Using Neon Serverless PostgreSQL"
    echo ""
    echo "Please follow these steps:"
    echo "  1. Go to https://neon.tech"
    echo "  2. Sign up for a free account"
    echo "  3. Create a new project"
    echo "  4. Copy your connection string"
    echo ""
    read -p "Enter your Neon DATABASE_URL: " DATABASE_URL
    
elif [ "$DB_CHOICE" = "3" ]; then
    # Custom DATABASE_URL
    read -p "Enter your DATABASE_URL: " DATABASE_URL
else
    print_error "Invalid choice"
    exit 1
fi

# Update .env file with DATABASE_URL
print_info "Updating .env file..."
if [ -f .env ]; then
    # Replace DATABASE_URL in .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" .env
    else
        # Linux
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" .env
    fi
    print_success ".env file updated"
else
    print_error ".env file not found"
    exit 1
fi

echo ""
echo "Step 3: OpenAI API Key (Optional)"
echo "----------------------------------"
echo "The AI Agent feature requires an OpenAI API key."
echo "Get one from: https://platform.openai.com/api-keys"
echo ""
read -p "Do you have an OpenAI API key? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your OpenAI API key: " OPENAI_KEY
    
    # Update .env file with OpenAI key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^AI_INTEGRATIONS_OPENAI_API_KEY=.*|AI_INTEGRATIONS_OPENAI_API_KEY=$OPENAI_KEY|" .env
    else
        sed -i "s|^AI_INTEGRATIONS_OPENAI_API_KEY=.*|AI_INTEGRATIONS_OPENAI_API_KEY=$OPENAI_KEY|" .env
    fi
    print_success "OpenAI API key configured"
else
    print_warning "Skipping OpenAI configuration (AI Agent will not work)"
fi

echo ""
echo "Step 4: Installing Dependencies"
echo "--------------------------------"
if [ -d "node_modules" ]; then
    print_info "Dependencies already installed"
else
    print_info "Installing npm packages..."
    npm install
    print_success "Dependencies installed"
fi

echo ""
echo "Step 5: Database Migration"
echo "--------------------------"
print_info "Running database migrations..."
npm run db:push
print_success "Database schema created"

echo ""
echo "Step 6: Installing Playwright Browsers"
echo "---------------------------------------"
print_info "Installing Playwright browsers (required for accessibility scanning)..."
npx playwright install chromium
print_success "Playwright browsers installed"

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "To start the application:"
echo -e "  ${BLUE}npm run dev${NC}"
echo ""
echo "The application will be available at:"
echo -e "  ${BLUE}http://localhost:5000${NC}"
echo ""
echo "Next steps:"
echo "  1. Create an account at http://localhost:5000/register"
echo "  2. Create a workspace and project"
echo "  3. Start scanning websites for accessibility issues!"
echo ""
echo "Documentation:"
echo "  - Live Testing: docs/LIVE_TESTING_README.md"
echo "  - Quick Reference: docs/LIVE_TESTING_QUICK_REFERENCE.md"
echo ""
print_success "Happy testing! 🎉"

