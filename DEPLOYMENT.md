# SafeRide AI - Production Deployment Guide

This guide details the step-by-step procedure to deploy the SafeRide AI backend on **Render**, connect to a cloud database on **MongoDB Atlas**, configure production **Firebase Auth** triggers, and compile Android **APK** binaries using Expo Application Services (EAS).

---

## 1. MongoDB Atlas Setup (Cloud Database)

MongoDB Atlas hosts the production database instances.

1. **Sign Up / Log In:** Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and log in.
2. **Create a Cluster:**
   - Click **Create** to deploy a new database cluster.
   - Choose the **M0 Shared Free Tier** (sufficient for staging/dev).
   - Choose your preferred Cloud Provider (e.g., AWS) and Region (e.g., `us-east-1`).
   - Click **Create Deployment**.
3. **Database Security Access:**
   - **Database User:** Create a user (e.g., `saferide-admin`) with a secure password. Keep these credentials.
   - **Network Access:** Go to **Network Access** under Security. Click **Add IP Address** and choose **Allow Access From Anywhere** (`0.0.0.0/0`) so that Render's dynamic web service nodes can connect.
4. **Retrieve Connection String:**
   - Go to the Database Deployment Dashboard.
   - Click **Connect** ➔ **Drivers** ➔ **Node.js**.
   - Copy the connection URI:
     `mongodb+srv://saferide-admin:<password>@cluster0.xxxx.mongodb.net/saferide?retryWrites=true&w=majority`
   - Replace `<password>` with your database user password.

---

## 2. Firebase Console Configuration

Firebase manages client verification OTP routines and decodes credentials.

1. **Create Firebase Project:** Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add Project** (e.g., `saferide-ai`).
2. **Enable Phone Authentication:**
   - Go to **Build** ➔ **Authentication** ➔ **Get Started**.
   - Under **Sign-in method**, select **Phone**, enable it, and click **Save**.
   - *(Optional)* Under **Templates** ➔ **Authorized domains**, add your backend Render domain.
3. **Download Client Configuration (`google-services.json`):**
   - Click **Project Settings** (gear icon) ➔ **General**.
   - Under **Your apps**, click the **Android** icon.
   - Enter your Android package name (e.g., `com.saferide.userapp`).
   - Download `google-services.json` and move it to `user-app/` and `driver-app/` root directories.
4. **Generate Service Account Private Key (for Backend):**
   - In Project Settings, go to **Service accounts** tab.
   - Click **Generate new private key** ➔ **Generate key**.
   - Download the generated JSON file. Copy its JSON string or store it safely. You will provide this JSON config to Render as the `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable.

---

## 3. Backend Deployment on Render

Render hosts the Express backend API and Socket.IO servers.

1. **Sign Up / Log In:** Go to [Render](https://render.com/) and authorize using GitHub.
2. **Create Web Service:**
   - Click **New +** ➔ **Web Service**.
   - Select your connected GitHub repository `saferide-ai`.
3. **Configure Service Parameters:**
   - **Name:** `saferide-backend`
   - **Language:** `Node`
   - **Branch:** `main`
   - **Root Directory:** `backend-server` (critical!)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` (or standard tier to avoid spin-up delays)
4. **Configure Environment Variables:**
   Click **Advanced** ➔ **Add Environment Variable** and inject these variables:

   | Variable Name | Example Value | Description |
   | :--- | :--- | :--- |
   | `PORT` | `10000` | Render port assignment |
   | `NODE_ENV` | `production` | Set server node modes |
   | `MONGODB_URI` | `mongodb+srv://...` | Connection URL from MongoDB Atlas |
   | `JWT_SECRET` | `your_super_secret_jwt_key` | Secret used to sign custom JWT tokens |
   | `JWT_REFRESH_SECRET` | `your_refresh_secret_key` | Secret used to sign refresh tokens |
   | `FIREBASE_SERVICE_ACCOUNT_KEY` | `{"type": "service_account", ...}` | Complete stringified Firebase JSON Key |
   | `RAZORPAY_KEY_ID` | `rzp_live_xxxxxxxx` | Production Razorpay key ID |
   | `RAZORPAY_KEY_SECRET` | `xxxxxxxxxxxxxxxx` | Production Razorpay key secret |

5. **Deploy:** Click **Create Web Service**. Wait for the build logs to compile. Once online, copy your Render Service URL (e.g., `https://saferide-backend.onrender.com`).

---

## 4. Client Android APK Generation (EAS Build)

Expo Application Services compiles standalone `.apk` files for direct testing.

### Step 1: Configure App Configuration (`app.json`)
Open `user-app/app.json` and configure the Android package name. Ensure it matches your Firebase package register:
```json
{
  "expo": {
    "name": "SafeRide User",
    "slug": "saferide-user",
    "android": {
      "package": "com.saferide.userapp",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

### Step 2: Configure EAS build profiles (`eas.json`)
Create or edit `eas.json` in the root of the app directories (`user-app/eas.json` and `driver-app/eas.json`) to define the local APK generation profile:
```json
{
  "cli": {
    "version": ">= 9.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

### Step 3: Trigger Android Compilation Commands
1. Install the EAS CLI globally on your workstation:
   ```bash
   npm install -g eas-cli
   ```
2. Log in using your Expo developer credentials:
   ```bash
   eas login
   ```
3. Initialize Expo EAS configuration inside the app folder:
   ```bash
   # Navigate to user app directory
   cd C:\Users\abkul\.gemini\antigravity\scratch\saferide-ai\user-app
   
   # Setup EAS connection
   eas build:configure
   ```
4. Run the compilation request to generate the standalone APK:
   ```bash
   eas build --platform android --profile preview
   ```
5. **Download the APK:** Once the build finishes on Expo cloud servers, EAS prints a direct URL link. Open the link or scan the QR Code on an Android device to download and install the standalone `SafeRide User` application.
6. Repeat the same commands inside the `driver-app` folder to compile the `SafeRide Driver` application APK!
