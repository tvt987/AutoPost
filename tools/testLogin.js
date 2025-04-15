const puppeteer = require("puppeteer-core");
const fs = require("fs");

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath:
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  });

  const page = await browser.newPage();

  // Đọc cookies đã lưu
  const cookies = JSON.parse(
    fs.readFileSync("./cookies/fb-cookies.json", "utf-8")
  );

  // Set cookies trước khi vào Facebook
  await page.setCookie(...cookies);

  // Truy cập Facebook
  await page.goto("https://www.facebook.com");

  // Đợi một chút để quan sát
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Kiểm tra xem đã login chưa bằng cách kiểm tra có nút Avatar/Profile không
  const isLoggedIn = await page.evaluate(() => {
    return (
      !!document.querySelector('[aria-label="Tài khoản"]') ||
      !!document.querySelector('[aria-label="Account"]')
    ); // phòng trường hợp tiếng Anh
  });

  if (isLoggedIn) {
    console.log("✅ Đã đăng nhập thành công bằng cookies!");
  } else {
    console.log(
      "❌ Chưa đăng nhập. Có thể cookies đã hết hạn hoặc không hợp lệ."
    );
  }
})();
