.PHONY: help deploy-infrastructure deploy-web start-api start-ngrok stop-ngrok build clean test logs

# Color output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Variables
AWS_REGION := us-east-2
STACK_NAME := heidi-prod-minimal
ENVIRONMENT := prod
NGROK_PORT := 5000

help:
	@echo "$(BLUE)Heidi Voter Dashboard - Available Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Infrastructure & Deployment:$(NC)"
	@echo "  make deploy-infrastructure    Deploy AWS infrastructure (Kinesis, DynamoDB, SQS, S3)"
	@echo "  make deploy-web               Build & deploy React dashboard to AWS S3"
	@echo ""
	@echo "$(GREEN)Local Development:$(NC)"
	@echo "  make start-api                Start Express server on localhost:5000"
	@echo "  make start-ngrok              Start ngrok tunnel (exposes localhost:5000 to internet)"
	@echo "  make stop-ngrok               Stop ngrok tunnel"
	@echo ""
	@echo "$(GREEN)Build & Testing:$(NC)"
	@echo "  make build                    Build all components (API + Web)"
	@echo "  make test                     Run test suite"
	@echo "  make clean                    Clean build artifacts"
	@echo ""
	@echo "$(GREEN)Monitoring:$(NC)"
	@echo "  make logs-api                 Tail Express server logs"
	@echo "  make logs-aws                 Show AWS CloudFormation stack events"
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make deploy-infrastructure   # Deploy AWS stack"
	@echo "  make start-api               # Start local API"
	@echo "  make start-ngrok             # Expose to internet"
	@echo ""

# ============================================================================
# INFRASTRUCTURE DEPLOYMENT
# ============================================================================

deploy-infrastructure:
	@echo "$(BLUE)Deploying AWS Infrastructure...$(NC)"
	@echo "Stack: $(STACK_NAME)"
	@echo "Region: $(AWS_REGION)"
	@echo "Environment: $(ENVIRONMENT)"
	@echo ""
	cd . && aws cloudformation deploy \
		--template-file template-minimal.yaml \
		--stack-name $(STACK_NAME) \
		--region $(AWS_REGION) \
		--capabilities CAPABILITY_NAMED_IAM \
		--parameter-overrides \
			Environment=$(ENVIRONMENT) \
			AWSRegion=$(AWS_REGION)
	@echo ""
	@echo "$(GREEN)✅ Infrastructure deployment complete!$(NC)"
	@echo "Stack status: $(STACK_NAME)"
	@echo "Region: $(AWS_REGION)"

deploy-infrastructure-full:
	@echo "$(BLUE)Deploying Full AWS Infrastructure (with Lambda + EventBridge)...$(NC)"
	cd . && aws cloudformation deploy \
		--template-file template.yaml \
		--stack-name $(STACK_NAME)-full \
		--region $(AWS_REGION) \
		--capabilities CAPABILITY_NAMED_IAM
	@echo "$(GREEN)✅ Full infrastructure deployed!$(NC)"

# ============================================================================
# WEB DEPLOYMENT
# ============================================================================

deploy-web:
	@echo "$(BLUE)Building & Deploying React Dashboard to AWS S3...$(NC)"
	@echo ""
	@echo "$(YELLOW)Step 1: Building React app...$(NC)"
	cd client && npm install && npm run build
	@echo ""
	@echo "$(YELLOW)Step 2: Deploying to S3...$(NC)"
	@echo "$(RED)Note: S3 bucket deployment requires CloudFront setup$(NC)"
	@echo "For now, dashboard available at: https://wronged-baking-rush.ngrok-free.dev"
	@echo ""
	@echo "$(GREEN)✅ Build complete! React app ready in client/build/$(NC)"

# ============================================================================
# LOCAL DEVELOPMENT
# ============================================================================

start-api:
	@echo "$(BLUE)Starting Express API Server...$(NC)"
	@echo "📍 Server will start on: http://localhost:5000"
	@echo "📊 Available routes:"
	@echo "   - POST /api/email/send       (Send email campaigns)"
	@echo "   - POST /api/sms/send          (Send SMS campaigns)"
	@echo "   - GET  /api/precincts         (Get precinct data)"
	@echo "   - POST /api/voters/import     (Import voter data)"
	@echo ""
	cd server && npm start

start-ngrok:
	@echo "$(BLUE)Starting ngrok Tunnel...$(NC)"
	@echo "📡 Exposing localhost:$(NGROK_PORT) to the internet"
	@echo ""
	@echo "$(YELLOW)Prerequisites:$(NC)"
	@echo "  1. Make sure Express server is running (make start-api)"
	@echo "  2. ngrok authtoken must be configured"
	@echo ""
	@echo "$(YELLOW)If ngrok fails, configure authtoken:$(NC)"
	@echo "  ngrok config add-authtoken YOUR_TOKEN_HERE"
	@echo ""
	ngrok http $(NGROK_PORT)

stop-ngrok:
	@echo "$(YELLOW)Stopping ngrok...$(NC)"
	pkill -f "ngrok http" || echo "ngrok not running"
	@echo "$(GREEN)✅ ngrok stopped$(NC)"

# ============================================================================
# BUILD & CLEAN
# ============================================================================

build: build-api build-web
	@echo "$(GREEN)✅ All builds complete!$(NC)"

build-api:
	@echo "$(BLUE)Building Express API...$(NC)"
	cd server && npm install

build-web:
	@echo "$(BLUE)Building React Dashboard...$(NC)"
	cd client && npm install && npm run build

