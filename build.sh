#!/bin/bash

# Install dependencies
npm install

# Install client dependencies
cd client
npm install

# Build the React app
npm run build

# Go back to root
cd ..

# Start the server
npm start
