import {
  doc, setDoc, getDoc, updateDoc,
  arrayUnion, increment, serverTimestamp,
} from "firebase/firestore";

let db = null;

try {
  const fb = await import("./firebase.js");
  db = fb.db;
} catch (e) {
  console.log("Firestore not available — analytics disabled");
}


/* ── Unique visitor ID (stored in localStorage) ── */
function getVisitorId() {
  let id = localStorage.getItem("luv_visitor_id");
  if (!id) {
    id = "v_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("luv_visitor_id", id);
  }
  return id;
}


/* ── Device & browser info ── */
function getDeviceInfo() {
  const ua = navigator.userAgent;

  let browser = "Unknown";
  if (ua.includes("Firefox"))       browser = "Firefox";
  else if (ua.includes("Edg"))      browser = "Edge";
  else if (ua.includes("OPR"))      browser = "Opera";
  else if (ua.includes("Chrome"))   browser = "Chrome";
  else if (ua.includes("Safari"))   browser = "Safari";

  let os = "Unknown";
  if (ua.includes("Windows"))       os = "Windows";
  else if (ua.includes("Mac OS"))   os = "macOS";
  else if (ua.includes("Android"))  os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux"))    os = "Linux";

  return {
    browser,
    os,
    isMobile: /Mobi|Android|iPhone|iPad/i.test(ua),
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language,
  };
}


/* ── IP & location from free API ── */
async function getIpInfo() {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error("fail");
    const data = await res.json();
    return {
      ip: data.ip || "unknown",
      city: data.city || "unknown",
      region: data.region || "unknown",
      country: data.country_name || "unknown",
      countryCode: data.country_code || "unknown",
      timezone: data.timezone || "unknown",
    };
  } catch (e) {
    return { ip: "unknown", city: "unknown", region: "unknown", country: "unknown", countryCode: "unknown", timezone: "unknown" };
  }
}


/* ── Session timer ── */
let sessionStart = Date.now();
function getTimeSpent() { return Math.round((Date.now() - sessionStart) / 1000); }


/* ── Initialize: call once when app loads ── */
export async function initAnalytics() {
  if (!db) return;

  const visitorId = getVisitorId();
  const device = getDeviceInfo();
  const ip = await getIpInfo();
  const ref = doc(db, "visitors", visitorId);

  try {
    const existing = await getDoc(ref);

    if (existing.exists()) {
      await updateDoc(ref, {
        lastVisit: serverTimestamp(),
        totalPageViews: increment(1),
        device,
        ip,
        sessions: arrayUnion({
          start: new Date().toISOString(),
          referrer: document.referrer || "direct",
        }),
      });
    } else {
      await setDoc(ref, {
        visitorId,
        userId: null,
        userEmail: null,
        userName: null,
        ip,
        device,
        firstVisit: serverTimestamp(),
        lastVisit: serverTimestamp(),
        totalPageViews: 1,
        referrer: document.referrer || "direct",
        showsClicked: [],
        listenedToStream: false,
        timeSpentSeconds: 0,
        sessions: [{ start: new Date().toISOString(), referrer: document.referrer || "direct" }],
      });
    }
  } catch (e) {
    console.log("Analytics init error:", e.message);
  }

  // Update time spent every 30 seconds
  setInterval(async () => {
    try { await updateDoc(ref, { timeSpentSeconds: getTimeSpent() }); } catch (e) {}
  }, 30000);

  // Final update on page close
  window.addEventListener("beforeunload", () => {
    try { updateDoc(ref, { timeSpentSeconds: getTimeSpent() }); } catch (e) {}
  });
}


/* ── Track: user logged in ── */
export async function trackUserLogin(user) {
  if (!db || !user) return;
  try {
    await updateDoc(doc(db, "visitors", getVisitorId()), {
      userId: user.uid,
      userEmail: user.email || null,
      userName: user.displayName || null,
    });
  } catch (e) {}
}


/* ── Track: show card clicked ── */
export async function trackShowClick(showTitle) {
  if (!db) return;
  try {
    await updateDoc(doc(db, "visitors", getVisitorId()), {
      showsClicked: arrayUnion(showTitle),
    });
  } catch (e) {}
}


/* ── Track: listened to stream ── */
export async function trackStreamListen() {
  if (!db) return;
  try {
    await updateDoc(doc(db, "visitors", getVisitorId()), {
      listenedToStream: true,
      lastStreamListen: serverTimestamp(),
    });
  } catch (e) {}
}

