const express = require("express");
const cors = require("cors");
const { autoPostToGroups } = require("./puppeteer/autoPost");
const { autoCommentToPosts } = require("./puppeteer/autoComment");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/post", async (req, res) => {
  const { content, groupLinks } = req.body;
  try {
    const result = await autoPostToGroups(content, groupLinks);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/comment", async (req, res) => {
  const { comment, postLinks } = req.body;
  try {
    const result = await autoCommentToPosts(comment, postLinks);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
