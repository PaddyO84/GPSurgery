# How to Deploy the Script as a Web App

For the new "Simple Secure Messaging" feature to work, you must deploy this Google Apps Script project as a Web App. This makes the `message_form.html` and `reply_form.html` accessible via a public URL.

Follow these instructions carefully.

---

## Part 1: First-Time Deployment

If you have never deployed this script as a web app before, follow these steps.

1.  **Open the Script Editor:** From your Google Sheet, go to `Extensions` > `Apps Script`.

2.  **Open the Deployment Manager:** At the top right of the script editor, click the blue **`Deploy`** button, then select **`New deployment`**.

3.  **Configure the Deployment:**
    *   Click the gear icon next to "Select type" and choose **`Web app`**.
    *   Fill in the configuration details as follows:
        *   **Description:** (Optional) You can enter something like `Version 2.0 - Secure Messaging System`.
        *   **Execute as:** Select **`Me (your.email@example.com)`**. This is very important. It means the script always runs with your authority.
        *   **Who has access:** Select **`Anyone`**. This is necessary for the forms to be public on the internet. The script itself controls who can access the data.

4.  **Deploy and Authorize:**
    *   Click the **`Deploy`** button.
    *   Google will ask you to authorize the script's permissions (to send email and access spreadsheets on your behalf). Click **`Authorize access`**.
    *   Choose your Google account.
    *   You may see a "Google hasn't verified this app" warning. This is normal for your own scripts. Click **`Advanced`**, and then click **`Go to [Project Name] (unsafe)`**.
    *   On the next screen, review the permissions and click **`Allow`**.

5.  **Copy the Web App URL:**
    *   After deployment is complete, you will be shown a **Web app URL**. This is the public link to your new messaging system.
    *   **Copy this URL** and save it. You can link to it from your main clinic website to direct users to the new message form.

---

## Part 2: Updating an Existing Deployment

Whenever you or an agent makes changes to the code in the future, you will need to update the deployment to make those changes live.

1.  **Open the Deployment Manager:** Click the **`Deploy`** button at the top right and select **`Manage deployments`**.

2.  **Select Your Deployment:** You will see your active "Web app" deployment in the list. Click the **pencil icon (✏️)** on the right to edit it.

3.  **Create a New Version:**
    *   In the edit dialog, click the **`Version`** dropdown menu and select **`New version`**.
    *   You can add a description for the new version if you wish.

4.  **Deploy the Update:** Click the **`Deploy`** button. The changes will now be live at the same Web app URL you copied in Part 1. You do not need to copy a new URL.

---

**You are now ready to use the messaging system!** Navigate to the Web app URL you copied to see the new message form.
