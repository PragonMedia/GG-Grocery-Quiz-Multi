// Helper function to preserve all original URL parameters when modifying URL
// This ensures tracking parameters (bbg_*, mb, account, angle, key, channel, etc.) are never lost
function preserveUrlParams(url) {
  const storedParams = sessionStorage.getItem("original_url_params");
  if (storedParams) {
    try {
      const originalParams = JSON.parse(storedParams);
      for (const [k, v] of Object.entries(originalParams)) {
        if (!url.searchParams.has(k) && v != null && v !== "") {
          url.searchParams.set(k, v);
        }
      }
    } catch (e) {
      console.error("Error preserving original params:", e);
    }
  }
  return url;
}

function buildUrlWithCurrentParams() {
  let url = new URL(window.location.href);
  url = preserveUrlParams(url);
  return url;
}

function navigateToPage(filename, url) {
  const target = new URL(filename, window.location.href);
  target.search = url.search;
  window.location.href = target.toString();
}

// Show loader on phone button (called before fetching number.php)
function setPhoneButtonLoading(loading) {
  const link = document.getElementById("phone-number");
  const textEl = document.getElementById("phone_retreaver");
  if (!link || !textEl) return;
  if (loading) {
    link.classList.add("phone-number-loading");
    link.href = "javascript:void(0)";
    link.style.pointerEvents = "none";
    textEl.textContent = "Loading...";
  } else {
    link.classList.remove("phone-number-loading");
    link.style.pointerEvents = "";
  }
}

// Reactive phone number update - called ONLY when we are about to show the phone step (qualified users).
async function updatePhoneNumberReactive() {
  if (!window.updatePhoneNumberInDOM) return;

  const link = document.getElementById("phone-number");
  const textEl = document.getElementById("phone_retreaver");
  if (!link || !textEl) return;

  setPhoneButtonLoading(true);

  try {
    let url = "./number.php";
    if (window.domainRouteData && window.domainRouteData.routeData && window.domainRouteData.routeData.phoneNumber) {
      const raw = String(window.domainRouteData.routeData.phoneNumber).replace(/\D/g, "");
      url += "?phoneNumber=" + encodeURIComponent(raw);
    }
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = response.ok ? await response.json() : null;
    if (data && data.success && data.phone_number) {
      const raw = String(data.phone_number).replace(/\D/g, "");
      const formatted = data.formatted_number || (raw.length >= 11 ? "+1 (" + raw.slice(1, 4) + ") " + raw.slice(4, 7) + "-" + raw.slice(7, 11) : raw);
      window.updatePhoneNumberInDOM(raw, formatted);
      window.phoneNumberData = { phone_number: raw, formatted_number: formatted };
    }

    await loadRingba();
  } catch (error) {
    console.error("Error fetching phone number or loading Ringba (qualified step):", error);
  } finally {
    setPhoneButtonLoading(false);
  }
}

function getDomainAndRoute() {
  const url = new URL(window.location.href);
  let domain = url.hostname;
  domain = domain.replace(/^www\./, "");
  const path = url.pathname;
  const pathSegments = path
    .split("/")
    .filter((segment) => segment && !segment.includes("."));
  const route = pathSegments[0] || "";
  return { domain, route };
}

async function fetchRouteData(domain, route) {
  if (!domain || !route) return null;
  try {
    const apiUrl = `/api/v1/domain-route-details?domain=${encodeURIComponent(domain)}&route=${encodeURIComponent(route)}`;
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error fetching route data:", error);
    return null;
  }
}

let ringbaID = "CAd4c016a37829477688c3482fb6fd01de";

(async function initRingbaID() {
  const { domain, route } = getDomainAndRoute();
  if (domain && route) {
    const apiData = await fetchRouteData(domain, route);
    if (apiData && apiData.success && apiData.routeData) {
      window.domainRouteData = apiData;
      if (apiData.routeData.ringbaID) {
        ringbaID = apiData.routeData.ringbaID;
        console.log("ringbaID from API:", ringbaID);
      } else {
        console.log("ringbaID from fallback:", ringbaID);
      }
    } else {
      console.log("ringbaID from fallback:", ringbaID);
    }
  } else {
    console.log("ringbaID from fallback:", ringbaID);
  }
})();

