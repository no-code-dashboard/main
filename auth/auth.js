//https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API
var usernameInput = document.querySelector("#username");
var registerBtn = document.querySelector("#registerBtn");
var loginBtn = document.querySelector("#loginBtn");
var logoutBtn = document.querySelector("#logoutBtn");
var statusDiv = document.querySelector("#status");
var statusText = document.querySelector("#statusText");
var authForm = document.querySelector("#authForm");
var authenticatedView = document.querySelector("#authenticatedView");
var currentUserSpan = document.querySelector("#currentUser");

function bufferToBase64(buffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  for (var i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  var binary = atob(base64);
  var buffer = new ArrayBuffer(binary.length);
  var view = new Uint8Array(buffer);
  for (var i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function showStatus(message, type) {
  statusText.textContent = message;
  statusDiv.className = "status show " + type;
}

function hideStatus() {
  statusDiv.className = "status";
}

function registerPasskey() {
  var username = usernameInput.value.trim();

  if (!username) {
    showStatus("Please enter a username", "error");
    return;
  }

  showStatus("Creating passkey...", "info");

  var challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  var publicKeyCredentialCreationOptions = {
    challenge: challenge,
    rp: {
      name: "Passkey Demo App",
      id: window.location.hostname,
    },
    user: {
      id: new TextEncoder().encode(username),
      name: username,
      displayName: username,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },
      { alg: -257, type: "public-key" },
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      requireResidentKey: true,
      residentKey: "required",
      userVerification: "required",
    },
    timeout: 60000,
    attestation: "none",
  };

  navigator.credentials
    .create({
      publicKey: publicKeyCredentialCreationOptions,
    })
    .then(function (credential) {
      var credentialData = {
        id: credential.id,
        rawId: bufferToBase64(credential.rawId),
        type: credential.type,
        username: username,
      };

      sessionStorage.setItem(
        "passkey_" + username,
        JSON.stringify(credentialData)
      );

      showStatus("✓ Passkey registered successfully!", "success");
      setTimeout(function () {
        showAuthenticated(username);
      }, 1500);
    })
    .catch(function (error) {
      console.error("Registration error:", error);
      if (error.name === "NotAllowedError") {
        showStatus("Registration cancelled or not allowed", "error");
      } else if (error.name === "NotSupportedError") {
        showStatus("Passkeys not supported on this device", "error");
      } else {
        showStatus("Registration failed: " + error.message, "error");
      }
    });
}

function authenticatePasskey() {
  var username = usernameInput.value.trim();

  if (!username) {
    showStatus("Please enter a username", "error");
    return;
  }

  showStatus("Authenticating...", "info");

  var storedCred = sessionStorage.getItem("passkey_" + username);
  if (!storedCred) {
    showStatus("User not found. Please register first.", "error");
    return;
  }

  var credData = JSON.parse(storedCred);

  var challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  var publicKeyCredentialRequestOptions = {
    challenge: challenge,
    allowCredentials: [
      {
        id: base64ToBuffer(credData.rawId),
        type: "public-key",
        transports: ["internal"],
      },
    ],
    timeout: 60000,
    userVerification: "required",
  };

  navigator.credentials
    .get({
      publicKey: publicKeyCredentialRequestOptions,
    })
    .then(function (assertion) {
      showStatus("✓ Authentication successful!", "success");
      setTimeout(function () {
        showAuthenticated(username);
      }, 1500);
    })
    .catch(function (error) {
      console.error("Authentication error:", error);
      if (error.name === "NotAllowedError") {
        showStatus("Authentication cancelled or failed", "error");
      } else {
        showStatus("Authentication failed: " + error.message, "error");
      }
    });
}

function showAuthenticated(username) {
  currentUserSpan.textContent = username;
  authForm.classList.add("hide");
  authenticatedView.classList.add("show");
  hideStatus();
}

function logout() {
  authForm.classList.remove("hide");
  authenticatedView.classList.remove("show");
  usernameInput.value = "";
  showStatus("Logged out successfully", "info");
  setTimeout(hideStatus, 3000);
}

registerBtn.addEventListener("click", registerPasskey);
loginBtn.addEventListener("click", authenticatePasskey);
logoutBtn.addEventListener("click", logout);

usernameInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    authenticatePasskey();
  }
});
