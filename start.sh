#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm run install:all

# Generate Prisma client
echo "Generating Prisma client..."
npm run db:generate

# Push database schema
echo "Pushing database schema..."
npm run db:push

# Seed database
echo "Seeding database..."
npm run db:seed

# Build frontend
echo "Building frontend..."
npm run build

# Start the application
echo "Starting the application..."
npm run start:full 