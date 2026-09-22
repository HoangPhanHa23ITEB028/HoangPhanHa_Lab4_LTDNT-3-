import { facilitySurveySchema } from "/survey-schema.js";
import {
  saveSubmission,
  getAllSubmissions,
  getPendingSubmissions,
  updateSubmission,
} from "/db.js";

const statusEl = document.querySelector("#network-status");

function updateNetworkStatus() {
  statusEl.textContent = navigator.onLine
    ? "Trạng thái: ONLINE"
    : "Trạng thái: OFFLINE";
}

updateNetworkStatus();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered:", registration.scope);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  });
}

const formEl = document.querySelector("#survey-form");

const titleEl = document.querySelector("#form-title");

const listEl = document.querySelector("#submission-list");
titleEl.textContent = facilitySurveySchema.title;

const pendingCounterEl = document.querySelector("#pending-counter");
const syncedCounterEl = document.querySelector("#synced-counter");

const answers = {};

function renderForm() {
  formEl.innerHTML = "";

  for (const field of facilitySurveySchema.fields) {
    if (!shouldShowField(field)) {
      continue;
    }

    formEl.appendChild(renderField(field));
  }

  const actions = document.createElement("div");

  actions.className = "actions";

  const submitButton = document.createElement("button");

  submitButton.type = "submit";
  submitButton.textContent = "Lưu khảo sát";

  actions.appendChild(submitButton);
  formEl.appendChild(actions);
}

function renderField(field) {
  const wrapper = document.createElement("div");

  wrapper.className = "field";

  if (field.type === "text") {
    const label = document.createElement("label");

    label.textContent = field.label;

    const input = document.createElement("input");

    input.type = "text";
    input.value = answers[field.id] ?? "";

    input.addEventListener("input", () => {
      answers[field.id] = input.value;
    });

    wrapper.append(label, input);
  }

  if (field.type === "textarea") {
    const label = document.createElement("label");

    label.textContent = field.label;

    const textarea = document.createElement("textarea");

    textarea.value = answers[field.id] ?? "";

    textarea.addEventListener("input", () => {
      answers[field.id] = textarea.value;
    });

    wrapper.append(label, textarea);
  }

  if (field.type === "radio") {
    const label = document.createElement("div");

    label.className = "field-label";

    label.textContent = field.label;

    wrapper.appendChild(label);

    for (const option of field.options) {
      const optionLabel = document.createElement("label");

      optionLabel.className = "radio-option";

      const input = document.createElement("input");

      input.type = "radio";
      input.name = field.id;
      input.value = option.value;

      input.checked = answers[field.id] === option.value;

      input.addEventListener("change", () => {
        answers[field.id] = option.value;

        removeHiddenAnswers();
        renderForm();
      });

      optionLabel.append(input, ` ${option.label}`);

      wrapper.appendChild(optionLabel);
    }
  }

  return wrapper;
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  removeHiddenAnswers();

  const errors = validateAnswers();

  if (errors.length > 0) {
    alert(errors.join("\n"));
    return;
  }

  const submission = {
    id: crypto.randomUUID(),

    formId: facilitySurveySchema.id,

    answers: {
      ...answers,
    },

    createdAt: new Date().toISOString(),

    syncStatus: "pending",
    syncAttempts: 0,
    lastError: null,
    syncedAt: null,
  };

  await saveSubmission(submission);

  console.log("Saved locally:", submission);

  clearForm();

  await renderSubmissionList();

  if (navigator.onLine) {
    await syncPendingSubmissions();
  }
});

function validateAnswers() {
  const errors = [];

  for (const field of facilitySurveySchema.fields) {
    if (!shouldShowField(field)) {
      continue;
    }

    if (field.required && !answers[field.id]) {
      errors.push(
        `${field.label}
         là bắt buộc`
      );
    }
  }

  return errors;
}

