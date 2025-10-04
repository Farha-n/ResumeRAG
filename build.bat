@echo off

REM Install dependencies
npm install

REM Install client dependencies
cd client
npm install

REM Build the React app
npm run build

REM Go back to root
cd ..

REM Start the server
npm start
