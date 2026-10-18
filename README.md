# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# kiara-jwellers

## Registration form setup

The registration form uses Google Apps Script as its backend. The script
checks and records a mobile number under a script lock, preventing two
simultaneous submissions from creating duplicate entries. Successful entries
are saved to the first tab of a Google Sheet and emailed to the configured
admin address.

1. Choose the Google Sheet that contains your existing Google Form responses,
   or create a dedicated sheet. The script recognizes common name, phone,
   city, and timestamp headings, checks existing mobile numbers, and adds any
   missing columns to the first tab. New registrations include a required
   `Token No` value; the script adds that column if it is missing.
2. Open the Apps Script project that owns the deployment URL in
   [script.google.com](https://script.google.com) and replace its code with
   `google-apps-script/Code.gs`. If you do not own that project, create a new
   Apps Script project instead.
3. In **Project Settings → Script properties**, set `SHEET_ID` to the ID from
   the Google Sheet URL and `ADMIN_EMAIL` to the address that should receive
   registration notifications.
4. In **Deploy → Manage deployments**, edit the web app deployment, select
   **New version**, and deploy it. Set **Execute as** to your account and
   **Who has access** to **Anyone**. Complete the Google authorization prompts
   for Sheets and email. A deployment URL ending in `/exec` can stay the same
   when you create a new version; changing the source code alone does not
   update the deployed version.
5. In the Apps Script editor, select `testAdminEmail` and click **Run**.
   Complete Google's authorization flow and confirm the test message arrives
   at `ADMIN_EMAIL`. If it fails, open **Executions** in Apps Script and inspect
   the failed `testAdminEmail` run for Google's exact error. After fixing mail
   authorization, select `retryFailedEmails` and click **Run** to notify the
   admin about entries already saved with `Email Status` set to `Failed`.
6. Check the deployment by opening `<your /exec URL>?action=health`. It must
   return JSON with `"service":"registration-v2"` and `"configured":true`.
   Then `<your /exec URL>?action=check&phone=9000000000&callback=test` must
   return a JavaScript response beginning with `test(`.
7. Keep the deployed URL in `APPS_SCRIPT_URL` in `src/App.jsx` and publish the
   updated website frontend as well. The Apps Script deployment and the
   website are separate deployments; updating one does not publish the other.

The status endpoint is used after submission because browser requests to a
Google Apps Script web app do not expose their POST response to the page. Keep
the form's frontend URL and the deployed Apps Script version in sync.
