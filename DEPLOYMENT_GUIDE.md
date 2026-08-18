# DAMS Deployment Setup Guide

Welcome to the DAMS Deployment Setup! This guide will walk you through exactly how to get your full-stack web application live on the internet, completely for free. 

Since your project is already on GitHub, this process will take just a few minutes.

---

## 1. Deploy the Frontend (Vercel)

Vercel will host your Vite + React application. It automatically builds and serves your app on a fast global network.

1. **Create an Account**: Go to [Vercel.com](https://vercel.com) and sign up using your **GitHub account**.
2. **Import Repository**: Once logged in, click "Add New..." and select "Project".
3. **Select GitHub**: Vercel will ask to connect to your GitHub. Allow it to access your `DAMS` repository.
4. **Configure Project**:
   - **Root Directory**: Click "Edit" next to Root Directory and select the `frontend` folder. (This is very important!)
   - Vercel will then automatically detect that you are using Vite.
   - Expand the **Environment Variables** section. Add the following variables (you can find these in your local `.env` file):
     - `VITE_SUPABASE_URL`: (Your Supabase URL)
     - `VITE_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)
     - *(Note: Do NOT add `VITE_API_BASE_URL` yet. Vercel's deploy button won't be clickable if you leave a value blank. We will add this later!)*
5. **Deploy**: Click **Deploy**. Vercel will build your frontend.
6. **Get your URL**: Once finished, Vercel will give you a live URL (e.g., `https://dams-frontend.vercel.app`). Copy this URL.

---

## 2. Deploy the Backend (Render)

Render will host your FastAPI Python backend using the Docker container we just created.

1. **Create an Account**: Go to [Render.com](https://render.com) and sign up using your **GitHub account**.
2. **Create Web Service**: Click "New" and select **Web Service**.
3. **Connect Repository**: Connect your GitHub and select your `DAMS` repository.
4. **Configure Project**:
   - **Name**: Give it a name (e.g., `dams-backend`).
   - **Region**: Choose a region closest to you.
   - **Branch**: `main` (or whatever your primary branch is named).
   - **Root Directory**: `backend` (This is very important! Tell Render to look inside the `backend` folder).
   - **Environment**: Render should automatically detect `Docker` because we created a Dockerfile.
   - **Instance Type**: Select the **Free** tier ($0/month).
5. **Environment Variables**: Expand the Advanced/Environment Variables section and add:
   - `FRONTEND_URL`: Paste the Vercel URL you copied earlier (e.g., `https://dams-frontend.vercel.app`). This secures your API.
   - Add any other backend environment variables from your local `.env` (like Supabase Service Keys, API keys for Groq/Google, etc.).
6. **Deploy**: Click **Create Web Service**. It will take a few minutes to build the Docker image and start the server.
7. **Get your URL**: Once live, Render will give you a URL (e.g., `https://dams-backend.onrender.com`). Copy this.

---

## 3. Finalize Frontend Configuration

Now that the backend is live, we need to tell the frontend where to find it.

1. Go back to your project dashboard on [Vercel](https://vercel.com).
2. Go to **Settings** > **Environment Variables**.
3. Add the `VITE_API_BASE_URL` variable, and set its value to your Render backend URL (e.g., `https://dams-backend.onrender.com`).
4. **Redeploy**: Go to the **Deployments** tab, click the three dots on your latest deployment, and select **Redeploy**. This ensures the new variable is baked into the frontend.

Your application is now 100% deployed and live!

---

## 4. The Zero-Cost "Keep Awake" Fix (UptimeRobot)

Because Render's Free tier goes to sleep after 15 minutes of inactivity, we need to set up a ping so your client demo doesn't suffer a 30-second delay.

1. **Create an Account**: Go to [UptimeRobot.com](https://uptimerobot.com) and sign up for a free account.
2. **Add New Monitor**: Once on the dashboard, click **Add New Monitor**.
3. **Configure Monitor**:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: DAMS Backend
   - **URL (or IP)**: Paste your Render backend URL here (e.g., `https://dams-backend.onrender.com/`).
   - **Monitoring Interval**: 10 minutes.
4. **Create**: Click **Create Monitor**.

**That's it!** UptimeRobot will now visit your backend every 10 minutes. Render will think a user is actively using the app, so it will never go to sleep. Your backend will stay fast and responsive 24/7 for your client demo.
