const { spawn } = require("child_process");

console.log("Waiting for React to start...");

setTimeout(() => {
  console.log("Launching Electron...");
  const electron = spawn("npx", ["electron", "."], {
    stdio: "inherit",
    shell: true,
  });
}, 15000); // 15 second delay