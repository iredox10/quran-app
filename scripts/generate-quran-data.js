import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '../public/quran-data');

// All 114 surahs with metadata (from Quran.com API)
const CHAPTERS = [
  { id: 1, revelation_place: "makkah", revelation_order: 5, verses_count: 7, name_complex: "Al-Fātiĥah", name_arabic: "الفاتحة", name_simple: "Al-Fatiha", translated_name: { name: "The Opener", language_name: "english" } },
  { id: 2, revelation_place: "madinah", revelation_order: 87, verses_count: 286, name_complex: "Al-Baqarah", name_arabic: "البقرة", name_simple: "Al-Baqarah", translated_name: { name: "The Cow", language_name: "english" } },
  { id: 3, revelation_place: "madinah", revelation_order: 89, verses_count: 200, name_complex: "Āl-`Imrān", name_arabic: "آل عمران", name_simple: "Ali 'Imran", translated_name: { name: "Family of Imran", language_name: "english" } },
  { id: 4, revelation_place: "madinah", revelation_order: 92, verses_count: 176, name_complex: "An-Nisā'", name_arabic: "النساء", name_simple: "An-Nisa", translated_name: { name: "The Women", language_name: "english" } },
  { id: 5, revelation_place: "madinah", revelation_order: 112, verses_count: 120, name_complex: "Al-Mā'idah", name_arabic: "المائدة", name_simple: "Al-Ma'idah", translated_name: { name: "The Table Spread", language_name: "english" } },
  { id: 6, revelation_place: "makkah", revelation_order: 55, verses_count: 165, name_complex: "Al-'An`ām", name_arabic: "الأنعام", name_simple: "Al-An'am", translated_name: { name: "The Cattle", language_name: "english" } },
  { id: 7, revelation_place: "makkah", revelation_order: 39, verses_count: 206, name_complex: "Al-'A`rāf", name_arabic: "الأعراف", name_simple: "Al-A'raf", translated_name: { name: "The Heights", language_name: "english" } },
  { id: 8, revelation_place: "madinah", revelation_order: 88, verses_count: 75, name_complex: "Al-'Anfāl", name_arabic: "الأنفال", name_simple: "Al-Anfal", translated_name: { name: "The Spoils of War", language_name: "english" } },
  { id: 9, revelation_place: "madinah", revelation_order: 113, verses_count: 129, name_complex: "At-Tawbah", name_arabic: "التوبة", name_simple: "At-Tawbah", translated_name: { name: "The Repentance", language_name: "english" } },
  { id: 10, revelation_place: "makkah", revelation_order: 51, verses_count: 109, name_complex: "Yūnus", name_arabic: "يونس", name_simple: "Yunus", translated_name: { name: "Jonah", language_name: "english" } },
  { id: 11, revelation_place: "makkah", revelation_order: 52, verses_count: 123, name_complex: "Hūd", name_arabic: "هود", name_simple: "Hud", translated_name: { name: "Hud", language_name: "english" } },
  { id: 12, revelation_place: "makkah", revelation_order: 53, verses_count: 111, name_complex: "Yūsuf", name_arabic: "يوسف", name_simple: "Yusuf", translated_name: { name: "Joseph", language_name: "english" } },
  { id: 13, revelation_place: "madinah", revelation_order: 96, verses_count: 43, name_complex: "Ar-Ra`d", name_arabic: "الرعد", name_simple: "Ar-Ra'd", translated_name: { name: "The Thunder", language_name: "english" } },
  { id: 14, revelation_place: "makkah", revelation_order: 72, verses_count: 52, name_complex: "'Ibrāhīm", name_arabic: "ابراهيم", name_simple: "Ibrahim", translated_name: { name: "Abraham", language_name: "english" } },
  { id: 15, revelation_place: "makkah", revelation_order: 54, verses_count: 99, name_complex: "Al-Ĥijr", name_arabic: "الحجر", name_simple: "Al-Hijr", translated_name: { name: "The Rocky Tract", language_name: "english" } },
  { id: 16, revelation_place: "makkah", revelation_order: 70, verses_count: 128, name_complex: "An-Naĥl", name_arabic: "النحل", name_simple: "An-Nahl", translated_name: { name: "The Bee", language_name: "english" } },
  { id: 17, revelation_place: "makkah", revelation_order: 50, verses_count: 111, name_complex: "Al-'Isrā'", name_arabic: "الإسراء", name_simple: "Al-Isra", translated_name: { name: "The Night Journey", language_name: "english" } },
  { id: 18, revelation_place: "makkah", revelation_order: 69, verses_count: 110, name_complex: "Al-Kahf", name_arabic: "الكهف", name_simple: "Al-Kahf", translated_name: { name: "The Cave", language_name: "english" } },
  { id: 19, revelation_place: "makkah", revelation_order: 44, verses_count: 98, name_complex: "Maryam", name_arabic: "مريم", name_simple: "Maryam", translated_name: { name: "Mary", language_name: "english" } },
  { id: 20, revelation_place: "makkah", revelation_order: 45, verses_count: 135, name_complex: "Ţāhā", name_arabic: "طه", name_simple: "Taha", translated_name: { name: "Ta-Ha", language_name: "english" } },
  { id: 21, revelation_place: "makkah", revelation_order: 73, verses_count: 112, name_complex: "Al-'Anbiyā'", name_arabic: "الأنبياء", name_simple: "Al-Anbya", translated_name: { name: "The Prophets", language_name: "english" } },
  { id: 22, revelation_place: "madinah", revelation_order: 103, verses_count: 78, name_complex: "Al-Ĥaj", name_arabic: "الحج", name_simple: "Al-Haj", translated_name: { name: "The Pilgrimage", language_name: "english" } },
  { id: 23, revelation_place: "makkah", revelation_order: 74, verses_count: 118, name_complex: "Al-Mu'minūn", name_arabic: "المؤمنون", name_simple: "Al-Mu'minun", translated_name: { name: "The Believers", language_name: "english" } },
  { id: 24, revelation_place: "madinah", revelation_order: 102, verses_count: 64, name_complex: "An-Nūr", name_arabic: "النور", name_simple: "An-Nur", translated_name: { name: "The Light", language_name: "english" } },
  { id: 25, revelation_place: "makkah", revelation_order: 42, verses_count: 77, name_complex: "Al-Furqān", name_arabic: "الفرقان", name_simple: "Al-Furqan", translated_name: { name: "The Criterion", language_name: "english" } },
  { id: 26, revelation_place: "makkah", revelation_order: 47, verses_count: 227, name_complex: "Ash-Shu`arā'", name_arabic: "الشعراء", name_simple: "Ash-Shu'ara", translated_name: { name: "The Poets", language_name: "english" } },
  { id: 27, revelation_place: "makkah", revelation_order: 48, verses_count: 93, name_complex: "An-Naml", name_arabic: "النمل", name_simple: "An-Naml", translated_name: { name: "The Ant", language_name: "english" } },
  { id: 28, revelation_place: "makkah", revelation_order: 49, verses_count: 88, name_complex: "Al-Qaşaş", name_arabic: "القصص", name_simple: "Al-Qasas", translated_name: { name: "The Stories", language_name: "english" } },
  { id: 29, revelation_place: "makkah", revelation_order: 85, verses_count: 69, name_complex: "Al-`Ankabūt", name_arabic: "العنكبوت", name_simple: "Al-Ankabut", translated_name: { name: "The Spider", language_name: "english" } },
  { id: 30, revelation_place: "makkah", revelation_order: 84, verses_count: 60, name_complex: "Ar-Rūm", name_arabic: "الروم", name_simple: "Ar-Rum", translated_name: { name: "The Romans", language_name: "english" } },
  { id: 31, revelation_place: "makkah", revelation_order: 57, verses_count: 34, name_complex: "Luqmān", name_arabic: "لقمان", name_simple: "Luqman", translated_name: { name: "Luqman", language_name: "english" } },
  { id: 32, revelation_place: "makkah", revelation_order: 75, verses_count: 30, name_complex: "As-Sajdah", name_arabic: "السجدة", name_simple: "As-Sajdah", translated_name: { name: "The Prostration", language_name: "english" } },
  { id: 33, revelation_place: "madinah", revelation_order: 90, verses_count: 73, name_complex: "Al-'Aĥzāb", name_arabic: "الأحزاب", name_simple: "Al-Ahzab", translated_name: { name: "The Combined Forces", language_name: "english" } },
  { id: 34, revelation_place: "makkah", revelation_order: 58, verses_count: 54, name_complex: "Saba'", name_arabic: "سبإ", name_simple: "Saba", translated_name: { name: "Sheba", language_name: "english" } },
  { id: 35, revelation_place: "makkah", revelation_order: 43, verses_count: 45, name_complex: "Fāţir", name_arabic: "فاطر", name_simple: "Fatir", translated_name: { name: "Originator", language_name: "english" } },
  { id: 36, revelation_place: "makkah", revelation_order: 41, verses_count: 83, name_complex: "Yā-Sīn", name_arabic: "يس", name_simple: "Ya-Sin", translated_name: { name: "Ya Sin", language_name: "english" } },
  { id: 37, revelation_place: "makkah", revelation_order: 56, verses_count: 182, name_complex: "Aş-Şāffāt", name_arabic: "الصافات", name_simple: "As-Saffat", translated_name: { name: "Those who set the Ranks", language_name: "english" } },
  { id: 38, revelation_place: "makkah", revelation_order: 38, verses_count: 88, name_complex: "Şād", name_arabic: "ص", name_simple: "Sad", translated_name: { name: "The Letter Saad", language_name: "english" } },
  { id: 39, revelation_place: "makkah", revelation_order: 59, verses_count: 75, name_complex: "Az-Zumar", name_arabic: "الزمر", name_simple: "Az-Zumar", translated_name: { name: "The Troops", language_name: "english" } },
  { id: 40, revelation_place: "makkah", revelation_order: 60, verses_count: 85, name_complex: "Ghāfir", name_arabic: "غافر", name_simple: "Ghafir", translated_name: { name: "The Forgiver", language_name: "english" } },
  { id: 41, revelation_place: "makkah", revelation_order: 61, verses_count: 54, name_complex: "Fuşşilat", name_arabic: "فصلت", name_simple: "Fussilat", translated_name: { name: "Explained in Detail", language_name: "english" } },
  { id: 42, revelation_place: "makkah", revelation_order: 62, verses_count: 53, name_complex: "Ash-Shūraá", name_arabic: "الشورى", name_simple: "Ash-Shuraa", translated_name: { name: "The Consultation", language_name: "english" } },
  { id: 43, revelation_place: "makkah", revelation_order: 63, verses_count: 89, name_complex: "Az-Zukhruf", name_arabic: "الزخرف", name_simple: "Az-Zukhruf", translated_name: { name: "The Ornaments of Gold", language_name: "english" } },
  { id: 44, revelation_place: "makkah", revelation_order: 64, verses_count: 59, name_complex: "Ad-Dukhān", name_arabic: "الدخان", name_simple: "Ad-Dukhan", translated_name: { name: "The Smoke", language_name: "english" } },
  { id: 45, revelation_place: "makkah", revelation_order: 65, verses_count: 37, name_complex: "Al-Jāthiyah", name_arabic: "الجاثية", name_simple: "Al-Jathiyah", translated_name: { name: "The Crouching", language_name: "english" } },
  { id: 46, revelation_place: "makkah", revelation_order: 66, verses_count: 35, name_complex: "Al-'Aĥqāf", name_arabic: "الأحقاف", name_simple: "Al-Ahqaf", translated_name: { name: "The Wind-Curved Sandhills", language_name: "english" } },
  { id: 47, revelation_place: "madinah", revelation_order: 95, verses_count: 38, name_complex: "Muĥammad", name_arabic: "محمد", name_simple: "Muhammad", translated_name: { name: "Muhammad", language_name: "english" } },
  { id: 48, revelation_place: "madinah", revelation_order: 111, verses_count: 29, name_complex: "Al-Fatĥ", name_arabic: "الفتح", name_simple: "Al-Fath", translated_name: { name: "The Victory", language_name: "english" } },
  { id: 49, revelation_place: "madinah", revelation_order: 106, verses_count: 18, name_complex: "Al-Ĥujurāt", name_arabic: "الحجرات", name_simple: "Al-Hujurat", translated_name: { name: "The Rooms", language_name: "english" } },
  { id: 50, revelation_place: "makkah", revelation_order: 34, verses_count: 45, name_complex: "Qāf", name_arabic: "ق", name_simple: "Qaf", translated_name: { name: "The Letter Qaf", language_name: "english" } },
  { id: 51, revelation_place: "makkah", revelation_order: 67, verses_count: 60, name_complex: "Adh-Dhāriyāt", name_arabic: "الذاريات", name_simple: "Adh-Dhariyat", translated_name: { name: "The Winnowing Winds", language_name: "english" } },
  { id: 52, revelation_place: "makkah", revelation_order: 76, verses_count: 49, name_complex: "Aţ-Ţūr", name_arabic: "الطور", name_simple: "At-Tur", translated_name: { name: "The Mount", language_name: "english" } },
  { id: 53, revelation_place: "makkah", revelation_order: 23, verses_count: 62, name_complex: "An-Najm", name_arabic: "النجم", name_simple: "An-Najm", translated_name: { name: "The Star", language_name: "english" } },
  { id: 54, revelation_place: "makkah", revelation_order: 37, verses_count: 55, name_complex: "Al-Qamar", name_arabic: "القمر", name_simple: "Al-Qamar", translated_name: { name: "The Moon", language_name: "english" } },
  { id: 55, revelation_place: "madinah", revelation_order: 97, verses_count: 78, name_complex: "Ar-Raĥmān", name_arabic: "الرحمن", name_simple: "Ar-Rahman", translated_name: { name: "The Beneficent", language_name: "english" } },
  { id: 56, revelation_place: "makkah", revelation_order: 46, verses_count: 96, name_complex: "Al-Wāqi`ah", name_arabic: "الواقعة", name_simple: "Al-Waqi'ah", translated_name: { name: "The Inevitable", language_name: "english" } },
  { id: 57, revelation_place: "madinah", revelation_order: 94, verses_count: 29, name_complex: "Al-Ĥadīd", name_arabic: "الحديد", name_simple: "Al-Hadid", translated_name: { name: "The Iron", language_name: "english" } },
  { id: 58, revelation_place: "madinah", revelation_order: 105, verses_count: 22, name_complex: "Al-Mujādila", name_arabic: "المجادلة", name_simple: "Al-Mujadila", translated_name: { name: "The Pleading Woman", language_name: "english" } },
  { id: 59, revelation_place: "madinah", revelation_order: 101, verses_count: 24, name_complex: "Al-Ĥashr", name_arabic: "الحشر", name_simple: "Al-Hashr", translated_name: { name: "The Exile", language_name: "english" } },
  { id: 60, revelation_place: "madinah", revelation_order: 91, verses_count: 13, name_complex: "Al-Mumtaĥanah", name_arabic: "الممتحنة", name_simple: "Al-Mumtahanah", translated_name: { name: "She that is to be examined", language_name: "english" } },
  { id: 61, revelation_place: "madinah", revelation_order: 109, verses_count: 14, name_complex: "Aş-Şaf", name_arabic: "الصف", name_simple: "As-Saf", translated_name: { name: "The Ranks", language_name: "english" } },
  { id: 62, revelation_place: "madinah", revelation_order: 110, verses_count: 11, name_complex: "Al-Jumu`ah", name_arabic: "الجمعة", name_simple: "Al-Jumu'ah", translated_name: { name: "The Congregation, Friday", language_name: "english" } },
  { id: 63, revelation_place: "madinah", revelation_order: 104, verses_count: 11, name_complex: "Al-Munāfiqūn", name_arabic: "المنافقون", name_simple: "Al-Munafiqun", translated_name: { name: "The Hypocrites", language_name: "english" } },
  { id: 64, revelation_place: "madinah", revelation_order: 108, verses_count: 18, name_complex: "At-Taghābun", name_arabic: "التغابن", name_simple: "At-Taghabun", translated_name: { name: "The Mutual Disillusion", language_name: "english" } },
  { id: 65, revelation_place: "madinah", revelation_order: 99, verses_count: 12, name_complex: "Aţ-Ţalāq", name_arabic: "الطلاق", name_simple: "At-Talaq", translated_name: { name: "The Divorce", language_name: "english" } },
  { id: 66, revelation_place: "madinah", revelation_order: 107, verses_count: 12, name_complex: "At-Taĥrīm", name_arabic: "التحريم", name_simple: "At-Tahrim", translated_name: { name: "The Prohibition", language_name: "english" } },
  { id: 67, revelation_place: "makkah", revelation_order: 77, verses_count: 30, name_complex: "Al-Mulk", name_arabic: "الملك", name_simple: "Al-Mulk", translated_name: { name: "The Sovereignty", language_name: "english" } },
  { id: 68, revelation_place: "makkah", revelation_order: 2, verses_count: 52, name_complex: "Al-Qalam", name_arabic: "القلم", name_simple: "Al-Qalam", translated_name: { name: "The Pen", language_name: "english" } },
  { id: 69, revelation_place: "makkah", revelation_order: 78, verses_count: 52, name_complex: "Al-Ĥāqqah", name_arabic: "الحاقة", name_simple: "Al-Haqqah", translated_name: { name: "The Reality", language_name: "english" } },
  { id: 70, revelation_place: "makkah", revelation_order: 79, verses_count: 44, name_complex: "Al-Ma`ārij", name_arabic: "المعارج", name_simple: "Al-Ma'arij", translated_name: { name: "The Ascending Stairways", language_name: "english" } },
  { id: 71, revelation_place: "makkah", revelation_order: 71, verses_count: 28, name_complex: "Nūĥ", name_arabic: "نوح", name_simple: "Nuh", translated_name: { name: "Noah", language_name: "english" } },
  { id: 72, revelation_place: "makkah", revelation_order: 40, verses_count: 28, name_complex: "Al-Jinn", name_arabic: "الجن", name_simple: "Al-Jinn", translated_name: { name: "The Jinn", language_name: "english" } },
  { id: 73, revelation_place: "makkah", revelation_order: 3, verses_count: 20, name_complex: "Al-Muzzammil", name_arabic: "المزمل", name_simple: "Al-Muzzammil", translated_name: { name: "The Enshrouded One", language_name: "english" } },
  { id: 74, revelation_place: "makkah", revelation_order: 4, verses_count: 56, name_complex: "Al-Muddaththir", name_arabic: "المدثر", name_simple: "Al-Muddaththir", translated_name: { name: "The Cloaked One", language_name: "english" } },
  { id: 75, revelation_place: "makkah", revelation_order: 31, verses_count: 40, name_complex: "Al-Qiyāmah", name_arabic: "القيامة", name_simple: "Al-Qiyamah", translated_name: { name: "The Resurrection", language_name: "english" } },
  { id: 76, revelation_place: "madinah", revelation_order: 98, verses_count: 31, name_complex: "Al-'Insān", name_arabic: "الانسان", name_simple: "Al-Insan", translated_name: { name: "The Man", language_name: "english" } },
  { id: 77, revelation_place: "makkah", revelation_order: 33, verses_count: 50, name_complex: "Al-Mursalāt", name_arabic: "المرسلات", name_simple: "Al-Mursalat", translated_name: { name: "The Emissaries", language_name: "english" } },
  { id: 78, revelation_place: "makkah", revelation_order: 80, verses_count: 40, name_complex: "An-Naba'", name_arabic: "النبإ", name_simple: "An-Naba", translated_name: { name: "The Tidings", language_name: "english" } },
  { id: 79, revelation_place: "makkah", revelation_order: 81, verses_count: 46, name_complex: "An-Nāzi`āt", name_arabic: "النازعات", name_simple: "An-Nazi'at", translated_name: { name: "Those who drag forth", language_name: "english" } },
  { id: 80, revelation_place: "makkah", revelation_order: 24, verses_count: 42, name_complex: "`Abasa", name_arabic: "عبس", name_simple: "Abasa", translated_name: { name: "He Frowned", language_name: "english" } },
  { id: 81, revelation_place: "makkah", revelation_order: 7, verses_count: 29, name_complex: "At-Takwīr", name_arabic: "التكوير", name_simple: "At-Takwir", translated_name: { name: "The Overthrowing", language_name: "english" } },
  { id: 82, revelation_place: "makkah", revelation_order: 82, verses_count: 19, name_complex: "Al-'Infiţār", name_arabic: "الإنفطار", name_simple: "Al-Infitar", translated_name: { name: "The Cleaving", language_name: "english" } },
  { id: 83, revelation_place: "makkah", revelation_order: 86, verses_count: 36, name_complex: "Al-Muţaffifīn", name_arabic: "المطففين", name_simple: "Al-Mutaffifin", translated_name: { name: "The Defrauding", language_name: "english" } },
  { id: 84, revelation_place: "makkah", revelation_order: 83, verses_count: 25, name_complex: "Al-'Inshiqāq", name_arabic: "الإنشقاق", name_simple: "Al-Inshiqaq", translated_name: { name: "The Splitting Open", language_name: "english" } },
  { id: 85, revelation_place: "makkah", revelation_order: 27, verses_count: 22, name_complex: "Al-Burūj", name_arabic: "البروج", name_simple: "Al-Buruj", translated_name: { name: "The Mansions of the Stars", language_name: "english" } },
  { id: 86, revelation_place: "makkah", revelation_order: 36, verses_count: 17, name_complex: "Aţ-Ţāriq", name_arabic: "الطارق", name_simple: "At-Tariq", translated_name: { name: "The Morning Star", language_name: "english" } },
  { id: 87, revelation_place: "makkah", revelation_order: 8, verses_count: 19, name_complex: "Al-'A`lá", name_arabic: "الأعلى", name_simple: "Al-A'la", translated_name: { name: "The Most High", language_name: "english" } },
  { id: 88, revelation_place: "makkah", revelation_order: 68, verses_count: 26, name_complex: "Al-Ghāshiyah", name_arabic: "الغاشية", name_simple: "Al-Ghashiyah", translated_name: { name: "The Overwhelming", language_name: "english" } },
  { id: 89, revelation_place: "makkah", revelation_order: 10, verses_count: 30, name_complex: "Al-Fajr", name_arabic: "الفجر", name_simple: "Al-Fajr", translated_name: { name: "The Dawn", language_name: "english" } },
  { id: 90, revelation_place: "makkah", revelation_order: 35, verses_count: 20, name_complex: "Al-Balad", name_arabic: "البلد", name_simple: "Al-Balad", translated_name: { name: "The City", language_name: "english" } },
  { id: 91, revelation_place: "makkah", revelation_order: 26, verses_count: 15, name_complex: "Ash-Shams", name_arabic: "الشمس", name_simple: "Ash-Shams", translated_name: { name: "The Sun", language_name: "english" } },
  { id: 92, revelation_place: "makkah", revelation_order: 9, verses_count: 21, name_complex: "Al-Layl", name_arabic: "الليل", name_simple: "Al-Layl", translated_name: { name: "The Night", language_name: "english" } },
  { id: 93, revelation_place: "makkah", revelation_order: 11, verses_count: 11, name_complex: "Ađ-Đuĥaá", name_arabic: "الضحى", name_simple: "Ad-Duhaa", translated_name: { name: "The Morning Hours", language_name: "english" } },
  { id: 94, revelation_place: "makkah", revelation_order: 12, verses_count: 8, name_complex: "Ash-Sharĥ", name_arabic: "الشرح", name_simple: "Ash-Sharh", translated_name: { name: "The Relief", language_name: "english" } },
  { id: 95, revelation_place: "makkah", revelation_order: 28, verses_count: 8, name_complex: "At-Tīn", name_arabic: "التين", name_simple: "At-Tin", translated_name: { name: "The Fig", language_name: "english" } },
  { id: 96, revelation_place: "makkah", revelation_order: 1, verses_count: 19, name_complex: "Al-`Alaq", name_arabic: "العلق", name_simple: "Al-Alaq", translated_name: { name: "The Clot", language_name: "english" } },
  { id: 97, revelation_place: "makkah", revelation_order: 25, verses_count: 5, name_complex: "Al-Qadr", name_arabic: "القدر", name_simple: "Al-Qadr", translated_name: { name: "The Power", language_name: "english" } },
  { id: 98, revelation_place: "madinah", revelation_order: 100, verses_count: 8, name_complex: "Al-Bayyinah", name_arabic: "البينة", name_simple: "Al-Bayyinah", translated_name: { name: "The Clear Proof", language_name: "english" } },
  { id: 99, revelation_place: "madinah", revelation_order: 93, verses_count: 8, name_complex: "Az-Zalzalah", name_arabic: "الزلزلة", name_simple: "Az-Zalzalah", translated_name: { name: "The Earthquake", language_name: "english" } },
  { id: 100, revelation_place: "makkah", revelation_order: 14, verses_count: 11, name_complex: "Al-`Ādiyāt", name_arabic: "العاديات", name_simple: "Al-Adiyat", translated_name: { name: "The Coursers", language_name: "english" } },
  { id: 101, revelation_place: "makkah", revelation_order: 30, verses_count: 11, name_complex: "Al-Qāri`ah", name_arabic: "القارعة", name_simple: "Al-Qari'ah", translated_name: { name: "The Calamity", language_name: "english" } },
  { id: 102, revelation_place: "makkah", revelation_order: 16, verses_count: 8, name_complex: "At-Takāthur", name_arabic: "التكاثر", name_simple: "At-Takathur", translated_name: { name: "The Rivalry in world increase", language_name: "english" } },
  { id: 103, revelation_place: "makkah", revelation_order: 13, verses_count: 3, name_complex: "Al-`Aşr", name_arabic: "العصر", name_simple: "Al-Asr", translated_name: { name: "The Declining Day", language_name: "english" } },
  { id: 104, revelation_place: "makkah", revelation_order: 32, verses_count: 9, name_complex: "Al-Humazah", name_arabic: "الهمزة", name_simple: "Al-Humazah", translated_name: { name: "The Traducer", language_name: "english" } },
  { id: 105, revelation_place: "makkah", revelation_order: 19, verses_count: 5, name_complex: "Al-Fīl", name_arabic: "الفيل", name_simple: "Al-Fil", translated_name: { name: "The Elephant", language_name: "english" } },
  { id: 106, revelation_place: "makkah", revelation_order: 29, verses_count: 4, name_complex: "Quraysh", name_arabic: "قريش", name_simple: "Quraysh", translated_name: { name: "Quraysh", language_name: "english" } },
  { id: 107, revelation_place: "makkah", revelation_order: 17, verses_count: 7, name_complex: "Al-Mā`ūn", name_arabic: "الماعون", name_simple: "Al-Ma'un", translated_name: { name: "The Small Kindnesses", language_name: "english" } },
  { id: 108, revelation_place: "makkah", revelation_order: 15, verses_count: 3, name_complex: "Al-Kawthar", name_arabic: "الكوثر", name_simple: "Al-Kawthar", translated_name: { name: "The Abundance", language_name: "english" } },
  { id: 109, revelation_place: "makkah", revelation_order: 18, verses_count: 6, name_complex: "Al-Kāfirūn", name_arabic: "الكافرون", name_simple: "Al-Kafirun", translated_name: { name: "The Disbelievers", language_name: "english" } },
  { id: 110, revelation_place: "madinah", revelation_order: 114, verses_count: 3, name_complex: "An-Naşr", name_arabic: "النصر", name_simple: "An-Nasr", translated_name: { name: "The Divine Support", language_name: "english" } },
  { id: 111, revelation_place: "makkah", revelation_order: 6, verses_count: 5, name_complex: "Al-Masad", name_arabic: "المسد", name_simple: "Al-Masad", translated_name: { name: "The Palm Fiber", language_name: "english" } },
  { id: 112, revelation_place: "makkah", revelation_order: 22, verses_count: 4, name_complex: "Al-'Ikhlāş", name_arabic: "الإخلاص", name_simple: "Al-Ikhlas", translated_name: { name: "The Sincerity", language_name: "english" } },
  { id: 113, revelation_place: "makkah", revelation_order: 20, verses_count: 5, name_complex: "Al-Falaq", name_arabic: "الفلق", name_simple: "Al-Falaq", translated_name: { name: "The Daybreak", language_name: "english" } },
  { id: 114, revelation_place: "makkah", revelation_order: 21, verses_count: 6, name_complex: "An-Nās", name_arabic: "الناس", name_simple: "An-Nas", translated_name: { name: "Mankind", language_name: "english" } },
];

