# Contributing to Voter Tracking System

## Development Environment Setup

1. Install Node.js 16+
2. Install PostgreSQL 12+
3. Clone the repository
4. Follow the SETUP_GUIDE.md

## Code Style Guidelines

### JavaScript/Node.js
- Use ES6+ features
- Use camelCase for variables and functions
- Use PascalCase for classes
- Use UPPER_SNAKE_CASE for constants
- Add JSDoc comments for functions

### React
- Use functional components with hooks
- Use Redux for state management
- Use consistent naming: `use` prefix for custom hooks
- Component files in PascalCase
- Utility files in camelCase

### SQL
- Use snake_case for table and column names
- Add meaningful indexes
- Include created_at/updated_at timestamps
- Use appropriate data types

## Git Workflow

1. Create a feature branch: `git checkout -b feature/description`
2. Make commits with clear messages
3. Push to your branch
4. Create a pull request with description of changes

## Testing

Write tests for:
- API endpoints
- Business logic functions
- React components

Run tests before committing:
```bash
npm test
```

## API Development Guidelines

- Follow RESTful conventions
- Use HTTP status codes correctly
- Include error handling and validation
- Document endpoints with comments
- Implement pagination for list endpoints

## Database Migrations

When schema changes are needed:
1. Create a new migration file in `server/src/db/migrations/`
2. Name format: `YYYYMMDD_description.js`
3. Include both `up()` and `down()` functions
4. Run: `npm run db:migrate`

## Deployment

Build for production:
```bash
npm run build
```

Start production server:
```bash
NODE_ENV=production npm start
```

## Reporting Issues

When reporting bugs, include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots/logs if applicable
- System info (OS, browser, Node version)

## Feature Requests

When requesting features, include:
- Use case/scenario
- Desired behavior
- Priority level
- Any mock-ups or examples

Thank you for contributing!
