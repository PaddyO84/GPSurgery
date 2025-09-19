# Frontend Deployment

This directory contains the static frontend files for the project. These files can be hosted on any static web hosting service (e.g., Netlify, Vercel, GitHub Pages, or a traditional web server like Blackknight).

## Important: Configure the Web App URL

Before deploying the frontend, you must configure the URL of your deployed Google Apps Script web app.

1.  **Deploy your Google Apps Script project.** Follow the instructions in `appsscript/DEPLOYMENT.md` to deploy your script as a web app.
2.  **Copy the Web App URL.** After deployment, Google will provide you with a Web App URL. Copy this URL.
3.  **Update `main.js`:** Open the `dist/main.js` file and replace the placeholder `'YOUR_WEB_APP_URL'` with the URL you copied in the previous step.

```javascript
// in dist/main.js
const WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_UNIQUE_ID/exec'; // Replace with your actual URL
```

After completing these steps, you can deploy the contents of this `dist` directory to your web hosting provider.
