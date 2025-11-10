
# Anonymous Links (v2)

โปรเจกต์นี้แบ่งเป็น 2 ส่วนชัด ๆ:

- `frontend/` → ไฟล์ที่เอาไปลง GitHub Pages (เว็บสร้างลิงก์ + เว็บตอบกลับ)
- `backend/`  → Node.js (Express) สำหรับเก็บลิงก์ + ข้อความ (ใช้ได้ทั้งบนเครื่องตัวเอง และบนผู้ให้บริการเช่น Render)

---

## 1. โครงสร้างไฟล์

```text
message-links-v2/
├─ README.md
├─ frontend/
│  ├─ index.html
│  ├─ style.css
│  └─ app.js
└─ backend/
   ├─ package.json
   ├─ server.js
   └─ data.json
```

---

## 2. วิธีเทสบนเครื่องตัวเอง (local)

### 2.1 รัน backend

```bash
cd backend
npm install
npm start
```

ถ้าสำเร็จ จะเห็นข้อความ:

```bash
Backend is running on port 3000
```

และเปิดเบราว์เซอร์ไปที่ `http://localhost:3000` จะเห็นคำว่า  
`Anon links backend is running.`

### 2.2 ตั้งค่า frontend

เปิดไฟล์ `frontend/app.js` แล้วแก้บรรทัดบนสุด:

```js
const API_BASE = "http://localhost:3000";
```

### 2.3 รัน frontend

```bash
cd frontend
python -m http.server 4173
```

แล้วเปิดเบราว์เซอร์ที่  
`http://localhost:4173`

ตอนนี้:
- กด “สร้างลิงก์ใหม่” ได้
- ได้ URL สำหรับแชร์ (มี ?id=xxx)
- คนอื่นที่อยู่ในเครือข่ายเดียวกัน (และเข้าผ่าน IP เครื่องเรา + port 4173) ก็ใช้ได้

---

## 3. ใช้งานจริง: GitHub Pages + Backend ออนไลน์ (เช่น Render)

### 3.1 Deploy backend ไป Render (แนะนำ)

1. อัปโหลดโปรเจกต์นี้ขึ้น GitHub (ทั้งโฟลเดอร์ `backend` และ `frontend`)
2. ไปที่ [https://render.com](https://render.com) แล้วสมัคร/ล็อกอิน
3. กด **New + → Web Service**
4. เลือก repo ที่มีโปรเจกต์นี้
5. ในหน้าใช้ค่าโดยประมาณ:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
6. กดสร้างแล้วรอให้ Deploy จนเสร็จ

Render จะให้ URL ประมาณ:

```
https://your-anon-links-backend.onrender.com
```

### 3.2 แก้ frontend ให้ชี้ไปที่ backend

เปิด `frontend/app.js` แล้วแก้:

```js
const API_BASE = "https://your-anon-links-backend.onrender.com";
```

(ใช้ URL ของจริงที่ได้จาก Render)

จากนั้น push ขึ้น GitHub อีกครั้ง

### 3.3 เปิด GitHub Pages สำหรับ frontend

1. เข้า repo บน GitHub
2. ไปที่ **Settings → Pages**
3. ตรง **Source** เลือก:
   - `Deploy from a branch`
   - Branch: `main` (หรือชื่อ branch ที่ใช้)
   - Folder: `/frontend`  (ให้ GitHub เสิร์ฟไฟล์ในโฟลเดอร์ frontend)
4. กด Save

GitHub Pages จะให้ URL ประมาณ:

```
https://<username>.github.io/<repo>/
```

หน้าเว็บนี้จะ:
- ใช้ไฟล์ `frontend/index.html`
- ยิง API ไปหา backend ที่ Render (`API_BASE`)  
- สามารถสร้างลิงก์, ตั้งเวลา, ดูข้อความได้จริง

---

## 4. ฟีเจอร์ที่มี

- สร้างลิงก์แบบไม่ระบุตัวตน
- คนตอบใส่ IG / FB / Line ได้
- ผู้สร้างตั้งชื่อเรื่องและกำหนดเวลาเปิด/ปิดการตอบกลับ
- มีแค่ผู้สร้าง (ที่มี viewToken) เท่านั้นที่ดูข้อความได้
- Frontend รองรับ GitHub Pages (static hosting)
- Backend เป็น Node + Express ใช้งานง่าย

---

ถ้าอยากเพิ่ม:
- ระบบล็อกอินสำหรับผู้สร้าง
- การเข้ารหัสข้อความ
- หรือเชื่อมกับฐานข้อมูลจริง (เช่น PostgreSQL, Supabase, MongoDB)

สามารถเพิ่มต่อจาก `server.js` ได้เลย
