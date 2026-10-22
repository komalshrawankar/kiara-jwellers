const REGISTRATION_HEADERS = [
  "Timestamp",
  "Name",
  "Mobile Number",
  "Token No",
  "City",
  "Email Status",
];

const REGISTRATION_SERVICE_VERSION = "registration-v2";

const REGISTRATION_FIELDS = [
  { key: "timestamp", header: "Timestamp", aliases: ["timestamp"] },
  { key: "name", header: "Name", aliases: ["name"] },
  {
    key: "phone",
    header: "Mobile Number",
    aliases: ["mobilenumber", "mobileno", "phonenumber", "phone", "contactnumber", "contactno"],
  },
  { key: "token", header: "Token No", aliases: ["tokenno", "tokennumber", "token"] },
  { key: "city", header: "City", aliases: ["city", "location"] },
  { key: "emailStatus", header: "Email Status", aliases: ["emailstatus"] },
];

function doGet(e) {
  const params = (e && e.parameter) || {};
  let result;

  if (params.action === "health") {
    const properties = PropertiesService.getScriptProperties();
    result = {
      service: REGISTRATION_SERVICE_VERSION,
      configured: Boolean(
        properties.getProperty("SHEET_ID") &&
        properties.getProperty("ADMIN_EMAIL")
      ),
    };
  } else if (params.action === "check") {
    const phone = normalizePhone(params.phone);
    if (!isValidPhone(phone)) {
      result = { error: "Invalid mobile number." };
    } else {
      const sheet = getRegistrationSheet();
      result = { exists: findRegistrationRow(sheet, phone) !== 0 };
    }
  } else if (params.action === "status") {
    result = getRequestStatus(params.requestId);
  } else {
    return ContentService.createTextOutput("Registration service is running.");
  }

  const json = JSON.stringify(result);
  const callback = params.callback;
  if (callback) {
    if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
      return ContentService.createTextOutput("Invalid callback.");
    }
    return ContentService.createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  const requestId = String(params.requestId || "");
  if (!/^[A-Za-z0-9-]{16,64}$/.test(requestId)) {
    return jsonResponse({ status: "error", message: "Invalid registration request." });
  }

  const cache = CacheService.getScriptCache();
  cache.put(statusKey(requestId), JSON.stringify({ status: "pending" }), 21600);

  try {
    if (params.action !== "register") {
      throw new Error("Invalid registration request.");
    }

    const name = String(params.name || "").trim();
    const phone = normalizePhone(params.phone);
    const token = String(params.token || "").trim();
    const city = String(params.city || "").trim();
    if (
      !name ||
      name.length > 100 ||
      !isValidPhone(phone) ||
      !token ||
      token.length > 50 ||
      !city ||
      city.length > 100
    ) {
      throw new Error("Please provide a valid name, mobile number, token number, and city.");
    }

    const properties = PropertiesService.getScriptProperties();
    const sheetId = properties.getProperty("SHEET_ID");
    const adminEmail = properties.getProperty("ADMIN_EMAIL");
    if (!sheetId || !adminEmail) {
      throw new Error("Registration service is not configured.");
    }

    const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    let row;
    try {
      ensureHeaders(sheet);
      row = findRegistrationRow(sheet, phone);
      if (row !== 0) {
        cache.put(
          statusKey(requestId),
          JSON.stringify({
            status: "duplicate",
            message: "This mobile number is already registered.",
          }),
          21600
        );
        return jsonResponse({ status: "duplicate" });
      }

      row = sheet.getLastRow() + 1;
      const columns = getRegistrationColumns(sheet);
      const values = Array(sheet.getLastColumn()).fill("");
      values[columns.timestamp - 1] = new Date();
      values[columns.name - 1] = name;
      values[columns.phone - 1] = phone;
      values[columns.token - 1] = token;
      values[columns.city - 1] = city;
      values[columns.emailStatus - 1] = "Pending";
      sheet.getRange(row, 1, 1, values.length).setValues([values]);
    } finally {
      lock.releaseLock();
    }

    try {
      MailApp.sendEmail({
        to: adminEmail,
        subject: "New lucky draw registration",
        body: [
          "A new lucky draw registration was received.",
          "",
          `Name: ${name}`,
          `Mobile number: ${phone}`,
          `Token number: ${token}`,
          `City: ${city}`,
        ].join("\n"),
      });
    } catch (error) {
      console.error(
        `Admin email failed for ${adminEmail}: ${error.stack || error.message}`
      );
      sheet.getRange(row, getRegistrationColumns(sheet).emailStatus).setValue("Failed");
      cache.put(
        statusKey(requestId),
        JSON.stringify({ status: "registered" }),
        21600
      );
      return jsonResponse({ status: "registered" });
    }

    try {
      sheet.getRange(row, getRegistrationColumns(sheet).emailStatus).setValue("Sent");
    } catch (error) {
      console.error(`Email was sent but its sheet status could not be updated: ${error.stack || error.message}`);
    }
    cache.put(
      statusKey(requestId),
      JSON.stringify({ status: "registered" }),
      21600
    );
    return jsonResponse({ status: "registered" });
  } catch (error) {
    console.error(`Registration failed: ${error.message}`);
    cache.put(
      statusKey(requestId),
      JSON.stringify({
        status: "error",
        message: error.message === "Registration service is not configured."
          ? error.message
          : "Registration could not be saved. Please try again.",
      }),
      21600
    );
    return jsonResponse({ status: "error" });
  }
}

