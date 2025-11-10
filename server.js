import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = "./data.json";

app.use(cors());
app.use(express.json());

let db = { links: {} };

function loadDB() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      db = JSON.parse(raw);
    }
  } catch (e) {
    console.error("โหลดไฟล์ data.json ไม่สำเร็จ:", e);
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("บันทึกไฟล์ data.json ไม่สำเร็จ:", e);
  }
}

loadDB();

app.post("/api/links", (req, res) => {
  const { title, startAt, endAt } = req.body || {};
  if (!title || typeof title !== "string") {
    return res.status(400).send("ต้องมี title");
  }

  const id = nanoid(8);
  const viewToken = nanoid(24);

  db.links[id] = {
    id,
    title,
    startAt: startAt || null,
    endAt: endAt || null,
    viewToken,
    createdAt: Date.now(),
    replies: []
  };

  saveDB();

  res.json({ id, viewToken });
});

app.post("/api/links/:id/replies", (req, res) => {
  const { id } = req.params;
  const link = db.links[id];
  if (!link) {
    return res.status(404).send("ไม่พบลิงก์");
  }

  const now = Date.now();
  if (link.startAt) {
    const s = new Date(link.startAt).getTime();
    if (!Number.isNaN(s) && now < s) {
      return res.status(403).send("ยังไม่ถึงเวลาเปิดรับข้อความ");
    }
  }
  if (link.endAt) {
    const e = new Date(link.endAt).getTime();
    if (!Number.isNaN(e) && now > e) {
      return res.status(403).send("หมดเวลารับข้อความแล้ว");
    }
  }

  const { text, contacts } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).send("ต้องมีข้อความ (text)");
  }

  const reply = {
    id: nanoid(10),
    text,
    contacts: contacts || {},
    createdAt: now
  };

  link.replies.push(reply);
  saveDB();

  res.json({ ok: true });
});

app.get("/api/links/:id/replies", (req, res) => {
  const { id } = req.params;
  const link = db.links[id];
  if (!link) {
    return res.status(404).send("ไม่พบลิงก์");
  }

  const token = req.headers["x-view-token"];
  if (!token || token !== link.viewToken) {
    return res.status(401).send("ไม่ได้รับอนุญาต");
  }

  res.json(link.replies || []);
});

app.get("/", (req, res) => {
  res.send("Anon links backend is running.");
});

app.listen(PORT, () => {
  console.log("Backend is running on port", PORT);
});
