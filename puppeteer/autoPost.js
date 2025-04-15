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

      try {
        console.log("Bắt đầu tìm kiếm div...");

        const result = await page.evaluate(() => {
          const targetClass =
            "xdj266r x11i5rnm x1mh8g0r x18d9i69 x1cy8zhl x78zum5 x1q0g3np xod5an3 xz9dl7a x1ye3gou xn6708d";
          // Tìm div với class cụ thể
          const divElements = document.getElementsByClassName(targetClass);

          console.log("=== DANH SÁCH DIV TÌM THẤY ===");
          console.log("Số lượng div:", divElements.length);

          // Convert HTMLCollection thành array để có thể return
          const divsArray = Array.from(divElements).map((div, index) => {
            console.log(`\n=== DIV ${index + 1} ===`);
            console.log(div.outerHTML);
            return div.outerHTML;
          });

          return {
            count: divElements.length,
            divs: divsArray,
          };
        });

        console.log("\n=== KẾT QUẢ TÌM KIẾM ===");
        console.log("Số lượng div tìm thấy:", result.count);
        result.divs.forEach((html, index) => {
          console.log(`\n=== DIV ${index + 1} ===`);
          console.log(html);
        });

        postedLinks.push({
          group: groupLink,
          status: "success",
          content: content,
          postedAt: new Date().toISOString(),
          divFound: result.count > 0,
        });
      } catch (error) {
        console.log("Lỗi khi tìm div:", error.message);
        postedLinks.push({
          group: groupLink,
          status: "error",
          error: error.message,
          content: content,
          postedAt: new Date().toISOString(),
        });
      }

      // Đợi 5 giây trước khi tiếp tục
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (e) {
      postedLinks.push({
        group: groupLink,
        status: "error",
        error: e.message,
      });
    }
  }

  await browser.close();
  fs.writeFileSync("posted_links.json", JSON.stringify(postedLinks, null, 2));

  return postedLinks;
}

module.exports = { autoPostToGroups };
