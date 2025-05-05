const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { autoPostToGroups } = require("./puppeteer/autoPost");

const app = express();
const port = 3000;

// Cấu hình multer để lưu ảnh
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
  },
  fileFilter: function (req, file, cb) {
    // Chỉ chấp nhận file ảnh
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error("Chỉ chấp nhận file ảnh!"), false);
    }
    cb(null, true);
  },
});

// Cấu hình middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Cấu hình view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.get("/", (req, res) => {
  res.render("index", {
    title: "Facebook Auto Post",
    message: null,
    error: null,
    result: null,
  });
});

app.post("/post", upload.array("images", 5), async (req, res) => {
  try {
    const { content, groupLinks } = req.body;
    const imagePaths = req.files ? req.files.map((file) => file.path) : [];

    // Chuyển đổi groupLinks từ string sang array
    const linksArray = groupLinks.split("\n").filter((link) => link.trim());

    const result = await autoPostToGroups(content, linksArray, imagePaths);

    res.render("index", {
      title: "Facebook Auto Post",
      message: "Đăng bài thành công!",
      error: null,
      result: result,
    });
  } catch (error) {
    console.error("Lỗi:", error);
    res.render("index", {
      title: "Facebook Auto Post",
      message: null,
      error: error.message,
      result: null,
    });
  }
});

// Thêm route xử lý lỗi 404
app.use((req, res) => {
  res.status(404).render("index", {
    title: "Facebook Auto Post - 404",
    message: null,
    error: "Trang không tồn tại",
    result: null,
  });
});

// Xử lý lỗi server
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("index", {
    title: "Facebook Auto Post - Error",
    message: null,
    error: "Đã xảy ra lỗi server",
    result: null,
  });
});

app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
