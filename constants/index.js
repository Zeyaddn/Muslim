export const PRAYER_NAMES = ['الفجر', 'الشروق', 'الظهر', 'العصر', 'المغرب', 'العشاء'];

export const EGYPT_CITIES = [
  'القاهرة', 'الإسكندرية', 'الجيزة', 'شبرا الخيمة', 'بورسعيد', 'السويس',
  'المحلة الكبرى', 'طنطا', 'المنصورة', 'أسيوط', 'الزقازيق', 'الإسماعيلية',
  'كفر الشيخ', 'دمياط', 'دمنهور', 'المنيا', 'بنها', 'قنا', 'سوهاج',
  'الفيوم', 'الأقصر', 'أسوان', 'بني سويف', 'مرسى مطروح', 'الغردقة',
  'شرم الشيخ', 'العريش', 'الخارجة', 'حلوان', 'السادس من أكتوبر',
];

export const EGYPT_CITY_COORDS = {
  'القاهرة': { lat: 30.0444, lng: 31.2357 },
  'الإسكندرية': { lat: 31.2001, lng: 29.9187 },
  'الجيزة': { lat: 30.0131, lng: 31.2089 },
  'شبرا الخيمة': { lat: 30.1286, lng: 31.2423 },
  'بورسعيد': { lat: 31.2565, lng: 32.2841 },
  'السويس': { lat: 29.9668, lng: 32.5498 },
  'المحلة الكبرى': { lat: 30.9703, lng: 31.1669 },
  'طنطا': { lat: 30.7885, lng: 31.0019 },
  'المنصورة': { lat: 31.0409, lng: 31.3785 },
  'أسيوط': { lat: 27.1809, lng: 31.1837 },
  'الزقازيق': { lat: 30.5867, lng: 31.5025 },
  'الإسماعيلية': { lat: 30.5830, lng: 32.2654 },
  'كفر الشيخ': { lat: 31.1118, lng: 30.9405 },
  'دمياط': { lat: 31.4175, lng: 31.8144 },
  'دمنهور': { lat: 31.0353, lng: 30.4685 },
  'المنيا': { lat: 28.1099, lng: 30.7503 },
  'بنها': { lat: 30.4624, lng: 31.1831 },
  'قنا': { lat: 26.1667, lng: 32.7167 },
  'سوهاج': { lat: 26.5569, lng: 31.6948 },
  'الفيوم': { lat: 29.3084, lng: 30.8428 },
  'الأقصر': { lat: 25.6872, lng: 32.6396 },
  'أسوان': { lat: 24.0889, lng: 32.8998 },
  'بني سويف': { lat: 29.0665, lng: 31.0952 },
  'مرسى مطروح': { lat: 31.3524, lng: 27.2452 },
  'الغردقة': { lat: 27.2574, lng: 33.8116 },
  'شرم الشيخ': { lat: 27.9158, lng: 34.3290 },
  'العريش': { lat: 31.1326, lng: 33.8036 },
  'الخارجة': { lat: 24.5605, lng: 30.5043 },
  'حلوان': { lat: 29.8414, lng: 31.3155 },
  'السادس من أكتوبر': { lat: 29.9369, lng: 30.9306 },
};

export const TAFSIR_OPTIONS = [
  { id: 'ar.muyassar', label: 'تفسير الميسر' },
  { id: 'ar.tabary', label: 'تفسير الطبري' },
  { id: 'ar.ibn-katheer', label: 'تفسير ابن كثير' },
  { id: 'ar.saadi', label: 'تفسير السعدي' },
  { id: 'ar.qurtubi', label: 'تفسير القرطبي' },
  { id: 'ar.baghawy', label: 'تفسير البغوي' },
  { id: 'ar.jalalayn', label: 'تفسير الجلالين' },
  { id: 'ar.shaarawy', label: 'تفسير الشعراوي' },
  { id: 'ar.tantawi', label: 'تفسير طنطاوي' },
  { id: 'ar.muntakhab', label: 'المنتخب في تفسير القرآن' },
];

export const SCHOLAR_VIDEOS = [
  {
    name: 'الشيخ محمد متولي الشعراوي',
    desc: 'مختارات مرئية',
    videos: [
      { title: 'روائع الشيخ الشعراوي', id: '3t5QqXs7W_0' },
      { title: 'خواطر إيمانية', id: 'EZOTk8jwbgE' },
    ],
  }
];

export const TARGETS = [33, 100, 300, 1000];

