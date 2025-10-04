#!/bin/bash

# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Build the React app
npm run build

# Go back to root
cd ..

# The build is complete
echo "Build completed successfully"
