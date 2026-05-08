# Development Scripts

This directory contains various scripts used during the development and testing of Horizon IT.

> [!WARNING]
> These scripts are intended for internal development use ONLY. They do not have authentication and may perform direct database manipulations.

## Usage
These scripts are not meant to be run in a production environment. Use the official `install.ps1` or `install.sh` scripts for setting up the application.

## Files
- `check-users.js`: View current users in the database.
- `create-admin.js`: Create or reset an admin user.
- `inject-admin.js`: Directly inject an admin user into the DB via SQL.
- `restore-admin.js`: Restore an admin user from a backup.
- `seed-local.js`: Seed the local database with sample data.
- `test-pg.js`: Test PostgreSQL connection.
- `test-prisma-stats.js`: Test Prisma client statistics.
- `test-timeout.js`: Test execution timeouts.
