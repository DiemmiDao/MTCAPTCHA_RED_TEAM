require("dotenv").config();
console.log("Captcha key loaded:", !!process.env.MTCAPTCHA_PRIVATE_KEY);

const express = require("express");
const https = require("https");
const path = require("path");
const config = require("./config");
const app = express();

const { MTCAPTCHA_PRIVATE_KEY, MTCAPTCHA_SITE_KEY } = config;

const users = [];


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/users", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "users.html"));
});


function explainToken(token) {
  if (!token || typeof token !== "string") {
    console.log("No token to explain");
    return null;
  }

  if (!token.startsWith("v1(") || !token.endsWith(")")) {
    console.warn("Unexpected token format:", token);
    return null;
  }

  const inner = token.slice(3, -1);
  const parts = inner.split(",");

  if (parts.length < 5) {
    console.warn("Token does not have 5 parts:", parts);
    return null;
  }

  const [
    mtCaptchaChecksum,   
    customerChecksum,    
    sitekey,             
    randomSeed,          
    encryptedTokenInfo   
  ] = parts;

  console.log("Token breakdown:");
  console.log("  1) MTCaptcha Checksum :", mtCaptchaChecksum);
  console.log("  2) Customer Checksum  :", customerChecksum);
  console.log("  3) Sitekey            :", sitekey);
  console.log("  4) Random Seed        :", randomSeed);
  console.log("  5) Encrypted TokenInfo:", encryptedTokenInfo);

  return {
    mtCaptchaChecksum,
    customerChecksum,
    sitekey,
    randomSeed,
    encryptedTokenInfo,
  };
}

app.post("/register", (req, res) => {
  const { name, email, comments, token } = req.body;
  console.log("Entered Name:", name);
  console.log("Entered Email:", email);
  console.log("Entered Comments:", comments);

  if (!name || !email || !token) {
    return res.json({
      success: false,
      message: "Missing required fields or CAPTCHA token.",
    });
  }

  console.log("Received token:", token);
  const tokenBreakdown = explainToken(token);

  if (!MTCAPTCHA_PRIVATE_KEY) {
    console.warn("MTCAPTCHA_PRIVATE_KEY missing.");
    return res.json({ success: false, message: "Server misconfigured." });
  }

  const verifyUrl =
    "https://service.mtcaptcha.com/mtcv1/api/checktoken" +
    `?privatekey=${encodeURIComponent(MTCAPTCHA_PRIVATE_KEY)}` +
    `&token=${encodeURIComponent(token)}`;

  console.log("\n[Backend -> MTCaptcha] GET checktoken");
  console.log("URL:", verifyUrl);

  // Prepare verification request log
  const verificationRequest = {
    url: verifyUrl,
    method: "GET",
    timestamp: new Date().toISOString()
  };

  https
    .get(verifyUrl, (apiRes) => {
      let data = "";
      apiRes.on("data", (chunk) => (data += chunk));
      apiRes.on("end", () => {
        try {
          const result = JSON.parse(data);

          console.log("\n[MTCaptcha -> Backend] checktoken response:");
          console.log(JSON.stringify(result, null, 2));
          console.log("=============================================\n");

          // Prepare verification response log
          const verificationResponse = {
            status: apiRes.statusCode,
            statusMessage: apiRes.statusMessage,
            data: result,
            timestamp: new Date().toISOString()
          };

          if (result.success) {
            users.push({ name, email, comments });
            console.log(`New user registered: ${email}`);
            console.log("------------------------");
            return res.json({
              success: true,
              message: "Registration successful.",
              checktoken: result,      
              receivedToken: token,    
              tokenBreakdown,
              verificationRequest: verificationRequest,
              verificationResponse: verificationResponse
            });
          } else {
            console.warn(
              "CAPTCHA verification failed:",
              result.fail_codes || result
            );
            return res.json({
              success: false,
              message: "CAPTCHA verification failed. Please try again.",
              checktoken: result,      
              receivedToken: token,
              verificationRequest: verificationRequest,
              verificationResponse: verificationResponse,
              tokenBreakdown,
            });
          }
        } catch (err) {
          console.error(
            "Error parsing CAPTCHA verification response:",
            err
          );
          return res.json({
            success: false,
            message: "Error verifying CAPTCHA. Please try again.",
          });
        }
      });
    })
    .on("error", (err) => {
      console.error("Request error:", err);
      return res.json({
        success: false,
        message: "Verification service error. Please try again later.",
      });
    });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3018;
  app.listen(PORT, () => {
    console.log(`MTCaptcha demo server running at http://localhost:${PORT}`);
    if (!MTCAPTCHA_PRIVATE_KEY) {
      console.warn(
        "WARNING: MTCAPTCHA_PRIVATE_KEY is NOT set – verification will fail."
      );
    }
  });
}