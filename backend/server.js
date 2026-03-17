const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. الاتصال بقاعدة بيانات MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 2. تعريف "شكل" البيانات (Schema)
const videoSchema = new mongoose.Schema({
  title: String,
  description: String,
  folder: String,
  videoUrl: String,
  coverUrl: String,
  publicId: String,
  date: { type: Date, default: Date.now }
});
const Video = mongoose.model('Video', videoSchema);

// 3. إعدادات Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => ({
    folder: req.body.folder || 'General',
    resource_type: file.mimetype.includes('video') ? 'video' : 'image',
    public_id: Date.now() + '-' + file.originalname.split('.')[0],
  }),
});
const upload = multer({ storage });

// 4. مسار الرفع (حفظ في MongoDB)
app.post('/api/upload', upload.fields([{ name: 'video' }, { name: 'cover' }]), async (req, res) => {
  try {
    if (req.body.folderCode !== process.env.UPLOAD_CODE) return res.status(403).send('كود الرفع خطأ');

    const newVideo = new Video({
      title: req.body.title,
      description: req.body.description,
      folder: req.body.folder || 'General',
      videoUrl: req.files['video'][0].path,
      coverUrl: req.files['cover'] ? req.files['cover'][0].path : null,
      publicId: req.files['video'][0].filename
    });

    await newVideo.save(); // حفظ رسمي في القاعدة للأبد
    res.status(200).json({ message: 'تم الحفظ بنجاح' });
  } catch (error) { res.status(500).send('خطأ في الرفع'); }
});

// 5. مسار الجلب (من MongoDB)
app.get('/api/videos', async (req, res) => {
  try {
    const allVideos = await Video.find().sort({ date: -1 });
    res.json(allVideos);
  } catch (e) { res.json([]); }
});

// 6. مسار الحذف
app.post('/api/delete', async (req, res) => {
  if (req.body.code !== process.env.DELETE_CODE) return res.status(403).send("كود الحذف خطأ");
  try {
    await Video.findOneAndDelete({ publicId: req.body.publicId }); // حذف من القاعدة
    await cloudinary.uploader.destroy(req.body.publicId, { resource_type: 'video' }); // حذف من السحاب
    res.send("تم الحذف بنجاح");
  } catch (err) { res.status(500).send("خطأ في الحذف"); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));