const puppeteer = require("puppeteer");
const fs = require("fs");

async function autoPostToGroups(content, groupLinks) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const cookies = require("../cookies/fb-cookies.json");
  await page.setCookie(...cookies);

  const postedLinks = [];

  for (const groupLink of groupLinks) {
    try {
      await page.goto(groupLink, { waitUntil: "networkidle2" });

      // Mở khung viết bài
      await page.waitForFunction(
        () =>
          Array.from(document.querySelectorAll("span")).some((el) =>
            el.textContent.includes("Write something...")
          ),
        { timeout: 10000 }
      );

      await page.evaluate(() => {
        const writeButton = Array.from(document.querySelectorAll("span")).find(
          (el) => el.textContent.includes("Write something...")
        );
        if (writeButton) writeButton.click();
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));
      await page.keyboard.type(content);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await page.evaluate(() => {
        const postBtn = Array.from(
          document.querySelectorAll("div[aria-label='Post']")
        ).find(
          (btn) =>
            btn.innerText.includes("Post") || btn.textContent.includes("Post")
        );
        if (postBtn) postBtn.click();
      });

      console.log("Đang đợi bài đăng xuất hiện...");
      await new Promise((resolve) => setTimeout(resolve, 20000));

      // Tìm và lưu thông tin các thẻ <a> phù hợp
      const anchorInfo = await page.evaluate(() => {
        const targetDivs = Array.from(document.querySelectorAll("div")).filter(
          (div) => div.getAttribute("aria-posinset") === "1"
        );

        return targetDivs.flatMap((div) =>
          Array.from(div.querySelectorAll("a"))
            .map((link) => ({
              href: link.href,
              outerHTML: link.outerHTML,
              text: link.innerText,
            }))
            .filter((a) => a.text.length > 100)
        );
      });

      if (anchorInfo.length > 0) {
        console.log("✅ Tìm thấy các thẻ <a> có text > 100 ký tự:");
        anchorInfo.forEach((a, idx) => {
          console.log(`🔗 Link #${idx + 1}:`);
          console.log(" - Href:", a.href);
          console.log(" - Text length:", a.text.length);
          console.log(" - HTML:", a.outerHTML);
        });

        // Click vào thẻ <a> đầu tiên có text > 100
        const didClick = await page.evaluate(() => {
          const targetDivs = Array.from(
            document.querySelectorAll("div")
          ).filter((div) => div.getAttribute("aria-posinset") === "1");

          for (const div of targetDivs) {
            const links = Array.from(div.querySelectorAll("a"));
            for (const link of links) {
              if (link.innerText.length > 100) {
                link.click();
                return true;
              }
            }
          }
          return false;
        });

        if (didClick) {
          console.log("✅ Đã click vào thẻ <a> đầu tiên có text > 100.");
        } else {
          console.log("⚠️ Không thể click vào thẻ <a>.");
        }
      } else {
        console.log("❌ Không tìm thấy thẻ <a> phù hợp (text > 100).");
      }

      postedLinks.push({
        group: groupLink,
        status: "success",
        content: content,
        postedAt: new Date().toISOString(),
        linksFound: anchorInfo.length > 0,
        links: anchorInfo,
      });

      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (e) {
      postedLinks.push({
        group: groupLink,
        status: "error",
        error: e.message,
        content: content,
        postedAt: new Date().toISOString(),
      });
    }
  }

  fs.writeFileSync("posted_links.json", JSON.stringify(postedLinks, null, 2));

  return postedLinks;
}

module.exports = { autoPostToGroups };
