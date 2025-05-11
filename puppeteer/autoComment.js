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
      await page.goto(postLink, { waitUntil: "networkidle2", timeout: 10000 });
      await wait(2000);

      // Click vào ô comment
      await page.evaluate(() => {
        const commentBox = document.querySelector('div[aria-label="Write a public comment…"]');
        if (commentBox) {
          commentBox.focus();
        }
      });
      await wait(1000); // Đảm bảo đã focus
            await page.keyboard.type(comment);
      
            // 2. Paste ảnh clipboard nếu có ảnh
            if (imagePaths && imagePaths.length > 0) {
              for (let i = 0; i < imagePaths.length; i++) {
                try {
                  const mime = require("mime-types");
                  const imageBuffer = fs.readFileSync(imagePaths[i]);
                  const base64 = imageBuffer.toString('base64');
                  const mimeType = mime.lookup(imagePaths[i]) || "image/png";
            
                  const pasteResult = await page.evaluate(async (base64, mimeType) => {
                    function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
                      const byteCharacters = atob(b64Data);
                      const byteArrays = [];
                      for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                        const slice = byteCharacters.slice(offset, offset + sliceSize);
                        const byteNumbers = new Array(slice.length);
                        for (let i = 0; i < slice.length; i++) {
                          byteNumbers[i] = slice.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        byteArrays.push(byteArray);
                      }
                      return new Blob(byteArrays, { type: contentType });
                    }
                    if (navigator.clipboard && window.ClipboardItem) {
                      const blob = b64toBlob(base64, mimeType);
                      const item = new window.ClipboardItem({ [mimeType]: blob });
                      await navigator.clipboard.write([item]);
                      return { ok: true, msg: 'Đã paste clipboard', hasClipboard: true };
                    } else {
                      return { ok: false, msg: 'Clipboard API không hỗ trợ', hasClipboard: false };
                    }
                  }, base64, mimeType);
            
                  if (pasteResult.ok && pasteResult.hasClipboard) {1
                    await page.keyboard.down('Control');
                    await page.keyboard.press('v');
                    await page.keyboard.up('Control');
                    // Đợi cho ảnh preview hiện lên (nên tăng lên 2-3 giây hoặc hơn tuỳ tốc độ mạng)
                    await wait(1000);
                  }
                } catch (err) {
                  console.log("Không thể paste ảnh clipboard:", err.message);
                }
              }
            }
            await wait(1000);

      // Enter để gửi comment
      await page.keyboard.press("Enter");
      await wait(1000);

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