function testAdminEmail() {
  const adminEmail = PropertiesService.getScriptProperties()
    .getProperty("ADMIN_EMAIL");
  if (!adminEmail) {
    throw new Error("Set ADMIN_EMAIL in Script properties before running this test.");
  }

  MailApp.sendEmail({
    to: adminEmail,
    subject: "Kiara Jewellers registration email test",
    body: "This is a test email from the registration form Apps Script.",
  });
  console.log(`Test email sent to ${adminEmail}`);
}

function retryFailedEmails() {
  const properties = PropertiesService.getScriptProperties();
  const adminEmail = properties.getProperty("ADMIN_EMAIL");
  if (!adminEmail) {
    throw new Error("Set ADMIN_EMAIL in Script properties before retrying emails.");
  }

  const sheet = getRegistrationSheet();
  const columns = getRegistrationColumns(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    console.log("No saved registrations to check.");
    return;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (let index = 0; index < values.length; index += 1) {
    const row = values[index];
    if (String(row[columns.emailStatus - 1]).toLowerCase() !== "failed") {
      continue;
    }

    const sheetRow = index + 2;
    const name = String(row[columns.name - 1] || "");
    const phone = normalizePhone(row[columns.phone - 1]);
    const token = String(row[columns.token - 1] || "");
    const city = String(row[columns.city - 1] || "");
    if (MailApp.getRemainingDailyQuota() < 1) {
      console.warn(
        "Daily email recipient quota is exhausted. Remaining failed emails were left unchanged; run retryFailedEmails again after the quota resets."
      );
      break;
    }

    try {
      MailApp.sendEmail({
        to: adminEmail,
        subject: "New lucky draw registration",
        body: [
          "A saved lucky draw registration email is being retried.",
          "",
          `Name: ${name}`,
          `Mobile number: ${phone}`,
          `Token number: ${token}`,
          `City: ${city}`,
        ].join("\n"),
      });
      sheet.getRange(sheetRow, columns.emailStatus).setValue("Sent");
      console.log(`Retried registration email for sheet row ${sheetRow}.`);
    } catch (error) {
      console.error(
        `Retry failed for sheet row ${sheetRow}: ${error.stack || error.message}`
      );
      if (/Service invoked too many times for one day:\s*email/i.test(error.message || "")) {
        console.warn(
          "Daily email quota is exhausted. Remaining failed emails were left unchanged; run retryFailedEmails again after the quota resets."
        );
        break;
      }
    }
  }
}

function getRequestStatus(requestId) {
  if (!/^[A-Za-z0-9-]{16,64}$/.test(String(requestId || ""))) {
    return { status: "error", message: "Invalid registration request." };
  }
  return JSON.parse(
    CacheService.getScriptCache().get(statusKey(requestId)) ||
      JSON.stringify({ status: "unknown" })
  );
}

function getRegistrationSheet() {
  const sheetId = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (!sheetId) {
    throw new Error("Registration service is not configured.");
  }
  const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, REGISTRATION_HEADERS.length)
      .setValues([REGISTRATION_HEADERS]);
    sheet.setFrozenRows(1);
  } else {
    let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    REGISTRATION_FIELDS.forEach((field) => {
      if (findHeaderColumn(headers, field.aliases) === 0) {
        const column = sheet.getLastColumn() + 1;
        sheet.getRange(1, column).setValue(field.header);
        headers = sheet.getRange(1, 1, 1, column).getDisplayValues()[0];
      }
    });
  }
  const columns = getRegistrationColumns(sheet);
  sheet.getRange(1, columns.phone, sheet.getMaxRows(), 1).setNumberFormat("@");
  sheet.getRange(1, columns.token, sheet.getMaxRows(), 1).setNumberFormat("@");
}

function findRegistrationRow(sheet, phone) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return 0;
  }
  const phoneColumn = getRegistrationColumns(sheet).phone;
  const phones = sheet.getRange(2, phoneColumn, lastRow - 1, 1).getDisplayValues();
  const index = phones.findIndex((row) => normalizePhone(row[0]) === phone);
  return index === -1 ? 0 : index + 2;
}

function getRegistrationColumns(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  return REGISTRATION_FIELDS.reduce((columns, field) => {
    const column = findHeaderColumn(headers, field.aliases);
    if (column === 0) {
      throw new Error(`The registration sheet is missing the ${field.header} column.`);
    }
    columns[field.key] = column;
    return columns;
  }, {});
}

function findHeaderColumn(headers, aliases) {
  const index = headers.findIndex((header) => {
    const normalized = String(header || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return aliases.some((alias) => normalized.includes(alias));
  });
  return index + 1;
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

function statusKey(requestId) {
  return `registration:${requestId}`;
}

function jsonResponse(result) {
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
