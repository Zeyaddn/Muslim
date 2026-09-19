// وضع النشر لتطبيق «هُدَى».
// استضافة InfinityFree (وأي استضافة ثابتة/PHP) لا تدعم تشغيل سيرفر Node،
// لذلك نُطفئ ميزات الخادم هنا. لو انتقلت لاحقًا لاستضافة تدعم Node.js
// (Render أو Railway أو VPS…) اجعل القيمة true لتعود الإشعارات للعمل.
export const PUSH_ENABLED = false;

// قارئ الكتب: يعمل عبر iframe من Archive.org (لا يحتاج أي سيرفر).
export const BOOK_READER_EMBED = true;