function trackRingbaTrigger() {
  const domain = (window.location.hostname || "").replace(/^www\./, "").trim();
  if (!domain) return;
  fetch("/api/v1/track/ringba-trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain }),
    credentials: "include",
  }).catch((err) => console.error("Ringba trigger track error:", err));
}

const loadRingba = () => {
  trackRingbaTrigger();
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="b-js.ringba.com"]')) {
      resolve();
      return;
    }
    var script = document.createElement("script");
    script.src = `//b-js.ringba.com/${ringbaID}`;
    let timeoutId = setTimeout(addRingbaTags, 1000);
    script.onload = function () {
      clearTimeout(timeoutId);
      addRingbaTags();
      resolve();
    };
    script.onerror = () => reject(new Error("Ringba script failed to load"));
    document.head.appendChild(script);
  });
};

function addRingbaTags() {
  let qualifiedValue = new URL(window.location.href).searchParams.get("qualified") || "unknown";
  let ageValue = new URL(window.location.href).searchParams.get("age") || "unknown";
  let gtgValue = localStorage.getItem("gtg");

  window._rgba_tags = window._rgba_tags || [];

  window._rgba_tags.push({ type: "RT" });
  window._rgba_tags.push({ track_attempted: "yes" });
  window._rgba_tags.push({ qualified: qualifiedValue });
  window._rgba_tags.push({ age: ageValue });

  if (gtgValue !== null && gtgValue !== undefined && gtgValue !== "") {
    window._rgba_tags.push({ gtg: gtgValue });
  }

  console.log("Sending initial tags to Ringba:", {
    type: "RT",
    track_attempted: "yes",
    qualified: qualifiedValue,
    age: ageValue,
    gtg: gtgValue,
  });

  var intervalId = setInterval(() => {
    if (window.testData && window.testData.rtkcid !== undefined) {
      window._rgba_tags.push({ clickid: window.testData.rtkcid });
      window._rgba_tags.push({ qualified: qualifiedValue });
      window._rgba_tags.push({ age: ageValue });

      if (gtgValue !== null && gtgValue !== undefined && gtgValue !== "") {
        window._rgba_tags.push({ gtg: gtgValue });
      }

      console.log("Sending click tags to Ringba:", {
        clickid: window.testData.rtkcid,
        qualified: qualifiedValue,
        age: ageValue,
        gtg: gtgValue,
      });
      clearInterval(intervalId);
    }
  }, 500);
};

function startCountdown() {
  var countdownElement = document.getElementById("countdown");
  if (!countdownElement) return;
  var timeLeft = 30;
  var countdownInterval = setInterval(function () {
    var minutes = Math.floor(timeLeft / 60);
    var seconds = timeLeft % 60;
    var formattedTime =
      (minutes < 10 ? "0" : "") + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
    countdownElement.innerHTML = formattedTime;
    if (timeLeft <= 0) clearInterval(countdownInterval);
    timeLeft--;
  }, 1000);
}

function updateAgeGroup(ageGroup) {
  let url = new URL(window.location.href);
  url = preserveUrlParams(url);
  url.searchParams.delete("u65consumer");
  url.searchParams.delete("o65consumer");
  if (ageGroup === "under65") {
    url.searchParams.set("u65consumer", "true");
  } else if (ageGroup === "over65") {
    url.searchParams.set("o65consumer", "true");
  }
  window.history.replaceState({}, "", url);
}

function showResultPanel() {
  var questionPanel = document.getElementById("medicare-question");
  var resultPanel = document.getElementById("form-result");
  if (questionPanel) questionPanel.style.display = "none";
  if (resultPanel) {
    resultPanel.style.display = "block";
    resultPanel.classList.add("active");
  }
}

function setClaimNowIframe(clickID, mbParam) {
  var claimNowIframeUrl =
    "https://policyfinds.com/sq1/claim-button.html?clickid=" +
    encodeURIComponent(clickID) +
    "&mb=" +
    encodeURIComponent(mbParam);
  var claimNowIframe = document.getElementById("claim-now-iframe");
  if (claimNowIframe) {
    claimNowIframe.src = claimNowIframeUrl;
  }
}

