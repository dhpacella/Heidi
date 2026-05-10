<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Voter Tracking System - Project Instructions

### Project Overview
A full-stack voter tracking system with precinct prioritization, historical voting data analysis, filtering, and data export capabilities. Features include:
- Door-knocking prioritization based on 3-year voting history
- Precinct prioritization by key indicators (partisan lean, registration potential, turnout history, etc.)
- Win number calculator and turnout analysis
- Canvassing & phone banking tracking
- Persuasion opportunity scoring
- Data export with multiple filter options

### Tech Stack
- **Frontend**: React with TypeScript
- **Backend**: Node.js/Express
- **Database**: PostgreSQL
- **Additional**: Redux for state management, Chart.js for analytics

### Key Features to Implement
1. Voter data management (import, storage, retrieval)
2. Precinct prioritization algorithm
3. Advanced filtering and search
4. Historical voting analysis
5. Data export functionality (CSV, JSON, PDF)
6. Dashboard with key metrics
7. Canvassing tools and tracking
8. Win number calculator

### Development Guidelines
- Follow REST API best practices
- Use environment variables for configuration
- Implement proper authentication and authorization
- Add comprehensive error handling
- Write unit tests for critical functions
- Use consistent naming conventions