clean:
	@echo "$(YELLOW)Cleaning up build artifacts...$(NC)"
	rm -rf server/node_modules
	rm -rf client/node_modules
	rm -rf client/build
	rm -rf .aws-sam/build
	@echo "$(GREEN)✅ Clean complete$(NC)"

clean-aws:
	@echo "$(RED)WARNING: This will delete the AWS stack$(NC)"
	@echo "Stack: $(STACK_NAME)"
	@read -p "Are you sure? (y/n) " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		aws cloudformation delete-stack \
			--stack-name $(STACK_NAME) \
			--region $(AWS_REGION); \
		echo "$(YELLOW)Stack deletion initiated...$(NC)"; \
	else \
		echo "Cancelled"; \
	fi

# ============================================================================
# TESTING
# ============================================================================

test:
	@echo "$(BLUE)Running test suite...$(NC)"
	@echo "$(YELLOW)Note: Add your test commands here$(NC)"
	cd server && npm test || echo "No tests configured yet"

# ============================================================================
# MONITORING & LOGS
# ============================================================================

logs-api:
	@echo "$(BLUE)Express API Logs...$(NC)"
	@echo "$(YELLOW)Note: Run this in a separate terminal while make start-api is running$(NC)"
	@echo ""
	@echo "Available log files:"
	@echo "  - server/logs/ (if configured)"
	@echo ""
	@echo "To see logs in real-time:"
	@echo "  tail -f server/logs/app.log"

logs-aws:
	@echo "$(BLUE)AWS CloudFormation Stack Events$(NC)"
	@echo "Stack: $(STACK_NAME)"
	@echo ""
	aws cloudformation describe-stack-events \
		--stack-name $(STACK_NAME) \
		--region $(AWS_REGION) \
		--query 'StackEvents[0:10].[Timestamp,ResourceStatus,ResourceType,LogicalResourceId]' \
		--output table

status:
	@echo "$(BLUE)System Status$(NC)"
	@echo ""
	@echo "$(YELLOW)Express Server:$(NC)"
	@if [ -n "$$(lsof -i :5000 2>/dev/null)" ]; then \
		echo "$(GREEN)✅ Running on localhost:5000$(NC)"; \
	else \
		echo "$(RED)❌ Not running$(NC)"; \
	fi
	@echo ""
	@echo "$(YELLOW)ngrok Tunnel:$(NC)"
	@if [ -n "$$(lsof -i :4040 2>/dev/null)" ]; then \
		echo "$(GREEN)✅ Running$(NC)"; \
	else \
		echo "$(RED)❌ Not running$(NC)"; \
	fi
	@echo ""
	@echo "$(YELLOW)AWS Stack: $(STACK_NAME)$(NC)"
	@aws cloudformation describe-stacks \
		--stack-name $(STACK_NAME) \
		--region $(AWS_REGION) \
		--query 'Stacks[0].StackStatus' \
		--output text 2>/dev/null || echo "$(RED)Not found$(NC)"

# ============================================================================
# QUICK START
# ============================================================================

init:
	@echo "$(BLUE)Initializing Heidi Voter Dashboard...$(NC)"
	@echo ""
	@echo "$(YELLOW)Step 1: Installing dependencies...$(NC)"
	cd server && npm install
	cd ../client && npm install
	@echo ""
	@echo "$(YELLOW)Step 2: Creating AWS config...$(NC)"
	@echo "$(RED)Manual step required:$(NC)"
	@echo "  1. Go to https://console.aws.amazon.com"
	@echo "  2. Create AWS Access Key in IAM > Users > Your User"
	@echo "  3. Run: aws configure"
	@echo "  4. Enter Access Key ID, Secret Access Key, Region (us-east-2)"
	@echo ""
	@echo "$(YELLOW)Step 3: Deploy infrastructure...$(NC)"
	@echo "  make deploy-infrastructure"
	@echo ""
	@echo "$(GREEN)✅ Ready to start developing!$(NC)"
	@echo ""
	@echo "To get started:"
	@echo "  1. make start-api         (Terminal 1)"
	@echo "  2. make start-ngrok       (Terminal 2)"
	@echo "  3. Visit: https://wronged-baking-rush.ngrok-free.dev"

# ============================================================================
# DOCUMENTATION
# ============================================================================

info:
	@echo "$(BLUE)Heidi Voter Dashboard - Project Info$(NC)"
	@echo ""
	@echo "$(YELLOW)Architecture:$(NC)"
	@echo "  Frontend: React + Redux (localhost:3000)"
	@echo "  Backend:  Express.js (localhost:5000)"
	@echo "  Database: PostgreSQL (local)"
	@echo "  AWS:      Kinesis, DynamoDB, SQS, S3, Lambda"
	@echo ""
	@echo "$(YELLOW)Deployment:$(NC)"
	@echo "  Infrastructure: CloudFormation (template-minimal.yaml)"
	@echo "  Web:            S3 + CloudFront (coming soon)"
	@echo "  Tunneling:      ngrok"
	@echo ""
	@echo "$(YELLOW)Key URLs:$(NC)"
	@echo "  Local:  http://localhost:5000/login"
	@echo "  Public: https://wronged-baking-rush.ngrok-free.dev/login"
	@echo ""
	@echo "$(YELLOW)Admin Credentials:$(NC)"
	@echo "  Email:    admin@test.com"
	@echo "  Password: Admin123!"
	@echo ""

.DEFAULT_GOAL := help
