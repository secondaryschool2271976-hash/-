import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  // --- حالات الإدخال (State) ---
  const [videoFile, setVideoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [folder, setFolder] = useState('');
  const [folderCode, setFolderCode] = useState('');
  
  // --- حالات المكتبة والبحث ---
  const [videos, setVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [openFolders, setOpenFolders] = useState({});

  // --- حالات إحصائيات الرفع ---
  const [progress, setProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState({ loaded: 0, total: 0, speed: 0 });

  // دالة تحويل الحجم بصيغة مفهومة (MB/GB)
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const fetchVideos = async () => {
    try {
      // ملاحظة: عند النشر رسمياً استبدل localhost برابط السيرفر الجديد
      const res = await axios.get('http://localhost:5000/api/videos');
      setVideos(res.data);
    } catch (e) { console.log("خطأ في جلب البيانات"); }
  };

  useEffect(() => { fetchVideos(); }, []);

  const toggleFolder = (folderName) => {
    setOpenFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  const handleUpload = async () => {
    if (!videoFile || !folderCode) return alert("الرجاء إكمال البيانات وكود الرفع!");
    
    const formData = new FormData();
    formData.append('folder', folder || 'General');
    formData.append('folderCode', folderCode);
    formData.append('title', title || 'بدون عنوان');
    formData.append('description', desc);
    formData.append('video', videoFile);
    if (coverFile) formData.append('cover', coverFile);

    const startTime = Date.now();

    try {
      await axios.post('http://localhost:5000/api/upload', formData, {
        onUploadProgress: (p) => {
          const { loaded, total } = p;
          const percentage = Math.round((loaded * 100) / total);
          const speed = loaded / ((Date.now() - startTime) / 1000);
          setProgress(percentage);
          setUploadStats({ loaded, total, speed });
        }
      });
      alert("✅ تم الرفع للسحاب بنجاح!");
      setProgress(0);
      setUploadStats({ loaded: 0, total: 0, speed: 0 });
      fetchVideos();
    } catch (err) {
      alert(err.response?.data || "❌ فشل الرفع");
      setProgress(0);
    }
  };

  // --- منطق البحث والفلترة (العنوان + الوصف + المجلد) ---
  const groupedVideos = videos.reduce((acc, vid) => {
    const s = searchTerm.toLowerCase();
    const f = folderFilter.toLowerCase();
    
    const matchesSearch = 
      vid.title.toLowerCase().includes(s) || 
      (vid.description && vid.description.toLowerCase().includes(s));
    
    const matchesFolder = vid.folder.toLowerCase().includes(f);

    if (matchesSearch && matchesFolder) {
      if (!acc[vid.folder]) acc[vid.folder] = [];
      acc[vid.folder].push(vid);
    }
    return acc;
  }, {});

  return (
    <div dir="rtl" style={{ padding: '20px', fontFamily: 'Segoe UI, Tahoma, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* صندوق الرفع */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '40px' }}>
          <h2 style={{ textAlign: 'center', color: '#007bff', marginBottom: '20px' }}>إضافة محتوى سحابي ☁️</h2>
          
          <div style={{ display: 'grid', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelS}>ملف الفيديو:</label>
                <input type="file" onChange={(e) => setVideoFile(e.target.files[0])} style={inputS} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelS}>صورة الغلاف:</label>
                <input type="file" onChange={(e) => setCoverFile(e.target.files[0])} style={inputS} />
              </div>
            </div>

            <input placeholder="عنوان الفيديو / الفيلم" onChange={(e) => setTitle(e.target.value)} style={inputS} />
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <input placeholder="اسم المجلد" list="folders" onChange={(e) => setFolder(e.target.value)} style={{...inputS, flex: 2}} />
              <datalist id="folders">
                {[...new Set(videos.map(v => v.folder))].map((f, i) => <option key={i} value={f} />)}
              </datalist>
              <input type="password" placeholder="كود الرفع (253655)" value={folderCode} onChange={(e) => setFolderCode(e.target.value)} style={{...inputS, flex: 1, borderColor: '#ff4d4d'}} />
            </div>

            <textarea placeholder="وصف الفيديو (اكتب تفاصيل للبحث عنها لاحقاً)..." onChange={(e) => setDesc(e.target.value)} style={{...inputS, height: '80px', resize: 'none'}} />

            {/* شريط التقدم المطور */}
            {progress > 0 && (
              <div style={{ padding: '15px', background: '#f8fbff', borderRadius: '15px', border: '1px solid #d0e7ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>
                  <span>🚀 السرعة: {formatBytes(uploadStats.speed)}/ث</span>
                  <span style={{color: '#28a745'}}>{progress}%</span>
                </div>
                <div style={{ background: '#eee', height: '12px', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: progress + '%', background: '#28a745', height: '100%', transition: 'width 0.3s' }}></div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '8px' }}>
                  تم رفع {formatBytes(uploadStats.loaded)} من أصل {formatBytes(uploadStats.total)}
                </div>
              </div>
            )}

            <button onClick={handleUpload} style={btnS}>بدء الرفع الرسمي</button>
          </div>
        </div>

        {/* شريط البحث المزدوج */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <input placeholder="🔍 ابحث في العناوين أو الوصف..." onChange={(e) => setSearchTerm(e.target.value)} style={{...inputS, borderRadius:'30px', flex: 2, border: '2px solid #007bff'}} />
          <input placeholder="📂 فلتر بالمجلد..." onChange={(e) => setFolderFilter(e.target.value)} style={{...inputS, borderRadius:'30px', flex: 1, borderColor: '#28a745'}} />
        </div>

        {/* المكتبة بنظام المجلدات */}
        {Object.keys(groupedVideos).map(folderName => (
          <div key={folderName} style={{ marginBottom: '15px' }}>
            <div onClick={() => toggleFolder(folderName)} style={folderTabS}>
              <span style={{ fontWeight: 'bold' }}>📂 {folderName} ({groupedVideos[folderName].length} فيديوهات)</span>
              <span style={{fontSize: '12px'}}>{openFolders[folderName] ? '▲ إغلاق' : '▼ فتح المجلد'}</span>
            </div>
            
            {openFolders[folderName] && (
              <div style={gridS}>
                {groupedVideos[folderName].map((vid, i) => (
                  <div key={i} style={cardS}>
                    <div style={{ height: '160px', background: '#222', overflow: 'hidden' }}>
                      {vid.coverUrl ? (
                        <img src={vid.coverUrl} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="Cover" />
                      ) : (
                        <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#555', fontSize:'40px'}}>🎬</div>
                      )}
                    </div>
                    <div style={{ padding: '15px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#333' }}>{vid.title}</h4>
                      <p style={{ fontSize: '11px', color: '#777', height: '35px', overflow: 'hidden', lineHeight: '1.4' }}>{vid.description || "لا يوجد وصف لهذا الفيديو"}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', alignItems: 'center' }}>
                        <a href={vid.videoUrl} target="_blank" rel="noreferrer" style={watchBtnS}>▶ مشاهدة الآن</a>
                        <button onClick={() => {
                          const c = prompt("رمز الحذف النهائي:");
                          if(c === '2271976') axios.post('http://localhost:5000/api/delete', {videoFile: vid.videoFile, folder: vid.folder, code: c}).then(fetchVideos);
                        }} style={{color:'#ff4d4d', border:'none', background:'none', cursor:'pointer', fontSize:'14px'}}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {Object.keys(groupedVideos).length === 0 && <p style={{textAlign:'center', color:'#999', marginTop: '50px'}}>لا توجد نتائج مطابقة لبحثك..</p>}
      </div>
    </div>
  );
}

// التنسيقات (Styles)
const inputS = { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', boxSizing: 'border-box', outline: 'none', transition: '0.3s' };
const labelS = { display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', color: '#555' };
const btnS = { padding: '16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 15px rgba(0,123,255,0.3)' };
const folderTabS = { cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #007bff', color: '#007bff', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.2s' };
const gridS = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px', marginTop: '15px', padding: '10px' };
const cardS = { background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 5px 15px rgba(0,0,0,0.05)', border: '1px solid #eee' };
const watchBtnS = { background: '#28a745', color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px', padding: '8px 15px', borderRadius: '8px', boxShadow: '0 3px 10px rgba(40,167,69,0.2)' };

export default App;