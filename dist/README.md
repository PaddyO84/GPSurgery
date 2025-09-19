# Frontend Deployment Instructions

This directory contains the static frontend files (HTML, CSS, JavaScript) for the web application. These files are designed to be hosted on any standard web server or static hosting service (e.g., Netlify, Vercel, AWS S3, GitHub Pages).

## **IMPORTANT: Connecting to the Backend**

Before the website will work, you **must** connect it to your Google Apps Script backend.

1.  **Deploy your Google Apps Script Project:**
    *   Open your Google Apps Script project.
    *   Click on `Deploy` > `New deployment`.
    *   For `Select type`, choose `Web app`.
    *   In the configuration:
        *   Give it a description (e.g., "v1.0").
        *   Execute as: `Me`.
        *   Who has access: `Anyone` (or `Anyone with Google account` if you want to restrict access).
    *   Click `Deploy`.

2.  **Copy the Web App URL:**
    *   After deployment, a `Web app URL` will be provided. It will look something like `https://script.google.com/macros/s/..../exec`.
    *   **Copy this URL.**

3.  **Update the Frontend Configuration:**
    *   Open the `dist/script.js` file.
    *   Find the following line at the top of the file:
        ```javascript
        const WEB_APP_URL = 'YOUR_WEB_APP_URL_HERE';
        ```
    *   **Replace** the placeholder `'YOUR_WEB_APP_URL_HERE'` with the Web App URL you copied in the previous step.

    *Example:*
    ```javascript
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
    ```

4.  **Upload/Deploy Frontend Files:**
    *   After updating the `script.js` file, you can now upload all the files from this `dist` directory to your chosen web hosting provider.

The application will not function until the `WEB_APP_URL` has been correctly configured.
