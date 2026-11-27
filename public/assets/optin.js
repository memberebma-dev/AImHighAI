// Shared lead-magnet form handler. Any <form data-magnet="..."> posts to /api/optin.
(function () {
  var params = new URLSearchParams(location.search);
  var utm = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref", "plan"].forEach(function (k) {
    if (params.get(k)) utm[k] = params.get(k);
  });
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var ICON = { good: "✅", warn: "⚠️", bad: "❌" };

  function renderReport(r, email) {
    var el = document.getElementById("audit-result");
    if (!el || !r) return;
    var rows = r.findings.map(function (f) {
      return '<div class="card" style="margin:10px 0"><b>' + ICON[f.severity] + " " + esc(f.headline) + "</b><br><span class=\"mute\">" + esc(f.detail) + "</span></div>";
    }).join("");
    var fixes = r.topFixes.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("");
    var comp = r.competitors.length ? "<h3>Who you're up against</h3><ul>" + r.competitors.map(function (c) {
      return "<li>" + esc(c.name) + ": " + c.reviewCount + " reviews" + (c.rating ? ", " + c.rating + "★" : "") + "</li>";
    }).join("") + "</ul>" : "";
    var o = r.offer;
    var offer = o ? '<div class="card"><h3 style="margin-top:0">Want this fixed for you?</h3><p>Our <b>' + esc(o.name) + "</b> plan: " +
      (o.setupPrice ? "$" + o.setupPrice + " setup + " : "") + "$" + o.monthlyPrice + "/mo. " + esc(o.pitch) + '.</p>' +
      '<button type="button" class="btn" id="buy-offer">Get this set up →</button>' +
      '<p class="mute" style="font-size:13px;margin-top:8px">Secure checkout by Stripe. Cancel anytime.</p></div>' : "";
    var mailto = o ? "mailto:memberebma@gmail.com?subject=" + encodeURIComponent("Set up " + o.name + " for " + r.business) : "";
    var today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    el.innerHTML = '<p class="print-only mute">AImHighAI · Lead Leak Audit · ' + esc(r.city || "") + " · " + today + ' · aimhighai.vercel.app</p>' +
      '<p class="no-print"><button type="button" class="btn" id="print-report">⬇ Save as PDF / Print</button></p>' +
      '<h2>' + esc(r.business) + ': <span class="big">' + r.score + '</span>/100</h2>' +
      (r.found ? "" : "<p>We searched Google Maps and couldn't find you. That's the biggest leak of all.</p>") +
      rows + "<h3>Your top 3 fixes</h3><ol>" + fixes + "</ol>" + comp + offer;
    var buy = document.getElementById("buy-offer");
    if (buy) buy.addEventListener("click", async function () {
      buy.disabled = true; buy.innerHTML = '<span class="spin" aria-hidden="true"></span>Opening secure checkout…';
      try {
        var res = await fetch("/api/stripe/offer-checkout", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offerId: o.id, business: r.business, email: email || "" })
        });
        var data = await res.json().catch(function () { return {}; });
        if (res.ok && data.url) { location.href = data.url; return; }
        throw new Error(data.error || "unavailable");
      } catch (err) {
        // Checkout down: fall back to emailing us so the lead isn't lost.
        location.href = mailto;
        buy.disabled = false; buy.textContent = "Get this set up →";
      }
    });
    document.getElementById("print-report").addEventListener("click", function () {
      // The browser's print window has "Save as PDF" (phones: Share → Save to Files / Print).
      var oldTitle = document.title;
      document.title = "Lead Leak Audit - " + r.business; // becomes the PDF file name
      window.print();
      setTimeout(function () { document.title = oldTitle; }, 1000);
    });
    el.scrollIntoView({ behavior: "smooth" });
  }

  // Back from Stripe Checkout.
  if (params.get("paid") === "1" || params.get("canceled") === "1") {
    var form0 = document.querySelector("form[data-magnet]");
    var note = document.createElement("div");
    note.className = "card"; note.setAttribute("role", "status"); note.style.margin = "0 0 16px";
    note.innerHTML = params.get("paid") === "1"
      ? "<b>✅ Payment received. Thank you!</b><br>We'll email you within 1 business day to start setup."
      : "Checkout was canceled. No charge was made. You can run the audit again anytime.";
    if (form0 && form0.parentNode) form0.parentNode.insertBefore(note, form0);
  }

  document.querySelectorAll("form[data-magnet]").forEach(function (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var btn = form.querySelector("button[type=submit]");
      var msg = form.querySelector(".msg");
      var f = new FormData(form);
      var consentBox = form.querySelector("input[name=consent]");
      var details = {};
      form.querySelectorAll("[data-detail]").forEach(function (el) {
        var n = Number(el.value); details[el.name] = isNaN(n) || el.value === "" ? el.value : n;
      });
      var payload = {
        magnet: form.dataset.magnet,
        email: f.get("email"), name: f.get("name"), business: f.get("business"),
        city: f.get("city"), phone: f.get("phone"), hp_extra: f.get("hp_extra"),
        consent: !!(consentBox && consentBox.checked),
        consentText: consentBox ? consentBox.parentElement.textContent.trim() : "",
        source: location.pathname + (document.referrer ? " ← " + document.referrer : ""), utm: utm, details: details
      };
      var isAudit = form.dataset.magnet === "lead-leak-audit";
      btn.disabled = true; msg.className = "msg";
      msg.innerHTML = '<span class="spin" aria-hidden="true"></span>' + (isAudit ? "Checking Google Maps, reviews and competitors… (about 30 seconds)" : "Sending…");
      try {
        var r = await fetch("/api/optin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        var data = await r.json().catch(function () { return {}; });
        if (!r.ok) throw new Error(data.error || "Something went wrong. Please try again.");
        msg.className = "msg ok";
        if (isAudit && !data.report) {
          msg.textContent = "Got it! We couldn't run the automatic check right now, so we'll send your audit by email within 1 business day.";
        } else {
          msg.textContent = form.dataset.success || "Got it! Check your inbox.";
        }
        renderReport(data.report, f.get("email"));
        form.reset();
      } catch (err) {
        msg.className = "msg err"; msg.textContent = err.message;
      } finally { btn.disabled = false; }
    });
  });
})();
