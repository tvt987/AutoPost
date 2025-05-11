const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function autoPostToGroups(content, groupLinks, imagePaths = []) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
  let page = await browser.newPage();

  const cookies = require("../cookies/fb-cookies.json");
  await page.setCookie(...cookies);

  const postedLinks = [];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (const groupLink of groupLinks) {
    try {

      // Truy cập vào nhóm
      await page.goto(groupLink, {
        waitUntil: "networkidle2",
        timeout: 10000
      });
      await wait(5000);

      // Click vào ô "Create Post" hoặc "Write something..."
      await page.evaluate(() => {
        const createPostButton = Array.from(
          document.querySelectorAll('div[role="button"]')
        ).find(
          (el) =>
            el.textContent.includes("Write something") ||
            el.textContent.includes("Create post") ||
            el.textContent.includes("What's on your mind")
        );
        if (createPostButton) createPostButton.click();
      });

      // Nhập nội dung bài viết
      // 1. Focus lại vào vùng nhập trước khi nhập text
      await page.evaluate(() => {
        let editable = Array.from(document.querySelectorAll('div[contenteditable="true"]')).find(el =>
          (el.getAttribute('role') === 'textbox') ||
          (el.getAttribute('aria-label') && el.getAttribute('aria-label').toLowerCase().includes('write')) ||
          (el.getAttribute('aria-placeholder') && el.getAttribute('aria-placeholder').toLowerCase().includes('write'))
        );
        if (!editable) editable = document.querySelector('div[contenteditable="true"]');
        if (editable) editable.focus();
      });
      await wait(2000); // Đảm bảo đã focus
      await page.keyboard.type(content);

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

      // Click nút Post
      await page.evaluate(() => {
        const buttons = Array.from(
          document.querySelectorAll('div[role="button"]')
        );
        const postButton = buttons.find((el) => {
          const text = el.textContent.trim().toLowerCase();
          return text === "post" || text === "đăng";
        });
        if (postButton) {
          postButton.click();
        }
      });
      await wait(9000);

      // Cuộn chuột xuống 300px sau khi post bài
      await page.evaluate(() => {
        const percent = 0.1; // 20%
        const scrollY = document.body.scrollHeight * percent;
        window.scrollTo(0, scrollY);
      });
      console.log("Đang đợi bài đăng xuất hiện...");
      await wait(1000);

      // Bước 1: Tìm div và thẻ a đầu tiên
      const firstLinkInfo = await page.evaluate(() => {
        // Tìm div có aria-posinset="1"
        const targetDivs = Array.from(document.querySelectorAll("div")).filter(
          (div) => div.getAttribute("aria-posinset") === "1"
        );

        // Tìm thẻ a có text > 100 trong div đầu tiên
        if (targetDivs.length > 0) {
          const firstDiv = targetDivs[0];
          const links = Array.from(firstDiv.querySelectorAll("a"));
          const firstLink = links.find((link) => link.innerText.length > 100);

          if (firstLink) {
            return {
              divIndex: 0,
              href: firstLink.href,
              text: firstLink.innerText,
            };
          }
        }
        return null;
      });

      if (firstLinkInfo) {
        // Hover vào thẻ a đầu tiên bằng Puppeteer
        await page
          .evaluate((linkInfo) => {
            const targetDivs = Array.from(
              document.querySelectorAll("div")
            ).filter((div) => div.getAttribute("aria-posinset") === "1");

            const div = targetDivs[linkInfo.divIndex];
            if (div) {
              const link = Array.from(div.querySelectorAll("a")).find(
                (a) => a.innerText === linkInfo.text
              );
              if (link) {
                const rect = link.getBoundingClientRect();
                return {
                  x: rect.x + rect.width / 2,
                  y: rect.y + rect.height / 2,
                };
              }
            }
            return null;
          }, firstLinkInfo)
          .then(async (position) => {
            if (position) {
              await page.mouse.move(position.x, position.y);
            }
          });

        // Đợi animation hoàn thành
        await wait(1000);

        // Bước 2: Tìm lại div và thẻ a sau khi hover
        const hoveredLinkInfo = await page.evaluate(() => {
          // Tìm lại div có aria-posinset="1"
          const targetDivs = Array.from(
            document.querySelectorAll("div")
          ).filter((div) => div.getAttribute("aria-posinset") === "1");

          // Tìm thẻ a có text > 100 trong div đầu tiên
          if (targetDivs.length > 0) {
            const firstDiv = targetDivs[0];
            const links = Array.from(firstDiv.querySelectorAll("a"));
            const firstLink = links.find((link) => link.innerText.length > 100);

            if (firstLink) {
              return {
                href: firstLink.href,
                outerHTML: firstLink.outerHTML,
                innerHTML: firstLink.innerHTML,
                className: firstLink.className,
                attributes: Array.from(firstLink.attributes).map((attr) => ({
                  name: attr.name,
                  value: attr.value,
                })),
              };
            }
          }
          return null;
        });

        if (hoveredLinkInfo) {
          // Click vào thẻ a sau khi hover
          await page.evaluate(() => {
            const targetDivs = Array.from(
              document.querySelectorAll("div")
            ).filter((div) => div.getAttribute("aria-posinset") === "1");

            if (targetDivs.length > 0) {
              const firstDiv = targetDivs[0];
              const links = Array.from(firstDiv.querySelectorAll("a"));
              const firstLink = links.find(
                (link) => link.innerText.length > 100
              );
              if (firstLink) {
                firstLink.click();
              }
            }
          });

          await wait(3000);
          const postLink = page.url();
          console.log(postLink)

          postedLinks.push({
            group: groupLink,
            status: "success",
            postLink: postLink,
            content,
            postedAt: new Date().toISOString(),
          });
        } else {
          postedLinks.push({
            group: groupLink,
            status: "error",
            error: "Không tìm thấy link sau khi hover",
            content,
            postedAt: new Date().toISOString(),
          });
        }
      } else {
        postedLinks.push({
          group: groupLink,
          status: "error",
          error: "Không tìm thấy link bài viết",
          content,
          postedAt: new Date().toISOString(),
        });
      }
    } catch (error) {

      if (error.message.includes("Navigating frame was detached")) {
        try {
          await page.close().catch(() => {});
          page = await browser.newPage();
          await page.setCookie(...cookies);
        } catch (pageError) {
        }
      }

      postedLinks.push({
        group: groupLink,
        status: "error",
        error: error.message,
        content,
        postedAt: new Date().toISOString(),
      });
    }
  }

  // Không đóng browser để có thể xem kết quả
  await browser.close();
  fs.writeFileSync("posted_links.json", JSON.stringify(postedLinks, null, 2));
  return postedLinks;
}

module.exports = { autoPostToGroups };
