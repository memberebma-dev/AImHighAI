// Shared lead-magnet form handler. Any <form data-magnet="..."> posts to /api/optin.
(function () {
  var params = new URLSearchParams(location.search);
  var utm = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref"].forEach(function (k) {
    if (params.get(k)) utm[k] = params.get(k);
  });
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
        city: f.get("city"), phone: f.get("phone"), website: f.get("website"),
        consent: !!(consentBox && consentBox.checked),
        consentText: consentBox ? consentBox.parentElement.textContent.trim() : "",
        source: document.referrer || location.pathname, utm: utm, details: details
      };
      btn.disabled = true; msg.className = "msg"; msg.textContent = "Sending…";
      try {
        var r = await fetch("/api/optin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        var data = await r.json().catch(function () { return {}; });
        if (!r.ok) throw new Error(data.error || "Something went wrong.");
        msg.className = "msg ok";
        msg.textContent = form.dataset.success || "Got it! Check your inbox within one business day.";
        form.reset();
      } catch (err) {
        msg.className = "msg err"; msg.textContent = err.message;
      } finally { btn.disabled = false; }
    });
  });
})();
