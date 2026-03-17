const express = require('express');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. إعدادات Cloudinary (ضع بياناتك هنا)
cloudinary.config({
  cloud_name: 'YOUR_CLOUD_NAME',
  api_key: 'YOUR_API_KEY',
  api_secret: 'YOUR_API_SECRET'
});

// 2. إعداد التخزين السحابي
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: req.body.folder || 'General',
      resource_type: 'auto', // ليدعم الفيديو والصور معاً
      public_id: Date.now() + '-' + file.originalname.split('.')[0],
    };
  },
});

const upload = multer({ storage });

// 3. مسار الرفع المحدث
app.post('/api/upload', upload.fields([{ name: 'video' }, { name: 'cover' }]), async (req, res) => {
  try {
    const { title, description, folder, folderCode } = req.body;

    if (folderCode !== "253655") return res.status(403).send('كود الرفع خطأ');

    // الروابط الآن تأتي من Cloudinary مباشرة
    const videoUrl = req.files['video'][0].path;
    const coverUrl = req.files['cover'] ? req.files['cover'][0].path : null;

    // هنا يمكنك حفظ هذه الروابط في قاعدة بيانات (مثل MongoDB) 
    // أو إرسالها للواجهة لتخزينها مؤقتاً
    console.log("Video URL:", videoUrl);

    res.status(200).json({ 
        message: 'تم الرفع للسحاب!',
        videoUrl: videoUrl,
        coverUrl: coverUrl
    });
  } catch (error) {
    res.status(500).send('خطأ في الرفع للسحاب');
  }
});

app.listen(5000, () => console.log('🚀 السيرفر يعمل وجاهز للنشر'));