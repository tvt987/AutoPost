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
  const maxRetries = 3;

  for (const groupLink of groupLinks) {
    try {
      console.log(`Đang đăng bài vào nhóm: ${groupLink}`);

      // Truy cập vào nhóm
      await page.goto(groupLink, {
        waitUntil: "networkidle2",
        timeout: 40000,
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
      await wait(3000);

      // Nhập nội dung bài viết
      await page.keyboard.type(content);
      await wait(2000);

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

      console.log("Đang đợi bài đăng xuất hiện...");
      await wait(20000);

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
        console.log("✅ Tìm thấy thẻ <a> đầu tiên:");
        console.log(" - Href:", firstLinkInfo.href);
        console.log(" - Text length:", firstLinkInfo.text.length);
        console.log(" - Div index:", firstLinkInfo.divIndex);

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
              console.log("✅ Đã hover vào thẻ <a> tại vị trí:", position);
            }
          });

        // Đợi animation hoàn thành
        await wait(3000);

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
          console.log("\n=== THÔNG TIN THẺ <a> SAU KHI HOVER ===");
          console.log("Href:", hoveredLinkInfo.href);
          console.log("Class:", hoveredLinkInfo.className);
          console.log("Attributes:", hoveredLinkInfo.attributes);
          console.log("Inner HTML:", hoveredLinkInfo.innerHTML);
          console.log("Outer HTML:", hoveredLinkInfo.outerHTML);
          console.log("=====================================\n");

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

          // Đợi trang mới load
          await page.waitForNavigation({ waitUntil: "networkidle0" });
          const postLink = page.url();
          console.log("✅ Link bài viết:", postLink);

          postedLinks.push({
            group: groupLink,
            status: "success",
            postLink: postLink,
            content,
            postedAt: new Date().toISOString(),
          });
        } else {
          console.log("❌ Không tìm thấy thẻ <a> sau khi hover");
          postedLinks.push({
            group: groupLink,
            status: "error",
            error: "Không tìm thấy link sau khi hover",
            content,
            postedAt: new Date().toISOString(),
          });
        }
      } else {
        console.log("❌ Không tìm thấy thẻ <a> phù hợp (text > 100).");
        postedLinks.push({
          group: groupLink,
          status: "error",
          error: "Không tìm thấy link bài viết",
          content,
          postedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.log(`❌ Lỗi: ${error.message}`);

      if (error.message.includes("Navigating frame was detached")) {
        console.log("Đang tạo lại page mới...");
        try {
          await page.close().catch(() => {});
          page = await browser.newPage();
          await page.setCookie(...cookies);
          console.log("✅ Đã tạo lại page mới.");
        } catch (pageError) {
          console.log(`❌ Lỗi khi tạo lại page: ${pageError.message}`);
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
  // await browser.close();
  fs.writeFileSync("posted_links.json", JSON.stringify(postedLinks, null, 2));
  return postedLinks;
}

module.exports = { autoPostToGroups };
