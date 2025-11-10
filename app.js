// ===== CONFIG =====
// ตั้งค่า URL ของ backend (อย่าใส่ / ท้าย)
// ตัวอย่าง:
//   - เวลาเทสในเครื่อง:   const API_BASE = "http://localhost:3000";
//   - เวลาใช้ของจริง:      const API_BASE = "https://YOUR-BACKEND-URL-HERE";
const API_BASE = "https://messagetome.onrender.com";

// key สำหรับเก็บลิงก์ใน localStorage (ฝั่งผู้สร้างเท่านั้น)
const LS_KEY = "anon_links_v1";

const statusEl = document.getElementById("status");
const viewContainer = document.getElementById("view-container");

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function loadLinks() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error(e);
    return [];
  }
}

function saveLinks(links) {
  localStorage.setItem(LS_KEY, JSON.stringify(links));
}

function formatDateTime(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  } catch {
    return value;
  }
}

async function apiCreateLink(title, startAt, endAt) {
  const res = await fetch(API_BASE + "/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, startAt, endAt })
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return await res.json(); // { id, viewToken }
}

async function apiGetReplies(link) {
  const res = await fetch(API_BASE + "/api/links/" + encodeURIComponent(link.id) + "/replies", {
    headers: {
      "x-view-token": link.viewToken
    }
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return await res.json(); // array
}

async function apiSendReply(linkId, text, contacts) {
  const res = await fetch(API_BASE + "/api/links/" + encodeURIComponent(linkId) + "/replies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, contacts })
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return await res.json();
}

function renderHome() {
  const isReplyMode = getReplyIdFromURL() != null;
  if (isReplyMode) {
    renderReplyView();
    return;
  }

  viewContainer.innerHTML = `
    <h2>เลือกโหมดการใช้งาน</h2>
    <p>คุณต้องการทำอะไร?</p>
    <div class="row" style="margin-top: 8px;">
      <div>
        <h3>สร้างลิงก์ใหม่</h3>
        <p>สำหรับผู้สร้างลิงก์ ตั้งชื่อเรื่อง ตั้งเวลาเปิด/ปิดการตอบกลับ และเก็บลิงก์ไว้แชร์ให้คนอื่นตอบกลับ</p>
        <button class="primary" id="home-create-btn">ไปที่หน้าสร้างลิงก์</button>
      </div>
      <div>
        <h3>ตอบกลับ</h3>
        <p>ถ้าคุณมีลิงก์ที่เพื่อนส่งมา (URL ที่มี ?id=xxx) ให้เปิดลิงก์นั้นเพื่อส่งข้อความ</p>
        <small>ถ้าคุณเข้าจากลิงก์ตอบกลับอยู่แล้ว ระบบจะเปิดหน้า 'ฝากข้อความ' ให้อัตโนมัติ</small>
      </div>
    </div>
  `;

  document.getElementById("home-create-btn").onclick = renderCreateView;
}

function renderCreateView() {
  const now = new Date();
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  const toLocalInput = (d) =>
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes());

  const startDefault = toLocalInput(now);
  const endDefault = toLocalInput(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

  viewContainer.innerHTML = `
    <h2>สร้างลิงก์ใหม่</h2>
    <p>ลิงก์นี้จะใช้รับข้อความแบบไม่ระบุตัวตน และคุณสามารถตั้งเวลาเปิด/ปิดการตอบกลับได้</p>
    <form id="create-form">
      <label>
        ชื่อเรื่องของลิงก์:
        <input type="text" name="title" placeholder="เช่น ฝากข้อความถึงเรา..." required />
      </label>
      <div class="row">
        <div>
          <label>
            เวลาเริ่มรับตอบ (ไม่บังคับ):
            <input type="datetime-local" name="startAt" value="${startDefault}" />
          </label>
        </div>
        <div>
          <label>
            เวลาหยุดรับตอบ (ไม่บังคับ):
            <input type="datetime-local" name="endAt" value="${endDefault}" />
          </label>
        </div>
      </div>
      <div style="margin-top: 12px;">
        <button type="submit" class="primary">สร้างลิงก์</button>
      </div>
    </form>
  `;

  const form = document.getElementById("create-form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const title = fd.get("title").toString().trim();
    const startAt = fd.get("startAt").toString().trim() || null;
    const endAt = fd.get("endAt").toString().trim() || null;

    if (!title) {
      alert("กรุณาใส่ชื่อเรื่อง");
      return;
    }

    setStatus("กำลังสร้างลิงก์...");
    try {
      const result = await apiCreateLink(title, startAt, endAt);
      const link = {
        id: result.id,
        title,
        startAt,
        endAt,
        createdAt: Date.now(),
        viewToken: result.viewToken
      };
      const links = loadLinks();
      links.unshift(link);
      saveLinks(links);

      const shareURL = window.location.origin + window.location.pathname + "?id=" + encodeURIComponent(link.id);
      setStatus("สร้างลิงก์สำเร็จ");
      alert(
        "สร้างลิงก์สำเร็จ!\n\nลิงก์สำหรับแชร์: " +
          shareURL +
          "\n\nโทเค็นสำหรับดูข้อความ (เก็บดี ๆ ห้ามให้คนอื่น):\n" +
          link.viewToken
      );

      renderManageView();
    } catch (err) {
      console.error(err);
      setStatus("สร้างลิงก์ไม่สำเร็จ: " + err.message);
      alert("สร้างลิงก์ไม่สำเร็จ: " + err.message);
    }
  };
}

function renderManageView() {
  const links = loadLinks();
  let html = `
    <h2>ลิงก์ของฉัน</h2>
    <p>ลิงก์และโทเค็นถูกเก็บในเบราว์เซอร์นี้เท่านั้น ถ้าเปลี่ยนอุปกรณ์หรือเคลียร์ข้อมูลจะหาย ควร export เก็บไว้</p>
    <div style="margin: 8px 0;">
      <button id="btn-new-link" class="primary">สร้างลิงก์ใหม่</button>
      <button id="btn-export" style="margin-left: 8px;">สำรองข้อมูลลิงก์ (export)</button>
      <button id="btn-import" style="margin-left: 8px;">นำเข้าลิงก์ (import)</button>
    </div>
  `;

  if (links.length === 0) {
    html += `<p>ยังไม่มีลิงก์</p>`;
  } else {
    html += `<div id="link-list">`;
    for (const link of links) {
      const shareURL = window.location.origin + window.location.pathname + "?id=" + encodeURIComponent(link.id);
      html += `
        <div class="link-card" data-id="${link.id}">
          <div>
            <div><strong>${link.title || "(ไม่มีชื่อ)"}</strong></div>
            <div class="link-meta">
              ID: ${link.id}<br />
              สร้างเมื่อ: ${formatDateTime(link.createdAt)}<br />
              เริ่มรับ: ${formatDateTime(link.startAt)}<br />
              ปิดรับ: ${formatDateTime(link.endAt)}<br />
              ลิงก์ตอบกลับ: <a href="${shareURL}" target="_blank">${shareURL}</a>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px; min-width:130px;">
            <button class="btn-view-replies">ดูข้อความ</button>
            <button class="btn-copy-link">คัดลอกลิงก์</button>
            <button class="btn-show-token">ดูโทเค็น</button>
            <button class="btn-delete" style="color:#b91c1c;">ลบออกจากเครื่องนี้</button>
          </div>
        </div>
      `;
    }
    html += `</div>`;
  }

  viewContainer.innerHTML = html;

  document.getElementById("btn-new-link").onclick = renderCreateView;

  document.getElementById("btn-export").onclick = () => {
    const blob = new Blob([JSON.stringify(links, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "anon_links_backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById("btn-import").onclick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!Array.isArray(data)) throw new Error("รูปแบบไฟล์ไม่ถูกต้อง");
          saveLinks(data);
          alert("นำเข้าข้อมูลเรียบร้อย");
          renderManageView();
        } catch (err) {
          alert("นำเข้าไม่สำเร็จ: " + err.message);
        }
      };
      reader.readAsText(file, "utf-8");
    };
    input.click();
  };

  document.querySelectorAll(".link-card").forEach((card) => {
    const id = card.getAttribute("data-id");
    const linksNow = loadLinks();
    const link = linksNow.find((l) => l.id === id);
    if (!link) return;

    card.querySelector(".btn-copy-link").onclick = () => {
      const shareURL = window.location.origin + window.location.pathname + "?id=" + encodeURIComponent(link.id);
      navigator.clipboard
        .writeText(shareURL)
        .then(() => setStatus("คัดลอกลิงก์แล้ว"))
        .catch(() => setStatus("ไม่สามารถคัดลอกลิงก์ได้"));
    };

    card.querySelector(".btn-show-token").onclick = () => {
      alert("โทเค็นสำหรับดูลิงก์นี้:\n" + link.viewToken + "\n\nห้ามให้คนอื่นรู้เด็ดขาด");
    };

    card.querySelector(".btn-delete").onclick = () => {
      if (!confirm("ลบลิงก์นี้ออกจากเครื่องนี้? (ลิงก์และข้อความยังอยู่ใน backend แต่เบราว์เซอร์นี้จะลืมโทเค็น)")) return;
      const newLinks = linksNow.filter((l) => l.id !== id);
      saveLinks(newLinks);
      renderManageView();
    };

    card.querySelector(".btn-view-replies").onclick = async () => {
      setStatus("กำลังดึงข้อความ...");
      try {
        const replies = await apiGetReplies(link);
        if (!replies.length) {
          alert("ยังไม่มีข้อความ");
        } else {
          const lines = replies.map((r) => {
            const when = formatDateTime(r.createdAt);
            const text = r.text || "";
            const contacts = r.contacts || {};
            const parts = [];
            if (contacts.ig) parts.push("IG: " + contacts.ig);
            if (contacts.fb) parts.push("FB: " + contacts.fb);
            if (contacts.line) parts.push("Line: " + contacts.line);
            const contactStr = parts.length ? " | " + parts.join(" | ") : "";
            return `- ${when}: ${text}${contactStr}`;
          });
          alert(lines.join("\n\n"));
        }
        setStatus("ดึงข้อความสำเร็จ");
      } catch (err) {
        console.error(err);
        setStatus("ดึงข้อความไม่สำเร็จ: " + err.message);
        alert("ดึงข้อความไม่สำเร็จ: " + err.message);
      }
    };
  });
}

function getReplyIdFromURL() {
  const url = new URL(window.location.href);
  return url.searchParams.get("id");
}

function renderReplyView() {
  const linkId = getReplyIdFromURL();
  if (!linkId) {
    viewContainer.innerHTML = "<p>ไม่พบรหัสลิงก์ใน URL (ต้องมี ?id=xxxx)</p>";
    return;
  }

  viewContainer.innerHTML = `
    <h2>ฝากข้อความแบบไม่ระบุตัวตน</h2>
    <p>ข้อความของคุณจะถูกส่งไปยังผู้สร้างลิงก์ โดยไม่มีการระบุชื่อจริง / ตัวตน เว้นแต่คุณจะใส่ช่องทางติดต่อเอง</p>
    <form id="reply-form">
      <label>
        ข้อความของคุณ:
        <textarea name="text" placeholder="พิมพ์ข้อความที่นี่..." required></textarea>
      </label>
      <div class="row">
        <div>
          <label>
            IG (ไม่บังคับ):
            <input type="text" name="ig" placeholder="@your_ig" />
          </label>
        </div>
        <div>
          <label>
            FB (ไม่บังคับ):
            <input type="text" name="fb" placeholder="Facebook URL / ชื่อ" />
          </label>
        </div>
        <div>
          <label>
            Line (ไม่บังคับ):
            <input type="text" name="line" placeholder="Line ID" />
          </label>
        </div>
      </div>
      <div style="margin-top: 12px;">
        <button type="submit" class="primary">ส่งข้อความ</button>
      </div>
    </form>
  `;

  const form = document.getElementById("reply-form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const text = fd.get("text").toString().trim();
    const ig = fd.get("ig").toString().trim();
    const fb = fd.get("fb").toString().trim();
    const line = fd.get("line").toString().trim();

    if (!text) {
      alert("กรุณาใส่ข้อความ");
      return;
    }

    setStatus("กำลังส่งข้อความ...");
    try {
      await apiSendReply(linkId, text, { ig, fb, line });
      setStatus("ส่งข้อความสำเร็จ");
      alert("ขอบคุณสำหรับข้อความ!");
      form.reset();
    } catch (err) {
      console.error(err);
      setStatus("ส่งไม่สำเร็จ: " + err.message);
      alert("ส่งไม่สำเร็จ: " + err.message);
    }
  };
}

document.getElementById("btn-home").onclick = renderHome;
document.getElementById("btn-create").onclick = renderCreateView;
document.getElementById("btn-manage").onclick = renderManageView;

if (getReplyIdFromURL()) {
  renderReplyView();
} else {
  renderHome();
}
