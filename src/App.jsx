import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  Search, ShieldAlert, CheckCircle, Clock, Users, 
  FileText, Calendar, AlertCircle, Printer, Filter, ChevronRight,
  RefreshCw, Link as LinkIcon, Settings, X, BarChart2, GraduationCap
} from 'lucide-react';

// 預設示範資料 (廣福國小實務情境擴充)
const defaultCSV = `建立時間,知悉時間,發生日期,發生時間,發生地點,事件標題,主類別,次類別,涉及學生,事件原因及經過,目前處理情形,檢討及改進,Notion處理摘要,承辦人,狀態,原始訊息
,,2025年09月05日,10:10,操場,4年08班肢體衝突,校園糾紛,,林建彰、李大同,打籃球時犯規引發推擠。,,雙方帶至學務處反省並通知家長,,生教組長,已結案,
,,2025年09月12日,13:20,廁所,2年01班破壞公物,偏差行為,,王小虎,把廁所衛生紙整捲丟入馬桶。,,愛校服務並請家長賠償,,生教組長,已結案,
,,2025年10月13日,11:20,操場,5年02班學生打球碰撞紛爭,校園糾紛,,沈子傑、朱宥丞,,由導師帶至學務處，生教組介入協調，雙方道歉,,生教組長,已結案,
,,2025年10月13日,12:30,教室,3年11班言語紛爭,校園糾紛,,賴承均、林建彰、翁婕恩,,翁婕恩與其他同學至學務處請求協助，生教組介入協調，雙方道歉,,生教組長,已結案,
,,2025年10月13日,15:55,自然教室,3年15班偏差行為,偏差行為,,呂晨睿、王宸翊,自然課下課前，呂生因玩笑行為自行拉下褲子。,,生教組介入輔導,,生教組長,已結案,
,,2025年10月14日,8:25,走廊,6年04班言語紛爭,校園糾紛,,陳小明、張小華,走廊奔跑撞到引發口角。,,通知導師處理,,生教組長,已結案,
,,2025年11月20日,12:40,圖書館,5年02班館內喧嘩,偏差行為,,沈子傑、陳大文,午休時間於圖書館內追逐喧嘩，不聽志工勸阻。,,生教組約談，並暫停借書權限一週,,生教組長,已結案,
,,2025年12月05日,16:00,校門口,6年04班放學排隊推擠,校園安全,,張小華、李大同,放學路隊行進間推擠，導致李生跌倒擦傷。,,健康中心包紮，通知雙方家長,,生教組長,處理中,
,,2026年01月08日,10:15,操場,5年02班體育課器材損毀,偏差行為,,沈子傑,不當使用躲避球導致球具損壞。,,要求照價賠償，並愛校服務,,生教組長,處理中,
,,2026年02月26日,11:52,美勞教室,4年08班午餐紛爭,疑似霸凌,,黃宇樂、呂生,"大家開始攻擊黃宇樂，一直說他很髒、不衛生，還有男同學說他會把餐具弄鞋底之類的",黃宇樂想提早回教室，老師請同學攔住，後續通報處理中,,生教組長,處理中,
,,2026年03月15日,09:20,體育館,6年01班體育課衝突,校園糾紛,,陳大文、林小明,因比賽輸贏引發口角推擠,,生教組介入處理中,,生教組長,處理中,`;

// CSV 解析函數
const parseCSV = (text) => {
  const lines = [];
  let currentLine = [];
  let currentField = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"'; i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentLine.push(currentField); currentField = '';
      } else if (char === '\n' || (char === '\r' && text[i+1] === '\n')) {
        currentLine.push(currentField); lines.push(currentLine);
        currentLine = []; currentField = '';
        if (char === '\r') i++;
      } else {
        currentField += char;
      }
    }
  }
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField); lines.push(currentLine);
  }
  return lines;
};

// 儀表板配色
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
const STATUS_STYLES = {
  '已結案': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  '處理中': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  '未處理': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' }
};

