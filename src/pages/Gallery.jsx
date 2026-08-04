import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useSession } from '../context/SessionContext';
import { useProfileNicknames } from '../hooks/useProfiles';
import { useGalleryMedia, GALLERY_MEDIA_QUERY_KEY } from '../hooks/useGalleryMedia';
import { uploadToCloudinary } from '../lib/cloudinary';
import { prepareImageFileForUpload } from '../lib/resizeImageForUpload';
import { cloudinaryDisplay, cloudinaryThumb } from '../lib/cloudinaryUrl';
import { 
  LayoutGrid, Calendar as CalendarIcon, FolderHeart, 
  Plus, X, Trash2, Download, 
  Sparkles, Heart, ArrowLeft
} from 'lucide-react';
import CuteLoader from '../components/CuteLoader';
import { LOADING_COPY } from '../lib/loadingCopy';

const Gallery = () => {
  const { sessionUserId, spaceId } = useSession();
  const queryClient = useQueryClient();
  const { data: media = [] } = useGalleryMedia();
  const [view, setView] = useState('grid'); // grid | calendar | album
  const [activeAlbum, setActiveAlbum] = useState(null); // Trạng thái để lọc ảnh theo album
  const [uploading, setUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date());

  const { tabNames } = useProfileNicknames();
  const galleryKey = [...GALLERY_MEDIA_QUERY_KEY, spaceId];

  const invalidateGallery = () =>
    queryClient.invalidateQueries({ queryKey: galleryKey });

  const runGalleryDbUpload = async (items) => {
    if (!spaceId || !sessionUserId) {
      alert('Chưa vào Space.');
      return;
    }
    const caption = window.prompt(`✍️ Nhập chú thích cho ${items.length} kỷ niệm này (để trống nếu không muốn ghi):`, '') || '';
    const albumInput = window.prompt("📂 Nhập tên Album (để trống sẽ lưu vào 'Chung'):", 'Chung') || 'Chung';

    setUploading(true);
    try {
      const results = await Promise.all(
        items.map(async (item, i) => {
          const raw = item instanceof File ? item : new File([item], `memory-${i}.jpg`, { type: 'image/jpeg' });
          const file = await prepareImageFileForUpload(raw, {
            maxEdge: 2048,
            maxBytesBeforeProcess: 550 * 1024,
          });
          const filename =
            file instanceof File && file.name
              ? file.name
              : `memory-${Date.now()}-${i}.jpg`;
          const { secureUrl, publicId } = await uploadToCloudinary(
            file,
            `spaces/${spaceId}/gallery`,
            filename
          );

          let captureDate = new Date();
          if (view === 'calendar') {
            captureDate = new Date(filterDate);
            const now = new Date();
            captureDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
          }

          return {
            file_url: secureUrl,
            cloudinary_public_id: publicId,
            media_type: 'image',
            capture_date: captureDate.toISOString(),
            album_name: albumInput.trim(),
            caption: caption.trim(),
            created_by: sessionUserId,
            space_id: spaceId,
          };
        })
      );

      const { error: dbError } = await supabase.from('media_gallery').insert(results);
      if (dbError) throw dbError;

      await invalidateGallery();
      alert(`Đã tải lên thành công ${items.length} kỷ niệm mới! ✨`);
    } catch (error) {
      alert('Lỗi: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;
    void runGalleryDbUpload(files);
  };

  const deleteMedia = async (item) => {
    const names = Object.values(tabNames).filter(Boolean).join(' / ') || 'Hai bạn';
    if (!window.confirm(`${names} có chắc muốn xóa kỷ niệm này không?`)) return;
    const { error } = await supabase.from('media_gallery').delete().eq('id', item.id);
    if (!error) {
      setSelectedItem(null);
      await invalidateGallery();
    }
  };

  const mediaByDate = media.filter(item => 
    new Date(item.capture_date).toDateString() === filterDate.toDateString()
  );

  const albums = media.reduce((acc, item) => {
    const name = item.album_name || 'Chung';
    if (!acc[name]) acc[name] = [];
    acc[name].push(item);
    return acc;
  }, {});

  // Lọc ảnh hiển thị theo Album nếu đang chọn xem Album
  const displayedMedia = activeAlbum && view === 'grid' 
    ? media.filter(item => (item.album_name || 'Chung') === activeAlbum)
    : media;

  return (
    <div className="max-w-5xl mx-auto p-4 pb-24 animate-fade-in font-sans">
      {uploading && (
        <CuteLoader
          variant="overlay"
          motion="fluff"
          message={LOADING_COPY.AP_GALLERY}
        />
      )}
      
      <style>
        {`
          /* 1. Chữ trắng viền đen cho Caption */
          .text-white-outline {
            color: white !important;
            -webkit-text-stroke: 0.6px black;
            paint-order: stroke fill;
          }

          /* 2. Cấu trúc Calendar */
          .react-calendar { 
            width: 100% !important; 
            border: none !important; 
            font-family: inherit; 
          }

          /* 3. Xóa bỏ hoàn toàn độ trễ và hiệu ứng mặc định của các ô ngày */
          .react-calendar__tile { 
            height: 60px !important; 
            display: flex !important; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            position: relative; 
            font-weight: 600; 
            font-size: 14px; 
            border-radius: 18px; 
            transition: none !important; 
            outline: none !important;
            -webkit-tap-highlight-color: transparent; /* Xóa bóng mờ xanh khi chạm trên điện thoại */
          }

          /* 4. Rê chuột (Hover): Hiện màu xanh nhạt ngay lập tức */
          .react-calendar__tile:hover { 
            background-color: color-mix(in srgb, var(--om-primary) 19%, transparent) !important; 
            transition: none !important;
          }

          /* 5. Click hoặc Đang chọn: Ép hiện màu xanh đậm ngay, không nháy trắng */
          .react-calendar__tile:active,
          .react-calendar__tile:focus,
          .react-calendar__tile--active { 
            background: var(--om-primary) !important; 
            color: white !important; 
            box-shadow: 0 10px 15px -3px rgba(124, 161, 217, 0.4); 
            transition: none !important;
          }

          /* 6. Đảm bảo chữ số và trái tim chuyển màu trắng đồng bộ và tức thì */
          .react-calendar__tile abbr,
          .react-calendar__tile--active abbr,
          .react-calendar__tile:active abbr {
            transition: none !important;
            text-decoration: none !important;
          }
          
          .react-calendar__tile--active abbr,
          .react-calendar__tile:active abbr {
            color: white !important;
          }

          /* 7. Navigation (Mũi tên chuyển tháng) */
          .react-calendar__navigation button { 
            font-size: 18px; 
            font-weight: 900; 
            color: var(--om-primary); 
            transition: none !important; 
          }

          /* 8. Đánh dấu ngày có kỷ niệm */
          .has-memory { 
            color: var(--om-accent) !important; 
            font-weight: 900 !important; 
          }
          .has-memory::after { 
            content: '❤'; 
            position: absolute; 
            bottom: 6px; 
            font-size: 8px; 
            color: var(--om-accent); 
            transition: none !important;
          }
          
          /* Trái tim màu trắng khi ngày đó được chọn */
          .react-calendar__tile--active.has-memory::after,
          .react-calendar__tile:active.has-memory::after { 
            color: white !important; 
          }
        `}
      </style>

      {/* HEADER */}
<header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
  <div className="flex justify-between items-center w-full md:w-auto">
    <div>
      <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
        Kho Kỷ Niệm <Heart className="text-[var(--om-accent)] fill-[var(--om-accent)]" size={24} />
      </h1>
    </div>

    {/* NÚT THÊM ẢNH MỚI NẰM Ở ĐÂY (CHỈ HIỆN TRÊN MOBILE GẦN TIÊU ĐỀ) */}
    <label className="md:hidden w-12 h-12 bg-[var(--om-accent)] text-[var(--om-on-accent)] rounded-2xl shadow-lg flex items-center justify-center cursor-pointer active:scale-90 transition-all">
      {uploading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Plus size={24} />}
      <input type="file" className="hidden" accept="image/*" multiple onChange={handleGalleryUpload} disabled={uploading} />
    </label>
  </div>

  <div className="flex items-center gap-3 w-full md:w-auto">
    <div className="bg-white p-1.5 rounded-[22px] flex flex-1 md:flex-none gap-1 shadow-sm border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)]">
      {[
        { id: 'grid', icon: LayoutGrid, label: 'Tất cả' },
        { id: 'calendar', icon: CalendarIcon, label: 'Lịch' },
        { id: 'album', icon: FolderHeart, label: 'Album' }
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => { 
            setView(tab.id); 
            setActiveAlbum(null); 
          }}
          className={`flex flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-black transition-all ${
            view === tab.id ? 'bg-[var(--om-primary)] text-[var(--om-on-primary)] shadow-lg' : 'text-gray-400 hover:bg-[color-mix(in_srgb,var(--om-primary)_10%,transparent)]'
          }`}
        >
          <tab.icon size={14} /> {tab.label}
        </button>
      ))}
    </div>

    {/* NÚT THÊM ẢNH CHO DESKTOP */}
    <label className="hidden md:flex w-12 h-12 bg-[var(--om-accent)] text-[var(--om-on-accent)] rounded-2xl shadow-lg items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all">
      {uploading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Plus size={24} />}
      <input type="file" className="hidden" accept="image/*" multiple onChange={handleGalleryUpload} disabled={uploading} />
    </label>
  </div>
</header>

      {/* MAIN CONTENT */}
      <main className="min-h-[60vh]">
        {view === 'grid' && (
          <div>
            {/* Hiển thị tiêu đề nếu đang xem trong một Album cụ thể */}
            {activeAlbum && (
              <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)]">
                <h2 className="text-lg font-black text-gray-700 flex items-center gap-2">
                  <FolderHeart className="text-[var(--om-accent)]" size={20} /> Album: {activeAlbum}
                </h2>
                <button 
                  onClick={() => setActiveAlbum(null)} 
                  className="text-xs font-bold text-[var(--om-on-primary)] bg-[var(--om-primary)] px-4 py-2 rounded-xl hover:opacity-90 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft size={14} /> Xem tất cả
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {displayedMedia.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedItem(item)}
                  className="aspect-square rounded-[28px] overflow-hidden cursor-pointer hover:shadow-xl active:scale-95 transition-all border-4 border-white shadow-md group"
                >
                  <img src={cloudinaryThumb(item.file_url, 400)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Memory" />
                </div>
              ))}
              {displayedMedia.length === 0 && (
                <div className="col-span-full py-10 text-center text-gray-400 font-medium italic text-sm">
                  Chưa có ảnh nào ở đây cả...
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'calendar' && (
          <div className="flex flex-col items-center gap-10">
            <div className="w-full max-w-sm bg-white p-4 rounded-[40px] shadow-2xl border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)]">
              <Calendar 
                onChange={setFilterDate} 
                value={filterDate}
                tileClassName={({ date }) => 
                  media.some(m => new Date(m.capture_date).toDateString() === date.toDateString()) 
                  ? 'has-memory' : null
                }
              />
            </div>
            
            <div className="w-full">
              <div className="flex items-center justify-between mb-6 px-4">
                 <h3 className="font-black text-gray-700 text-lg">Kỷ niệm ngày {filterDate.toLocaleDateString('vi-VN')}</h3>
                 <span className="text-[10px] bg-[var(--om-accent)] text-[var(--om-on-accent)] px-3 py-1 rounded-full font-bold uppercase">
                   {mediaByDate.length} ảnh
                 </span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 px-2">
                {mediaByDate.map(item => (
                  <div key={item.id} onClick={() => setSelectedItem(item)} className="aspect-square rounded-2xl overflow-hidden shadow-sm cursor-pointer border-2 border-white">
                    <img src={cloudinaryThumb(item.file_url, 280)} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'album' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {Object.keys(albums).map(albumName => (
              <div 
                key={albumName} 
                onClick={() => {
                  setActiveAlbum(albumName);
                  setView('grid');
                }}
                className="bg-white p-6 rounded-[40px] shadow-sm border border-[color-mix(in_srgb,var(--om-lavender)_30%,transparent)] group hover:shadow-xl hover:border-[color-mix(in_srgb,var(--om-accent)_50%,transparent)] transition-all cursor-pointer"
              >
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-black text-gray-700 text-xl flex items-center gap-2 group-hover:text-[var(--om-accent)] transition-colors">
                    <FolderHeart size={22} className="text-[var(--om-primary-soft)] group-hover:text-[var(--om-accent)] transition-colors" /> {albumName}
                  </h3>
                  <span className="text-[10px] bg-[color-mix(in_srgb,var(--om-primary)_10%,transparent)] text-[var(--om-primary)] px-3 py-1 rounded-xl font-black">{albums[albumName].length} ảnh</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {albums[albumName].slice(0, 3).map((img, i) => (
                    <div key={img.id} className="aspect-square rounded-2xl overflow-hidden relative border-2 border-white shadow-sm">
                       <img src={cloudinaryThumb(img.file_url, 280)} className="w-full h-full object-cover" />
                       {i === 2 && albums[albumName].length > 3 && (
                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-black">
                           +{albums[albumName].length - 3}
                         </div>
                       )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>


      {/* MODAL CHI TIẾT - Áp dụng chữ trắng viền đen ở đây */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col animate-fade-in">
          <div className="p-6 flex justify-between items-center text-white">
             <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
             <div className="flex gap-6">
                <a href={selectedItem.file_url} download target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded-full"><Download size={24} /></a>
                <button onClick={() => deleteMedia(selectedItem)} className="p-2 hover:bg-red-500/20 rounded-full"><Trash2 size={24} className="text-red-500" /></button>
             </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={cloudinaryDisplay(selectedItem.file_url, 1600)} className="max-w-full max-h-[75vh] rounded-2xl object-contain shadow-2xl" />
          </div>

          <div className="p-8 bg-gradient-to-t from-black/80 to-transparent">
             <div className="max-w-2xl mx-auto">
               <div className="flex items-center gap-2 text-[var(--om-accent)] text-[11px] font-black uppercase tracking-[0.2em] mb-3">
                  <Sparkles size={14} /> Chú thích của kỉ niệm này
               </div>
               {/* Áp dụng class chữ trắng viền đen */}
               <p className="text-white-outline text-lg font-medium leading-relaxed mb-4">
                 {selectedItem.caption || "Mảnh ghép ngọt ngào của tụi mình..."}
               </p>
               <div className="flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-white-outline text-xs font-bold italic">{new Date(selectedItem.capture_date).toLocaleDateString('vi-VN')}</span>
                  <span className="bg-white/10 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase">Album: {selectedItem.album_name}</span>
               </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Gallery;