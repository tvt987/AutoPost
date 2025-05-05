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
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(
          `Đang đăng bài vào nhóm: ${groupLink} (lần thử ${
            retryCount + 1
          }/${maxRetries})`
        );

        // Truy cập vào nhóm
        await page.goto(groupLink, {
          waitUntil: "networkidle2",
          timeout: 60000,
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

        // Nếu có ảnh, xử lý upload ảnh
        if (imagePaths && imagePaths.length > 0) {
          try {
            console.log("Bước 1: Click vào nút Photo/Video...");
            // Click vào nút Photo/Video (nút màu xanh lá)
            await page.evaluate(() => {
              const buttons = Array.from(
                document.querySelectorAll(
                  'div[aria-label="Photo/Video"], div[role="button"]'
                )
              );
              const photoButton = buttons.find((el) => {
                const text = el.textContent.toLowerCase();
                return (
                  text.includes("photo/video") ||
                  text.includes("photo") ||
                  text.includes("ảnh/video")
                );
              });
              if (photoButton) {
                photoButton.click();
              }
            });
            await wait(2000);

            console.log("Bước 2: Đợi và click vào nút Add photos/videos...");
            // Click vào nút "Add photos/videos"
            const addButtonResult = await page.evaluate(() => {
              // Tìm theo class và role
              const addButton = document.querySelector(
                'div[role="button"].x1i10hfl.x1qjc9v5.xjbqb8w.xjqpnuy.xa49m3k.xqeqjp1.x2hbi6w.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x2lwn1j.xeuugli.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x3nfvp2.x1q0g3np.x87ps6o.x1lku1pv.x1a2a7pz'
              );

              if (addButton) {
                console.log("Tìm thấy nút Add photos/videos theo class");
                addButton.click();
                return true;
              }

              return false;
            });
            console.log("Kết quả tìm nút Add photos/videos:", addButtonResult);
            await wait(2000);

            console.log("Bước 3: Đợi và click vào nút Add từ thiết bị...");
            // Click vào nút "Add photos and videos from your device"
            const [fileChooser] = await Promise.all([
              page.waitForFileChooser({ timeout: 10000 }),
              page.evaluate(() => {
                // Tìm theo text trong span
                const deviceButton = Array.from(
                  document.querySelectorAll("span")
                ).find((el) => {
                  const text = el.textContent.trim().toLowerCase();
                  return (
                    text.includes("from your device") ||
                    text.includes("từ thiết bị của bạn") ||
                    text.includes("add photos and videos") ||
                    text.includes("thêm ảnh và video")
                  );
                });

                if (deviceButton) {
                  console.log("Tìm thấy nút device theo text");
                  deviceButton.click();
                  return true;
                }

                // Nếu không tìm thấy theo text, thử tìm theo class
                const deviceButtonByClass = document.querySelector(
                  'div[role="button"].x1i10hfl.x1qjc9v5.xjbqb8w.xjqpnuy.xa49m3k.xqeqjp1.x2hbi6w.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x2lwn1j.xeuugli.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x3nfvp2.x1q0g3np.x87ps6o.x1lku1pv.x1a2a7pz'
                );

                if (deviceButtonByClass) {
                  console.log("Tìm thấy nút device theo class");
                  deviceButtonByClass.click();
                  return true;
                }

                return false;
              }),
            ]);
            console.log("Đã mở file chooser");

            // Upload tất cả các ảnh
            console.log("Bước 4: Upload ảnh...");
            await fileChooser.accept(imagePaths);
            console.log("🖼️ Đã upload ảnh thành công");
            await wait(8000); // Đợi ảnh upload xong
          } catch (error) {
            console.log("⚠️ Lỗi khi upload ảnh:", error.message);
            // Thử phương pháp khác nếu thất bại
            try {
              console.log("Đang thử phương pháp upload ảnh thay thế...");
              const [fileChooser] = await Promise.all([
                page.waitForFileChooser({ timeout: 10000 }),
                page.click('div[aria-label="Photo/video"]'),
              ]);
              await fileChooser.accept(imagePaths);
              console.log("🖼️ Đã upload ảnh thành công (phương pháp 2)");
              await wait(8000);
            } catch (error2) {
              console.log(
                "⚠️ Lỗi khi thử phương pháp upload ảnh thứ 2:",
                error2.message
              );
            }
          }
        }

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

        // Tìm link bài viết sau khi đăng
        const postLink = await page.evaluate(() => {
          // Tìm link theo nhiều cách khác nhau
          const timeLink =
            document.querySelector('a[href*="permalink"]') ||
            document.querySelector('a[href*="posts"]') ||
            document.querySelector('a[href*="groups"][href*="__cft__"]');
          return timeLink ? timeLink.href : null;
        });

        if (postLink) {
          console.log("✅ Đăng bài thành công:", postLink);
          postedLinks.push({
            group: groupLink,
            status: "success",
            postLink: postLink,
            content,
            postedAt: new Date().toISOString(),
          });
          break; // Thoát khỏi vòng lặp retry nếu thành công
        } else {
          throw new Error("Không tìm thấy link bài viết sau khi đăng");
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

        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`Thử lại sau 10 giây...`);
          await wait(10000);
        }
      }
    }
  }

  await browser.close();
  fs.writeFileSync("posted_links.json", JSON.stringify(postedLinks, null, 2));
  return postedLinks;
}

module.exports = { autoPostToGroups };
