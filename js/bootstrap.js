var PLANCOMPARE_BASE = "https://plancompared.com/";
var PLANCOMPARE_REDIRECT_DELAY_MS = 7000;
var plancompareRedirectTimerId = null;

function isMobileForPlancompareRedirect() {
  if (typeof window.innerWidth === "number" && window.innerWidth < 768) {
    return true;
  }
  var ua = navigator.userAgent || "";
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    ua.toLowerCase(),
  );
}

function passesPlancompareUrlGate() {
  var params = new URLSearchParams(window.location.search);
  if (params.get("key") !== "X184GA") return false;
  var mb = params.get("mb");
  if (mb == null || String(mb).trim() === "") return false;
  return true;
}

function trackGTG(e) {
  e.preventDefault();

  const phoneLink = document.getElementById("phone-number").href;

  window.dataLayer = window.dataLayer || [];
  dataLayer.push({ event: "gtg_clicked" });

  try {
    if (typeof fbq === "function") {
      fbq("track", "Lead");
    }
  } catch (err) {}

  if (
    localStorage.getItem("gtg") === null &&
    passesPlancompareUrlGate() &&
    isMobileForPlancompareRedirect()
  ) {
    if (plancompareRedirectTimerId != null) {
      clearTimeout(plancompareRedirectTimerId);
      plancompareRedirectTimerId = null;
    }
    plancompareRedirectTimerId = setTimeout(function () {
      plancompareRedirectTimerId = null;
      if (localStorage.getItem("gtg") !== null) return;
      if (!passesPlancompareUrlGate()) return;
      if (!isMobileForPlancompareRedirect()) return;
      var q = window.location.search || "";
      window.location.href =
        PLANCOMPARE_BASE.replace(/\/?$/, "/") + (q || "");
    }, PLANCOMPARE_REDIRECT_DELAY_MS);
  }

  setTimeout(() => {
    window.location.href = phoneLink;
  }, 150);
}

(function captureOriginalUrlParams() {
  try {
    if (sessionStorage.getItem("original_url_params")) return;

    const originalUrl = new URL(window.location.href);
    const originalParams = {};
    originalUrl.searchParams.forEach((value, key) => {
      originalParams[key] = value;
    });
    sessionStorage.setItem(
      "original_url_params",
      JSON.stringify(originalParams),
    );

    if (Object.keys(originalParams).length > 0) {
      console.log("Original URL parameters captured:", originalParams);
    } else {
      console.log("No URL parameters found on initial load");
    }
  } catch (e) {
    console.error("Error capturing original URL parameters:", e);
  }
})();

(async () => {
  function pushParams(params) {
    // Start from the current URL so page-added params (age, qualified, etc.) are never wiped
    const u = new URL(location.href);
    const storedParams = sessionStorage.getItem("original_url_params");

    if (storedParams) {
      try {
        const originalParams = JSON.parse(storedParams);
        for (const [k, v] of Object.entries(originalParams)) {
          if (!u.searchParams.has(k) && v != null && v !== "") {
            u.searchParams.set(k, v);
          }
        }
      } catch (e) {
        console.error("Error restoring original params:", e);
      }
    }

    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") u.searchParams.set(k, v);
    }

    const newUrl = u.toString();
    if (newUrl !== location.href) {
      history.replaceState({}, "", newUrl);
    }
  }

  const clickReq = fetch("./clickid.php", {
    method: "POST",
    credentials: "include",
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .catch(() => null);

  const clickRes = await clickReq;

  const updates = {};

  if (clickRes && clickRes.debug && clickRes.debug.rtkID) {
    console.log("rtkID from API:", clickRes.debug.rtkID);
  }

  if (clickRes && clickRes.ok && clickRes.clickid) {
    localStorage.setItem("rt_clickid", clickRes.clickid);
    updates.clickid = clickRes.clickid;
  } else {
    const u = new URL(location.href);
    const fromUrl = u.searchParams.get("clickid");
    const fromLS = localStorage.getItem("rt_clickid");
    if (fromUrl && !fromLS) localStorage.setItem("rt_clickid", fromUrl);
    if (!fromUrl && fromLS) updates.clickid = fromLS;
  }

  if (Object.keys(updates).length) pushParams(updates);
})();

(async () => {
  try {
    const gtgReq = fetch("./gtg.php?" + window.location.search, {
      method: "GET",
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .catch(() => null);

    const gtgRes = await gtgReq;

    if (gtgRes && gtgRes.success) {
      if (gtgRes.gtg !== null) {
        localStorage.setItem("gtg", gtgRes.gtg);
      } else {
        localStorage.removeItem("gtg");
      }
    }
  } catch (error) {
    console.error("GTG fetch error:", error);
  }
})();

window.phoneNumberData = null;

function updatePhoneNumberInDOM(phoneNumber, formattedNumber) {
  const digits = String(phoneNumber).replace(/\D/g, "");
  const phoneElement = document.getElementById("phone-number");
  if (phoneElement && digits.length >= 10) {
    phoneElement.href = "tel:+" + digits;
  }
  const phoneTextElement = document.getElementById("phone_retreaver");
  if (phoneTextElement && formattedNumber) {
    phoneTextElement.textContent = formattedNumber;
  }
}

window.updatePhoneNumberInDOM = updatePhoneNumberInDOM;

/** Navigate to a sibling quiz page while keeping the current query string. */
function navigateWithParams(pathname) {
  const url = new URL(pathname, window.location.href);
  url.search = window.location.search;
  window.location.href = url.toString();
}

window.navigateWithParams = navigateWithParams;
