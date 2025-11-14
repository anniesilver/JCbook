# JC Court Booking Tool

Mobile app for automated court booking at JC Tennis.

## Features

- User registration and login
- Create automated booking tasks
- View booking history and status
- Manage GameTime credentials

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env.local`
   - Add your Supabase credentials

3. Start the app:
   ```bash
   npx expo start
   ```

4. Start the backend server (on Windows PC):
   - See `backend-server/README.md` for instructions

## Backend Server

The backend server runs on a Windows PC and executes pending bookings automatically.
Located in `backend-server/` directory.