export const HIJRI_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
export const HIJRI_MONTH_DAYS = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];

export const RECITER_SERVERS = {
  abdulbasit: [{ server: 7, folder: 'basit' }],
  husary: [{ server: 13, folder: 'husr' }],
  minshawy: [{ server: 10, folder: 'minsh' }],
  mishary: [{ server: 8, folder: 'afs' }],
  sudais: [{ server: 11, folder: 'sds' }],
  shuraym: [{ server: 7, folder: 'shur' }],
  ayyoub: [{ server: 8, folder: 'ayyoub' }],
  ajamy: [{ server: 10, folder: 'ajm' }],
  ghamdi: [{ server: 7, folder: 's_gmd' }, { server: 6, folder: 'ghamdi' }],
  dosari: [{ server: 11, folder: 'yasser' }],
  hazza: [{ server: 11, folder: 'hazza' }],
};

export const RECITER_QURANCOM_IDS = {
  abdulbasit: 2,
  sudais: 3,
  shatri: 4,
  mishary: 6,
  rifai: 7,
  husary: 8,
  minshawy: 9,
  shuraym: 12,
  ghamdi: 13,
  dosari: 174,
};

export const ALQURAN_CLOUD_IDS = {
  abdulbasit: 'ar.abdulsamad',
  husary: 'ar.husary',
  minshawy: 'ar.minshawi',
  mishary: 'ar.alafasy',
  sudais: 'ar.abdurrahmaansudais',
  shuraym: 'ar.saoodshuraym',
  ayyoub: 'ar.muhammadayyoub',
  ajamy: 'ar.ahmedajamy',
};

export const FEATURES = [
  { key: 'quran', icon: 'fa-book-open', title: 'القرآن الكريم', desc: 'اقرأ واستمع لآيات القرآن الكريم مع التفسير' },
  { key: 'adhkar', icon: 'fa-praying-hands', title: 'الأذكار', desc: 'أذكار الصباح والمساء والنوم والصلاة' },
  { key: 'duas', icon: 'fa-hands-praying', title: 'الأدعية', desc: 'مجموعة من الأدعية القرآنية والنبوية' },
  { key: 'hadith', icon: 'fa-book', title: 'الحديث الشريف', desc: 'مجموعة من الأحاديث النبوية الشريفة' },
  { key: 'tasbeeh', icon: 'fa-pray', title: 'المسبحة', desc: 'سبح الله واذكره بالعديد من الأذكار' },
  { key: 'names', icon: 'fa-star', title: 'الأسماء الحسنى', desc: 'تعرف على أسماء الله الحسنى ومعانيها' },
  { key: 'library', icon: 'fa-book', title: 'المكتبة الإسلامية', desc: 'كتب إسلامية متنوعة للقراءة والتحميل' },
  { key: 'quizzes', icon: 'fa-question-circle', title: 'اختبارات', desc: 'اختبر معلوماتك الإسلامية' },
  { key: 'articles', icon: 'fa-pen', title: 'المقالات', desc: 'مقالات إسلامية متنوعة' },
];

export const FONT_SIZES = [1.2, 1.4, 1.6, 1.8, 2.0, 2.2];

export const ARABIC_NUMS = '٠١٢٣٤٥٦٧٨٩';

export const TV_IMAGES = [
  'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?q=80&w=1920&auto=format&fit=crop',
];

export const TV_VIDEOS = ['r1_qAlTMMPY', 'RtLoCZhUiew'];

export const DUA_CATEGORIES = [
  ['morning', 'الصباح'],
  ['evening', 'المساء'],
  ['after-prayer', 'بعد الصلاة'],
  ['before-sleep', 'قبل النوم'],
  ['waking-up', 'الاستيقاظ'],
  ['prayer', 'الصلاة'],
  ['travel', 'السفر'],
  ['food', 'الطعام'],
  ['protection', 'التحصين'],
  ['hajj', 'الحج'],
];

export const QURAN_BG_IMAGES = [
  'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519817650390-64a93db51571?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1545579133-99bb5ab189bd?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1920&auto=format&fit=crop',
];

export const QURAN_BG_VIDEOS = [
  'r1_qAlTMMPY',
  'RtLoCZhUiew',
  '3t5QqXs7W_0',
];

export const DIRECTION_NAMES = {
  0: 'شمال', 45: 'شمال شرق', 90: 'شرق', 135: 'جنوب شرق',
  180: 'جنوب', 225: 'جنوب غرب', 270: 'غرب', 315: 'شمال غرب',
};
