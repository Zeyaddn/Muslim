// هُدَى — Muezzin registry (single source shared by client & server UI).
// Adding a future muezzin = one line here; the notification system is agnostic.
const ADHANS = {
  'abdulbasit-egyptian': { name: 'عبد الباسط عبد الصمد — مصر', url: '/audio/adhan/egyptian-abdulbasit.mp3' },
  'minshawi-egyptian': { name: 'محمد صديق المنشاوي — مصر', url: '/audio/adhan/egyptian-minshawi.mp3' },
};

const DEFAULT_ADHAN = 'abdulbasit-egyptian';

module.exports = { ADHANS, DEFAULT_ADHAN };