async function renderSubmissionList() {
  const submissions = await getAllSubmissions();

  submissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  updateCounters(submissions);

  listEl.innerHTML = "";

  if (submissions.length === 0) {
    listEl.textContent = "Chưa có submission.";

    return;
  }

  for (const submission of submissions) {
    const item = document.createElement("div");

    item.className = "submission";

    const buildingLabel = getOptionLabel(
      "building",
      submission.answers.building
    );
    const facilityTypeLabel = getOptionLabel(
      "facility_type",
      submission.answers.facility_type
    );
    const conditionLabel = getOptionLabel(
      "condition",
      submission.answers.condition
    );

    item.innerHTML = `
      <strong>
        ${submission.answers.facility_name ?? "(Không tên)"}
      </strong>

      <p>Tòa nhà: ${buildingLabel}</p>
      <p>Loại hạng mục: ${facilityTypeLabel}</p>
      <p>Tình trạng: ${conditionLabel}</p>
      <p>Created: ${formatDateTime(submission.createdAt)}</p>

      <p>
        ID:
        <code>
          ${submission.id}
        </code>
      </p>

      <span class="badge">
        ${submission.syncStatus}
      </span>

      <p>
        Retry: ${submission.syncAttempts ?? 0}
      </p>

      ${submission.lastError ? `<p>Lỗi: ${submission.lastError}</p>` : ""}
    `;

    listEl.appendChild(item);
  }
}

function clearForm() {
  for (const key of Object.keys(answers)) {
    delete answers[key];
  }

  renderForm();
}

function shouldShowField(field) {
  if (!field.showIf) {
    return true;
  }

  return answers[field.showIf.field] === field.showIf.equals;
}

function getOptionLabel(fieldId, value) {
  const field = facilitySurveySchema.fields.find((f) => f.id === fieldId);

  if (!field || !field.options) {
    return value ?? "—";
  }

  const option = field.options.find((o) => o.value === value);

  return option ? option.label : value ?? "—";
}

function updateCounters(submissions) {
  const pendingCount = submissions.filter(
    (s) => s.syncStatus === "pending"
  ).length;

  const syncedCount = submissions.filter(
    (s) => s.syncStatus === "synced"
  ).length;

  pendingCounterEl.textContent = `Pending: ${pendingCount}`;
  syncedCounterEl.textContent = `Synced: ${syncedCount}`;
}

function removeHiddenAnswers() {
  for (const field of facilitySurveySchema.fields) {
    if (!shouldShowField(field)) {
      delete answers[field.id];
    }
  }
}

let syncInProgress = false;

function getRetryDelay(attempt) {
  const baseDelay = 1000;
  const maxDelay = 30000;

  return Math.min(baseDelay * 2 ** attempt, maxDelay);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function syncPendingSubmissions() {
  if (syncInProgress) {
    return;
  }

  if (!navigator.onLine) {
    console.log("Skip sync: browser is offline");
    return;
  }

  syncInProgress = true;

  try {
    const pending = await getPendingSubmissions();

    pending.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    console.log(`Sync ${pending.length} pending submission(s)`);

    await Promise.allSettled(
      pending.map((submission) => syncOneSubmission(submission))
    );
  } finally {
    syncInProgress = false;

    await renderSubmissionList();
  }
}

async function syncOneSubmission(submission) {
  while (navigator.onLine) {
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: submission.id,

          formId: submission.formId,

          answers: submission.answers,

          createdAt: submission.createdAt,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await updateSubmission(submission.id, {
        syncStatus: "synced",

        syncedAt: new Date().toISOString(),

        lastError: null,
      });

      submission.syncStatus = "synced";
      submission.syncedAt = new Date().toISOString();
      submission.lastError = null;

      console.log("Synced:", submission.id);

      await renderSubmissionList();

      break;
    } catch (error) {
      // Mỗi lần POST fail sẽ tăng retry count
      const nextAttempts = (submission.syncAttempts ?? 0) + 1;

      await updateSubmission(submission.id, {
        syncStatus: "pending",

        syncAttempts: nextAttempts,

        lastError: String(error.message ?? error),
      });

      submission.syncStatus = "pending";
      submission.syncAttempts = nextAttempts;
      submission.lastError = String(error.message ?? error);

      console.error(
        `Sync failed: ${submission.id} - retry #${nextAttempts}`,
        error
      );

      await renderSubmissionList();

      if (!navigator.onLine) {
        console.log("Browser went offline. Stop retry.");
        break;
      }

      const delay = getRetryDelay(nextAttempts - 1);

      console.log(`Retry #${nextAttempts} in ${delay}ms`);

      await wait(delay);
    }
  }
}

function formatDateTime(isoString) {
  if (!isoString) return "—";

  return new Date(isoString).toLocaleString("vi-VN");
}

window.addEventListener("online", async () => {
  updateNetworkStatus();

  console.log("Online again → try sync");

  await syncPendingSubmissions();
});

window.addEventListener("offline", updateNetworkStatus);

document
  .querySelector("#sync-button")
  .addEventListener("click", syncPendingSubmissions);

renderForm();
renderSubmissionList();
if (navigator.onLine) {
  syncPendingSubmissions();
}
