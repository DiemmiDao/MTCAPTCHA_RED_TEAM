document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");

  
  const statusText = document.getElementById("status-text") || createStatusText();
  const debugCard = document.getElementById("debug-card") || createDebugCard();
  const debugOutput = document.getElementById("debug-output");

  
  function createStatusText() {
    const form = document.getElementById("registerForm");
    const div = document.createElement("div");
    div.id = "status-text";
    div.style.marginTop = "8px";
    div.style.fontSize = "0.9rem";
    form.insertAdjacentElement("afterend", div);
    return div;
  }

  
  function createDebugCard() {
    const status = document.getElementById("status-text");
    const card = document.createElement("div");
    card.id = "debug-card";
    card.style.marginTop = "16px";
    card.style.padding = "12px";
    card.style.border = "1px solid #ddd";
    card.style.borderRadius = "8px";
    card.style.background = "#fafafa";

    const title = document.createElement("h2");
    title.textContent = "Debug / Research Output";
    title.style.marginTop = "0";
    title.style.fontSize = "1rem";

    const pre = document.createElement("pre");
    pre.id = "debug-output";
    pre.textContent = "Waiting for a registration attempt...";
    pre.style.background = "#0b1020";
    pre.style.color = "#e6e6e6";
    pre.style.padding = "10px";
    pre.style.borderRadius = "6px";
    pre.style.fontSize = "0.9rem";
    pre.style.whiteSpace = "pre-wrap";
    pre.style.wordBreak = "break-word";
    pre.style.maxHeight = "400px";
    pre.style.overflow = "auto";

    card.appendChild(title);
    card.appendChild(pre);
    status.insertAdjacentElement("afterend", card);

    return card;
  }


  function findTokenInput() {
    return document.querySelector('input[name="mtcaptcha-verifiedtoken"]');
  }

  function explainToken(token) {
    if (!token || typeof token !== "string") {
      return { error: "No token or invalid token", raw: token };
    }

    if (!token.startsWith("v1(") || !token.endsWith(")")) {
      return { error: "Unexpected token format", raw: token };
    }

  
    const inner = token.slice(3, -1);
    const parts = inner.split(",");

    if (parts.length < 5) {
      return {
        error: "Token does not have 5 comma-separated parts",
        rawInner: inner,
        parts,
      };
    }

    const [mtCaptchaChecksum, customerChecksum, sitekey, randomSeed, ...rest] =
      parts;
    const encryptedTokenInfo = rest.join(","); 

    return {
      mtCaptchaChecksum,
      customerChecksum,
      sitekey,
      randomSeed,
      encryptedTokenInfo,
    };
  }


  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("registerConfirmPassword").value;

    if (!name || !email || !password) {
      statusText.textContent = "Please fill out all required fields.";
      return;
    }

    if (password !== confirmPassword) {
      statusText.textContent = "Passwords do not match. Please try again.";
      return;
    }

    const captchaField = findTokenInput();
    if (!captchaField || !captchaField.value) {
      statusText.textContent = "Please complete the CAPTCHA verification.";
      return;
    }

    const captchaToken = captchaField.value;

  
    const tokenDetails = explainToken(captchaToken);

    const payload = { name, email, password, token: captchaToken };

    statusText.textContent = "Submitting registration to backend…";

    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      
      const checktokenResponse =
        result.checktoken || result.raw_checktoken || result.raw_response || null;

     
      const debugPayload = {
        nameEntered: name,                 // 1. Name Entered
        emailEntered: email,               // 2. Email Entered
        passwordEntered: password,         // 3. Password Entered
        receivedToken: captchaToken,       // 4. Received Token
        tokenBreakdown: tokenDetails,      // 5. Token Breakdown
        mtcaptchaChecktokenResponse: checktokenResponse, // 6. checktoken response
        backendSuccess: result.success,
        backendMessage: result.message,
      };

      debugOutput.textContent = JSON.stringify(debugPayload, null, 2);

      statusText.textContent = result.success
        ? "Registration + CAPTCHA verification succeeded."
        : "Registration failed: " + (result.message || "Unknown error.");
    } catch (error) {
      console.error("Error during registration:", error);
      statusText.textContent =
        "An error occurred while contacting the server. Please try again.";
    }
  });
});