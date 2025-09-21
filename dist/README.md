# V3 Frontend Deployment Instructions

This directory contains the static frontend files (HTML, CSS, JavaScript) for the web application. These files are designed to be hosted on any standard web server or static hosting service (e.g., Netlify, Vercel, AWS S3, GitHub Pages).

## File Structure Overview

The frontend has been refactored to use a client-side templating system to reduce code duplication.

-   **`_header.html`, `_sidebar.html`, `_footer.html`**: These are HTML "partials" containing the shared components of the site.
-   **`index.html`, `services.html`, etc.**: These are the main pages. They are simple HTML shells that use the `includeHTML()` function in `script.js` to load the shared partials.
-   **`script.js`**: Contains the main JavaScript logic for the application, including form handling and the client-side templating function.
-   **`config.js`**: Contains the configuration for the web app, most importantly the URL of the Google Apps Script backend.
-   **`style.css`**: Contains all the styles for the application.

## **IMPORTANT: Connecting to the Backend**

Before the website will work, you **must** connect it to your Google Apps Script backend.

### 1. Deploy your Google Apps Script Project

-   Open your Google Apps Script project.
-   Click on `Deploy` > `New deployment`.
-   For `Select type`, choose `Web app`.
-   In the configuration:
    -   Give it a description (e.g., "v3.0").
    -   Execute as: `Me`.
    -   Who has access: `Anyone`.
-   Click `Deploy`.

### 2. Copy the Web App URL

-   After deployment, a `Web app URL` will be provided. It will look something like `https://script.google.com/macros/s/..../exec`.
-   **Copy this URL.**

### 3. Update the Frontend Configuration

-   Open the `dist/config.js` file.
-   Find the following line at the top of the file:
    ```javascript
    const WEB_APP_URL = 'YOUR_WEB_APP_URL_HERE';
    ```
-   **Replace** the placeholder `'YOUR_WEB_APP_URL_HERE'` with the Web App URL you copied in the previous step.

    *Example:*
    ```javascript
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
    ```

### 4. Configure CORS in Google Apps Script (Optional but Recommended)

For security, it's best to restrict your web app to only accept requests from the domain where you are hosting your frontend.

-   Open your `appsscript/Code.gs` file in the Google Apps Script editor.
-   Find the `doOptions(e)` function.
-   Change the `Access-Control-Allow-Origin` value from `"*"` to the URL of your hosted site.

    *Example for GitHub Pages:*
    ```javascript
    // from
    .addHttpHeader("Access-Control-Allow-Origin", "*")
    // to
    .addHttpHeader("Access-Control-Allow-Origin", "https://your-username.github.io")
    ```
-   Save and redeploy your Apps Script project (`Deploy` > `Manage deployments` > Select your deployment > `Edit` > `Deploy`).

### 5. Upload/Deploy Frontend Files

-   After updating the `dist/config.js` file, you can now upload all the files from this `dist` directory to your chosen web hosting provider.

The application will not function until the `WEB_APP_URL` in `dist/config.js` has been correctly configured.
