const puppeteer = require("puppeteer-core"); // Dùng puppeteer-core thay vì puppeteer
const fs = require("fs");

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath:
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", // Đường dẫn tới Edge
  });
  const page = await browser.newPage();

  await page.goto("https://www.facebook.com");
  console.log("Login rồi bấm Enter...");
  process.stdin.once("data", async () => {
    const cookies = await page.cookies();
    fs.writeFileSync(
      "./cookies/fb-cookies.json",
      JSON.stringify(cookies, null, 2)
    );
    console.log("Đã lưu cookies");
    await browser.close();
    process.exit();
  });
})();
