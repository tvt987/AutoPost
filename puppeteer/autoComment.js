const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function autoCommentToPosts(comment, postLinks, imagePaths = []) {
    console.log("comment")
   const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
    });
    let page = await browser.newPage();

  // Đăng nhập bằng cookie
  const cookies = require("../cookies/fb-cookies.json");
  await page.setCookie(...cookies);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const results = [];
  for (const postLink of postLinks) {
    try {
      await page.goto(postLink, { waitUntil: "networkidle2", timeout: 20000 });
      await wait(3000);

      // Click vào ô comment
      await page.evaluate(() => {
        const commentBox = document.querySelector('div[aria-label="Write a public comment…"]');
        if (commentBox) {
          commentBox.focus();
        }
      });
      await wait(4000);

      // Gõ nội dung comment
      await page.keyboard.type(comment, { delay: 20 });

      // Nếu có ảnh thì tải lên (nâng cao: cần xử lý upload file input)
      
      // Bỏ qua nếu chưa cần

      // Enter để gửi comment
      await page.keyboard.press("Enter");
      await wait(2000);

      results.push({ post: postLink, status: "success" });
    } catch (err) {
      results.push({ post: postLink, status: "error", error: err.message });
    }
  }
  await browser.close();
  fs.writeFileSync("comment.json", JSON.stringify(results, null, 2));
  return results; // chỉ return kết quả
}

module.exports = { autoCommentToPosts };