export default function App() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Google Sheets 連動狀態
  const [sheetUrl, setSheetUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ type: 'success', message: '目前使用預設資料' });
  const [showSettings, setShowSettings] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // 學期過濾器狀態
  const [selectedSemester, setSelectedSemester] = useState('全部');
  const [availableSemesters, setAvailableSemesters] = useState([]);

  // 初始化載入
  useEffect(() => {
    const savedUrl = localStorage.getItem('schoolSafetySheetUrl');
    if (savedUrl) {
      setSheetUrl(savedUrl);
      fetchGoogleSheet(savedUrl);
    } else {
      loadData(defaultCSV);
    }
    
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadData = (csvText) => {
    const parsedLines = parseCSV(csvText.trim());
    if (parsedLines.length < 2) return;
    
    const headers = parsedLines[0];
    const jsonData = parsedLines.slice(1).map(line => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = line[index] ? line[index].trim() : '';
      });

      // ★ 台灣學年度演算法 (自動計算學期) ★
      if (obj['發生日期']) {
        // 【修正】支援多種日期格式：2026年02月、2026/02/15、2026-02-15 等
        const match = obj['發生日期'].match(/(\d{4})[年\-\/](\d{1,2})/);
        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]);
          let rocYear = year - 1911;
          let term = '上學期';
          
          if (month >= 8 && month <= 12) {
            term = '上學期';
          } else if (month === 1) {
            rocYear -= 1; // 1月還算上學期，歸屬前一年
            term = '上學期';
          } else {
            rocYear -= 1; // 2~7月算下學期，歸屬前一年
            term = '下學期';
          }
          obj['學年度學期'] = `${rocYear}學年度${term}`;
        } else {
          obj['學年度學期'] = '未標示';
        }
      }

      return obj;
    }).filter(item => item['發生日期']); 
    
    // 依日期排序 (近到遠)
    jsonData.sort((a, b) => {
      // 【修正】強化日期排序，不管斜線、橫線、中文字都能排
      const parseDate = (dateStr) => new Date((dateStr || '').replace(/[年月/]/g, '-').replace(/日/g, ''));
      const dateA = parseDate(a['發生日期']);
      const dateB = parseDate(b['發生日期']);
      return dateB - dateA;
    });
    
    // 提取可選的學期選單 (去重複並排序)
    const semesters = Array.from(new Set(jsonData.map(item => item['學年度學期']))).filter(s => s !== '未標示');
    semesters.sort((a, b) => b.localeCompare(a)); // 新的學期排前面
    setAvailableSemesters(semesters);
    
    // 預設選擇最新的學期 (如果有資料)
    if (semesters.length > 0 && selectedSemester === '全部') {
      setSelectedSemester(semesters[0]);
    }

    setData(jsonData);
  };

  // 抓取 Google Sheet 資料
  const fetchGoogleSheet = async (urlToFetch) => {
    const targetUrl = urlToFetch || sheetUrl;
    if (!targetUrl.trim()) return;

    setIsSyncing(true);
    setSyncStatus({ type: 'info', message: '同步中...' });

    try {
      const match = targetUrl.match(/\/d\/(.*?)(?:\/|$)/);
      let fetchUrl = targetUrl;
      
      if (match && match[1]) {
        fetchUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('無法讀取，請確認試算表已設為「知道連結的人均可查看」');
      
      const csvText = await response.text();
      
      if (csvText.trim().startsWith('<!DOCTYPE html>')) {
        throw new Error('讀取失敗：權限不足，請確認試算表共用設定');
      }

      loadData(csvText);
      setSyncStatus({ type: 'success', message: '同步成功' });
      setLastSyncTime(new Date());
      localStorage.setItem('schoolSafetySheetUrl', targetUrl);
      setShowSettings(false);
    } catch (error) {
      console.error(error);
      setSyncStatus({ type: 'error', message: error.message });
      if (data.length === 0) loadData(defaultCSV);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = () => fetchGoogleSheet(sheetUrl);
  const handlePrint = () => window.print();

  // ================= 依學期過濾資料 =================
  const filteredData = useMemo(() => {
    if (selectedSemester === '全部') return data;
    return data.filter(item => item['學年度學期'] === selectedSemester);
  }, [data, selectedSemester]);

  // ================= 數據統計計算 =================
  const stats = useMemo(() => {
    if (filteredData.length === 0) return { total: 0, closed: 0, processing: 0, students: 0 };
    
    const uniqueStudents = new Set();
    let closed = 0;
    let processing = 0;

    filteredData.forEach(item => {
      if (item['狀態'] === '已結案') closed++;
      else processing++;

      if (item['涉及學生']) {
        item['涉及學生'].split(/[、,，]/).forEach(student => {
          if (student.trim()) uniqueStudents.add(student.trim());
        });
      }
    });

    return { total: filteredData.length, closed, processing, students: uniqueStudents.size };
  }, [filteredData]);

  // 圖表資料：月份趨勢 (全自動擷取，無需手動新增月份)
  const trendData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const dateStr = item['發生日期'] || '';
      // 【修正】確保趨勢圖也能讀懂多種日期格式
      const match = dateStr.match(/(\d{4})[年\-\/](\d{1,2})/);
      if (match) {
        const month = `${match[1]}/${match[2].padStart(2, '0')}`;
        counts[month] = (counts[month] || 0) + 1;
      }
    });
    return Object.keys(counts).sort().map(key => ({ month: key, count: counts[key] }));
  }, [filteredData]);

  // 圖表資料：主類別
  const categoryData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const cat = item['主類別'] || '未分類';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).sort((a,b) => b.value - a.value);
  }, [filteredData]);

  // ★ 升級圖表：各年級事件統計 (取代無用的地點統計) ★
  const gradeData = useMemo(() => {
    // 預設1~6年級，確保圖表完整性
    const counts = { '1年級': 0, '2年級': 0, '3年級': 0, '4年級': 0, '5年級': 0, '6年級': 0 };
    const classRegex = /(\d+)年\d+班/; 
    
    filteredData.forEach(item => {
      const title = item['事件標題'] || '';
      const match = title.match(classRegex);
      if (match && match[1]) {
        const gradeKey = `${match[1]}年級`;
        if (counts[gradeKey] !== undefined) {
          counts[gradeKey] += 1;
        }
      }
    });
    
    return Object.keys(counts)
      .map(key => ({ grade: key, count: counts[key] }))
      .filter(item => item.count > 0); // 只顯示有事件的年級
  }, [filteredData]);

  // 圖表資料：前十大事件班級
  const classData = useMemo(() => {
    const counts = {};
    const classRegex = /(\d+年\d+班)/; 
    filteredData.forEach(item => {
      const title = item['事件標題'] || '';
      const match = title.match(classRegex);
      if (match) {
        const className = match[1];
        counts[className] = (counts[className] || 0) + 1;
      }
    });
    return Object.keys(counts)
      .map(key => ({ className: key, count: counts[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredData]);

  // 學生搜尋與其統計
  const { searchResults, studentSummary } = useMemo(() => {
    if (!searchTerm.trim()) return { searchResults: [], studentSummary: null };
    
    const term = searchTerm.trim();
    // 搜尋不受學期過濾器影響，能查到學生歷年所有紀錄！
    const results = data.filter(item => item['涉及學生'] && item['涉及學生'].includes(term));
    
    const cats = {};
    let activeCases = 0;
    results.forEach(item => {
      const cat = item['主類別'] || '未分類';
      cats[cat] = (cats[cat] || 0) + 1;
      if (item['狀態'] !== '已結案') activeCases++;
    });
    const mainIssue = Object.keys(cats).sort((a,b) => cats[b] - cats[a])[0] || '無';

    return { 
      searchResults: results, 
      studentSummary: { total: results.length, active: activeCases, mainIssue }
    };
  }, [data, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12 relative">
      
      {/* 設定彈出視窗 Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><LinkIcon className="w-5 h-5" /> 連結 Google 試算表</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100">
                <p className="font-bold mb-1">💡 如何取得連結？</p>
                <ol className="list-decimal ml-4 space-y-1 text-blue-700">
                  <li>打開您的 Google 校安通報試算表</li>
                  <li>點擊右上角「共用」</li>
                  <li>一般存取權改為「<strong>知道連結的人均可查看</strong>」</li>
                  <li>複製網址並貼在下方</li>
                </ol>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">試算表網址 (URL)</label>
                <input 
                  type="text" 
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowSettings(false)} className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                取消
              </button>
              <button 
                onClick={handleSaveSettings}
                disabled={isSyncing || !sheetUrl.trim()}
                className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                儲存並載入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 頂部導航列 */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-20 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-blue-500 p-2 rounded-lg shadow-inner">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide">廣福國小 <span className="text-blue-400">校安戰情室</span></h1>
              <p className="text-xs text-slate-400">生教組自動化監控與輔導儀表板</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            {/* ★ 學期過濾器 ★ */}
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
              <select 
                value={selectedSemester} 
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="bg-transparent text-sm text-white font-medium focus:outline-none pl-2 pr-1 py-1 cursor-pointer appearance-none"
              >
                <option value="全部">歷年全部資料</option>
                {availableSemesters.map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
            </div>

            <div className="text-right hidden lg:block mr-2 ml-4">
              <div className="flex items-center justify-end gap-2 text-xs">
                {syncStatus.type === 'success' ? <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> :
                 syncStatus.type === 'error' ? <span className="w-2 h-2 rounded-full bg-rose-500"></span> :
                 <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
                <span className={syncStatus.type === 'error' ? 'text-rose-400' : 'text-slate-300'}>
                  {syncStatus.message}
                </span>
              </div>
            </div>
            
            <button onClick={() => fetchGoogleSheet()} disabled={isSyncing || !sheetUrl} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors tooltip disabled:opacity-50 border border-slate-700" title="立即同步最新資料">
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'text-blue-400 animate-spin' : 'text-slate-300'}`} />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors tooltip border border-slate-700" title="設定資料來源">
              <Settings className="w-5 h-5 text-slate-300" />
            </button>
            <div className="w-px h-8 bg-slate-700 mx-1"></div>
            <button onClick={handlePrint} className="p-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors tooltip shadow-sm text-white flex items-center gap-2 text-sm font-bold" title="列印報表">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">列印</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        
        {/* KPI 數據卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-blue-100 text-sm font-medium mb-1">
                {selectedSemester === '全部' ? '歷年累計通報件數' : `${selectedSemester} 通報件數`}
              </p>
              <h3 className="text-4xl font-extrabold">{stats.total} <span className="text-lg font-normal opacity-80">件</span></h3>
            </div>
            <FileText className="absolute right-4 bottom-4 w-16 h-16 text-white opacity-20 transform rotate-12" />
          </div>
          
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-amber-100 text-sm font-medium mb-1">處理中 / 需追蹤</p>
              <h3 className="text-4xl font-extrabold">{stats.processing} <span className="text-lg font-normal opacity-80">件</span></h3>
            </div>
            <Clock className="absolute right-4 bottom-4 w-16 h-16 text-white opacity-20 transform -rotate-12" />
          </div>

          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-emerald-100 text-sm font-medium mb-1">已結案完成</p>
              <h3 className="text-4xl font-extrabold">{stats.closed} <span className="text-lg font-normal opacity-80">件</span></h3>
            </div>
            <CheckCircle className="absolute right-4 bottom-4 w-16 h-16 text-white opacity-20" />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-slate-500 text-sm font-medium mb-1">本期涉及學生總數</p>
              <h3 className="text-4xl font-extrabold text-slate-800">{stats.students} <span className="text-lg font-normal text-slate-400">人</span></h3>
            </div>
            <Users className="absolute right-4 bottom-4 w-16 h-16 text-slate-100" />
          </div>
        </div>

        {/* 視覺化圖表區 - 戰情儀表板 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 左圖：月份趨勢 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-500" /> 
              {selectedSemester === '全部' ? '歷年月度通報趨勢' : `${selectedSemester} 月度通報趨勢`}
            </h3>
            {trendData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                    <RechartsTooltip 
                      cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '5 5' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="count" name="通報件數" stroke="#3B82F6" strokeWidth={4} dot={{ r: 6, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">本期尚無資料</div>
            )}
          </div>

          {/* 右圖：事件類別 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-purple-500" /> 
              事件主類別分佈
            </h3>
            {categoryData.length > 0 ? (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                        paddingAngle={5} dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {categoryData.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      <span className="text-slate-600 truncate">{item.name} ({item.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">本期尚無資料</div>
            )}
          </div>
          
          {/* 前十大事件班級 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-500" /> 
                通報熱區：前十大事件班級
              </h3>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-md">由事件標題自動擷取</span>
            </div>
            
            {classData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="className" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#334155', fontSize: 13, fontWeight: 500 }} 
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} allowDecimals={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    <Bar dataKey="count" name="通報件數" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={32}>
                      {classData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index < 3 ? '#4F46E5' : '#818CF8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                無法從目前的「事件標題」中辨識出班級資訊
              </div>
            )}
          </div>

          {/* ★ 新圖表：各年級事件統計 (取代舊的地點分析) ★ */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-500" /> 
                各年級事件統計
              </h3>
            </div>
            
            {gradeData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="grade" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontWeight: 600 }} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" name="通報件數" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20}>
                      {gradeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.count >= Math.max(...gradeData.map(d=>d.count)) ? '#059669' : '#34D399'} /> 
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
               <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">本期尚無資料</div>
            )}
          </div>

        </div>

        {/* 學生校安紀錄 - 專案調查區 (輔導脈絡) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden mt-8 print:hidden">
          <div className="bg-slate-800 px-6 py-5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 text-white">
              <Search className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="text-xl font-bold">特定學生 / 關鍵字紀錄查詢</h3>
                <p className="text-xs text-slate-400">不受學期過濾影響，直接檢視歷年通報與輔導脈絡</p>
              </div>
            </div>
            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder="請輸入學生姓名 (例如：沈子傑)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-700/50 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-700 transition-all shadow-inner"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <div className="p-6 md:p-8 bg-slate-50">
            {!searchTerm ? (
              <div className="text-center py-16 text-slate-400 flex flex-col items-center bg-white rounded-xl border border-dashed border-slate-300">
                <Users className="w-16 h-16 mb-4 text-slate-200" />
                <h4 className="text-lg font-medium text-slate-500 mb-1">等待查詢中</h4>
                <p className="text-sm">請於上方輸入學生姓名，系統將自動調閱該生所有校安紀錄與處理進度。</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-16 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                <CheckCircle className="w-16 h-16 mb-4 text-emerald-200 mx-auto" />
                <h4 className="text-lg font-medium text-slate-700 mb-1">查無紀錄</h4>
                <p className="text-sm">資料庫中沒有與「<span className="font-bold text-blue-600">{searchTerm}</span>」相關的校安通報紀錄。</p>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-8">
                
                {/* 左側：學生摘要面板 */}
                <div className="w-full lg:w-1/3 space-y-4">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                      {searchTerm.charAt(0)}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">{searchTerm}</h2>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">累計涉事通報</span>
                        <span className="font-bold text-lg text-slate-800">{studentSummary.total} 件</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">需追蹤/處理中</span>
                        <span className={`font-bold text-lg ${studentSummary.active > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {studentSummary.active} 件
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">最常發生類型</span>
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded text-sm">
                          {studentSummary.mainIssue}
                        </span>
                      </div>
                    </div>
                    
                    {studentSummary.active > 0 && (
                      <div className="mt-6 bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-lg text-sm flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>該生目前有 <b>{studentSummary.active}</b> 件尚未結案的事件，請生教組持續關注輔導進度。</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 右側：時間軸列表 */}
                <div className="w-full lg:w-2/3">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    事件輔導時間軸
                  </h3>
                  
                  <div className="relative border-l-2 border-blue-200 ml-3 pl-6 space-y-8">
                    {searchResults.map((record, idx) => {
                      const statusStyle = STATUS_STYLES[record['狀態']] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
                      
                      return (
                        <div key={idx} className="relative">
                          {/* 時間軸節點 */}
                          <div className={`absolute w-4 h-4 rounded-full border-4 border-white shadow-sm -left-[33px] top-1 ${record['狀態'] === '處理中' ? 'bg-amber-400 animate-pulse' : 'bg-blue-400'}`}></div>
                          
                          <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                            {/* 卡片標題區 */}
                            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">
                                  {record['發生日期']}
                                </span>
                                <h4 className="font-bold text-slate-800 text-lg">{record['事件標題']}</h4>
                              </div>
                              <span className={`px-3 py-1 text-xs font-bold rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                                {record['狀態']}
                              </span>
                            </div>
                            
                            {/* 卡片內容區 */}
                            <div className="p-5 space-y-4">
                              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                                <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-emerald-500" /> {record['學年度學期']}</span>
                                <span className="flex items-center gap-1.5"><ChevronRight className="w-4 h-4 text-blue-400" /> {record['主類別']}</span>
                                <span className="flex items-center gap-1.5">
                                  <Users className="w-4 h-4 text-indigo-400" /> 
                                  {record['涉及學生'] && record['涉及學生'].split(/[、,，]/).map((name, i, arr) => (
                                    <React.Fragment key={i}>
                                      <span className={name.trim() === searchTerm ? "font-bold text-blue-600 bg-blue-50 px-1 rounded" : ""}>
                                        {name.trim()}
                                      </span>
                                      {i < arr.length - 1 && '、'}
                                    </React.Fragment>
                                  ))}
                                </span>
                              </div>
                              
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                                <p className="text-slate-700 leading-relaxed"><span className="font-semibold text-slate-900 mr-2">事件經過:</span> {record['事件原因及經過']}</p>
                              </div>
                              
                              {(record['目前處理情形'] || record['Notion處理摘要']) && (
                                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-sm">
                                  <p className="text-slate-700 leading-relaxed"><span className="font-semibold text-blue-900 mr-2">處置與輔導:</span> {record['目前處理情形']} {record['Notion處理摘要']}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
      </main>
    </div>
  );
}
