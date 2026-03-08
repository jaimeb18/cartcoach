import { API_BASE_URL } from "@shared/constants";
import type { ExtractedProduct, FinanceAnalysis, UserProfile } from "@shared/types";

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "PRODUCT_DETECTED") {
    const { product, profile } = message.payload as {
      product: ExtractedProduct;
      profile: UserProfile;
    };
    analyzeProduct(product, profile).then(sendResponse);
    return true; // Keep message channel open for async response
  }

  if (message.type === "SET_COOLDOWN_REMINDER") {
    const { product, hours } = message.payload as {
      product: ExtractedProduct;
      hours: number;
    };
    scheduleCooldownReminder(product, hours);
    return false;
  }
});

async function analyzeProduct(
  product: ExtractedProduct,
  profile: UserProfile
): Promise<FinanceAnalysis> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, profile }),
    });
    if (!res.ok) throw new Error("Backend unreachable");
    const data = await res.json();
    // Normalize: backend sends futureValue5Y, frontend expects futureValue5y
    if (data.futureValue5Y !== undefined && data.futureValue5y === undefined) {
      data.futureValue5y = data.futureValue5Y;
    }
    return data;
  } catch {
    // Fallback local calculation
    return fallbackAnalysis(product, profile);
  }
}

function fallbackAnalysis(
  product: ExtractedProduct,
  profile: UserProfile
): FinanceAnalysis {
  const remaining = profile.monthlyBudget - profile.monthlySaved;
  const budgetPct = Math.round((product.price / profile.monthlyBudget) * 100);
  const monthlySavingsRate = Math.max(1, profile.monthlyBudget * 0.2);
  const goalDelayDays = Math.round((product.price / monthlySavingsRate) * 30);
  const futureValue5y = parseFloat((product.price * Math.pow(1.07, 5)).toFixed(2));

  let riskScore = 0;
  riskScore += Math.min(40, budgetPct * 1.2);
  if (product.price > remaining) riskScore += 30;
  if (goalDelayDays > 7) riskScore += 20;
  if (profile.watchedCategories.includes(product.category)) riskScore += 10;
  riskScore = Math.min(100, Math.round(riskScore));

  const riskLevel: "Low" | "Medium" | "High" =
    riskScore < 33 ? "Low" : riskScore < 66 ? "Medium" : "High";

  return {
    showPopup: riskScore > 15,
    riskScore,
    riskLevel,
    budgetImpact: `${budgetPct}% of monthly budget`,
    remainingBudget: remaining - product.price,
    goalDelayDays,
    futureValue5y,
    recommendation:
      riskLevel === "High"
        ? `Consider waiting ${profile.cooldownHours} hours before buying.`
        : riskLevel === "Medium"
        ? "Is this a want or a need?"
        : "This fits comfortably within your budget.",
    message: `$${product.price} is ${budgetPct}% of your monthly budget and could delay your "${profile.savingsGoal.name}" goal by ${goalDelayDays} days.`,
    alternatives: [],
  };
}

function scheduleCooldownReminder(product: ExtractedProduct, hours: number) {
  const alarmName = `cooldown-${product.productName.slice(0, 20)}-${Date.now()}`;
  chrome.alarms.create(alarmName, { delayInMinutes: hours * 60 });

  // Store the pending reminder
  chrome.storage.local.get("cartcoach_reminders", (result) => {
    const reminders = result["cartcoach_reminders"] ?? [];
    reminders.push({ alarmName, product, createdAt: Date.now(), hours });
    chrome.storage.local.set({ cartcoach_reminders: reminders });
  });
}

// Handle alarm — show notification when cooldown expires
chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith("cooldown-")) return;

  chrome.storage.local.get("cartcoach_reminders", (result) => {
    const reminders = result["cartcoach_reminders"] ?? [];
    const reminder = reminders.find(
      (r: { alarmName: string }) => r.alarmName === alarm.name
    );
    if (!reminder) return;

    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "CartCoach Reminder",
      message: `Still thinking about "${reminder.product.productName}"? Ready to make a decision?`,
    });

    const updated = reminders.filter(
      (r: { alarmName: string }) => r.alarmName !== alarm.name
    );
    chrome.storage.local.set({ cartcoach_reminders: updated });
  });
});

// Open onboarding on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("onboarding/index.html"),
    });
  }
});
