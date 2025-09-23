# Carndonagh Health Centre Web App

This project contains the code for a simple web application for the Carndonagh Health Centre, allowing users to submit messages, appointment requests, and prescription renewals.

## Project Architecture

This project is a modern web application with a separate frontend and backend.

- **Frontend (`dist/` folder):** This is the visual website that users interact with. It is a collection of static HTML, CSS, and JavaScript files. These files **must be hosted on a static web hosting service** (like GitHub Pages, Netlify, Vercel, or any standard web host). You cannot run the website by opening the files directly from your computer.

- **Backend (`appsscript/` folder):** This is the backend API that connects to the Google Sheet. It is powered by Google Apps Script. Its only job is to receive data from the frontend and send data back. It does not serve any web pages.

## Deployment Instructions

You must deploy both the frontend and the backend separately.

### Part 1: Deploying the Backend API

The backend code lives in the `appsscript/` folder and must be deployed to a Google Apps Script project that is bound to your Google Sheet.

1.  **Open your Google Sheet.**
2.  Go to **`Extensions` > `Apps Script`**. This will open the Apps Script editor.
3.  You should see a `Code.gs` file, and possibly others. **Delete all code** in the `Code.gs` file. If there are other files, delete them too. You should have one single, empty `Code.gs` file.
4.  Copy the **entire contents** of the `appsscript/Code.gs` file from this repository.
5.  Paste the code into the empty `Code.gs` file in your Apps Script editor.
6.  Click the **Save project** icon.
7.  Click the blue **`Deploy`** button and select **`New deployment`**.
8.  **Configure the deployment:**
    *   Click the gear icon and select **`Web app`**.
    *   **Description:** Give it a name, e.g., "Health Centre API v1".
    *   **Execute as:** Select **`Me (your.email@example.com)`**.
    *   **Who has access:** Select **`Anyone`**. This is critical for CORS to work.
9.  Click **`Deploy`**. Authorize the script if prompted.
10. **Copy the Web app URL.** You will need this for the next part.

### Part 2: Deploying the Frontend

The frontend code lives in the `dist/` folder. These files need to be hosted on a static web host. (e.g., GitHub Pages).

1.  **Configure the Backend URL:**
    *   Open the `dist/config.js` file.
    *   You will see a line: `const WEB_APP_URL = '...';`
    *   Replace the placeholder URL with the **Web app URL** you copied in Step 10 of the backend deployment.
    *   Save the `config.js` file.

2.  **Upload the `dist/` folder contents:**
    *   Upload all the files from the `dist/` folder (`index.html`, `contact.html`, `script.js`, `style.css`, etc.) to your chosen web hosting service.
    *   Make sure the file structure is maintained.

### Part 3: Accessing the Website

-   **Do NOT** visit the Google Apps Script Web app URL directly. It will only show you a JSON message.
-   Visit the URL provided by your web hosting service where you uploaded the `dist/` files (e.g., `https://your-username.github.io/your-repo/index.html`).

This is the correct way to run the application. Following these steps carefully will ensure both the frontend and backend are deployed and configured to work together.