function main() {
  console.log('=== Generating Quran Data Structure ===\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 1. Save chapters metadata
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'chapters.json'),
    JSON.stringify(CHAPTERS, null, 2)
  );
  console.log(`Saved chapters.json (${CHAPTERS.length} surahs)`);

  // 2. Create placeholder verse files (empty arrays — populated by export script when online)
  const MUSHAFS = ['madani-standard', 'madani-tajweed', 'indopak'];
  for (const mushaf of MUSHAFS) {
    const mushafDir = path.join(OUTPUT_DIR, 'verses', mushaf);
    if (!fs.existsSync(mushafDir)) {
      fs.mkdirSync(mushafDir, { recursive: true });
    }
    for (const chapter of CHAPTERS) {
      const filePath = path.join(mushafDir, `${chapter.id}.json`);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({
          chapterId: chapter.id,
          mushaf,
          pagination: { current_page: 1, total_pages: 0, total_verses: 0 },
          verses: [],
          _note: 'Run `node scripts/export-quran-json.js` when online to populate verse data',
        }, null, 2));
      }
    }
    console.log(`Created verse placeholders for ${mushaf}`);
  }

  // 3. Create placeholder page files
  const pageDir = path.join(OUTPUT_DIR, 'verses-by-page', 'madani-standard');
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
  }
  for (let p = 1; p <= 604; p++) {
    const filePath = path.join(pageDir, `${p}.json`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify({
        pageNumber: p,
        mushaf: 'madani-standard',
        verses: [],
        _note: 'Run `node scripts/export-quran-json.js` when online to populate verse data',
      }, null, 2));
    }
  }
  console.log('Created 604 page placeholders');

  // 4. Create empty tajweed files
  fs.writeFileSync(path.join(OUTPUT_DIR, 'tajweed.json'), JSON.stringify({}, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'tajweed-by-page.json'), JSON.stringify({}, null, 2));
  console.log('Created tajweed placeholders');

  const totalSize = getDirSize(OUTPUT_DIR);
  console.log(`\n=== Structure Created ===`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Size: ${(totalSize / 1024).toFixed(1)} KB (placeholders only)`);
  console.log(`\nRun 'node scripts/export-quran-json.js' when online to fetch full verse data.`);
}

function getDirSize(dir) {
  let size = 0;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) size += getDirSize(fullPath);
    else size += stat.size;
  }
  return size;
}

main();