// html1: Get Started → html2
$("#get-started-btn").on("click", function () {
  var url = buildUrlWithCurrentParams();
  window.history.replaceState({}, "", url);
  navigateToPage("html2.html", url);
});

// html2: Age → html3
$("button.form-step-btn[data-form-step='2']").on("click", function () {
  var buttonValue = $(this).attr("data-form-value");
  var newUrl = buildUrlWithCurrentParams();

  if (buttonValue === "below 65") {
    newUrl.searchParams.delete("age");
    newUrl.searchParams.set("age", "65");
    newUrl.searchParams.delete("u65consumer");
    newUrl.searchParams.delete("o65consumer");
    newUrl.searchParams.set("u65consumer", "true");
  } else if (buttonValue === "65 - 70") {
    newUrl.searchParams.delete("age");
    newUrl.searchParams.set("age", "70");
    newUrl.searchParams.delete("u65consumer");
    newUrl.searchParams.delete("o65consumer");
    newUrl.searchParams.set("o65consumer", "true");
  } else if (buttonValue === "71 - 75") {
    newUrl.searchParams.delete("age");
    newUrl.searchParams.set("age", "75");
    newUrl.searchParams.delete("u65consumer");
    newUrl.searchParams.delete("o65consumer");
  } else if (buttonValue === "76 and older") {
    newUrl.searchParams.delete("age");
    newUrl.searchParams.set("age", "80");
    newUrl.searchParams.delete("u65consumer");
    newUrl.searchParams.delete("o65consumer");
  }

  navigateToPage("html3.html", newUrl);
});

// html3: Medicare → result (same page)
$("button.form-step-btn[data-form-step='3']").on("click", function () {
  var buttonValue = $(this).attr("data-form-value");
  var newUrl = buildUrlWithCurrentParams();

  if (buttonValue === "Yes") {
    newUrl.searchParams.delete("qualified");
    newUrl.searchParams.set("qualified", "yes");
  } else if (buttonValue === "No") {
    newUrl.searchParams.delete("qualified");
    newUrl.searchParams.set("qualified", "no");

    var clickID = localStorage.getItem("rt_clickid") || newUrl.searchParams.get("clickid") || "";
    var mbParam = newUrl.searchParams.get("mb") || "";
    var gtgValue = localStorage.getItem("gtg");
    if (gtgValue !== "1") {
      setClaimNowIframe(clickID, mbParam);
    }
  }

  window.history.replaceState({}, "", newUrl);
  showResultPanel();

  var phoneCta = document.getElementById("phone-number");
  var claimContactCta = document.getElementById("claim-now-contact-button");
  var claimWrapper = document.getElementById("claim-now-wrapper");

  if (phoneCta) phoneCta.style.display = "none";
  if (claimContactCta) claimContactCta.style.display = "none";
  if (claimWrapper) claimWrapper.style.display = "none";

  if (buttonValue === "Yes") {
    (async function () {
      await updatePhoneNumberReactive();
      var phoneEl = document.getElementById("phone-number");
      if (phoneEl) {
        phoneEl.style.display = "block";
      }
      startCountdown();
    })();
  } else {
    var gtgValue = localStorage.getItem("gtg");
    if (gtgValue === "1") {
      if (claimContactCta) claimContactCta.style.display = "block";
    } else {
      var currentUrl = buildUrlWithCurrentParams();
      var clickID =
        localStorage.getItem("rt_clickid") || currentUrl.searchParams.get("clickid") || "";
      var mbParam = currentUrl.searchParams.get("mb") || "";
      setClaimNowIframe(clickID, mbParam);
      if (claimWrapper) claimWrapper.style.display = "block";
    }
    startCountdown();
  }
});

let userId = localStorage.getItem("user_id");
if (!userId) {
  userId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  localStorage.setItem("user_id", userId);
}

function gtag_report_conversion(url) {
  console.log("Google Tag Manager conversion event fired", {
    url: url,
    send_to: "AW-16921817895/4s4iCJv-wb8bEKfm-YQ_",
  });
  var callback = function () {
    if (typeof url != "undefined") {
      window.location = url;
    }
  };
  gtag("event", "conversion", {
    send_to: "AW-16921817895/4s4iCJv-wb8bEKfm-YQ_",
    value: 1.0,
    currency: "USD",
    event_callback: callback,
  });
  return false;
}
