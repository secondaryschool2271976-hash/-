const express = require('express');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. إعدادات Cloudinary باستخدام المتغيرات البيئية (Environment Variables)
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

// 2. إعداد التخزين السحابي (Cloudinary Storage)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // تحديد نوع الملف (فيديو أو صورة) تلقائياً
    const isVideo = file.mimetype.includes('video');
    return {
      folder: req.body.folder || 'General',
      resource_type: isVideo ? 'video' : 'image', 
      public_id: Date.now() + '-' + file.originalname.split('.')[0],
    };
  },
});

const upload = multer({ storage });

// مجلد محلي مؤقت لحفظ بيانات الفيديوهات (JSON)
const metadataDir = path.join(__dirname, 'metadata');
if (!fs.existsSync(metadataDir)) fs.mkdirSync(metadataDir);

// 3. مسار الرفع (Upload Endpoint)
app.post('/api/upload', upload.fields([{ name: 'video' }, { name: 'cover' }]), (req, res) => {
  try {
    const { title, description, folder, folderCode } = req.body;

    // التحقق من كود الرفع (المخزن في Render)
    if (folderCode !== process.env.UPLOAD_CODE) {
      return res.status(403).send('كود الرفع غير صحيح!');
    }

    if (!req.files['video']) return res.status(400).send('لم يتم اختيار فيديو');

    // تجميع بيانات الفيديو بروابط Cloudinary
    const videoData = {
      title: title || 'بدون عنوان',
      description: description || '',
      folder: folder || 'General',
      videoUrl: req.files['video'][0].path, // رابط الفيديو السحابي
      coverUrl: req.files['cover'] ? req.files['cover'][0].path : null, // رابط الغلاف السحابي
      publicId: req.files['video'][0].filename, // معرف الملف للحذف لاحقاً
      date: new Date()
    };

    // حفظ البيانات في ملف JSON محلي (ملاحظة: Render يمسحها عند إعادة التشغيل)
    const fileName = Date.now() + '.json';
    fs.writeFileSync(path.join(metadataDir, fileName), JSON.stringify(videoData));

    res.status(200).json({ message: 'تم الرفع للسحاب بنجاح', data: videoData });
  } catch (error) {
    console.error(error);
    res.status(500).send('خطأ أثناء الرفع للسحاب');
  }
});

// 4. مسار جلب قائمة الفيديوهات
app.get('/api/videos', (req, res) => {
  try {
    const files = fs.readdirSync(metadataDir);
    const allVideos = files.map(file => {
      return JSON.parse(fs.readFileSync(path.join(metadataDir, file)));
    });
    res.json(allVideos);
  } catch (e) {
    res.json([]);
  }
});

// 5. مسار الحذف (Delete Endpoint)
app.post('/api/delete', async (req, res) => {
  const { publicId, code } = req.body;
  
  if (code !== process.env.DELETE_CODE) {
    return res.status(403).send("رمز الحذف غير صحيح");
  }

  try {
    // الحذف من Cloudinary
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    
    // ملاحظة: هنا نحتاج لمسح ملف JSON المرتبط أيضاً (تبسيطاً سنكتفي بحذف الملف السحابي)
    res.send("تم حذف الفيديو من السحاب بنجاح");
  } catch (err) {
    res.status(500).send("خطأ أثناء الحذف");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));