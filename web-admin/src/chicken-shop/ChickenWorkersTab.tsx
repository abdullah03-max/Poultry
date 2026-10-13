import React, { useState } from 'react';
import { ChickenShopWorker } from './types';
import { chickenShopApi } from './api';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Phone,
  Key,
  Lock,
  ShieldCheck,
  Search,
  ShoppingCart,
  BookOpen,
  Banknote,
} from 'lucide-react';

interface ChickenWorkersTabProps {
  workers: ChickenShopWorker[];
  onRefresh: () => void;
}

export const ChickenWorkersTab: React.FC<ChickenWorkersTabProps> = ({
  workers,
  onRefresh,
}) => {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingWorker, setEditingWorker] = useState<ChickenShopWorker | null>(null);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [role, setRole] = useState<'worker' | 'manager'>('worker');
  const [canDailySales, setCanDailySales] = useState<boolean>(true);
  const [canKhata, setCanKhata] = useState<boolean>(true);
  const [canWasooli, setCanWasooli] = useState<boolean>(true);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const handleOpenAdd = () => {
    setEditingWorker(null);
    setName('');
    setPhone('');
    setPassword('');
    setPin('');
    setRole('worker');
    setCanDailySales(true);
    setCanKhata(true);
    setCanWasooli(true);
    setIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (w: ChickenShopWorker) => {
    setEditingWorker(w);
    setName(w.name);
    setPhone(w.phone);
    setPassword(w.password || '');
    setPin(w.pin || '');
    setRole(w.role || 'worker');
    setCanDailySales(w.can_daily_sales !== false);
    setCanKhata(w.can_khata !== false);
    setCanWasooli(w.can_wasooli !== false);
    setIsActive(w.is_active !== false);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('براہ کرم ورکر کا نام درج کریں');
      return;
    }
    if (!phone.trim()) {
      alert('براہ کرم فون نمبر / لاگ ان یوزرنیم درج کریں');
      return;
    }
    if (!password.trim()) {
      alert('براہ کرم لاگ ان پاس ورڈ درج کریں');
      return;
    }

    try {
      setSaving(true);
      if (editingWorker) {
        await chickenShopApi.updateWorker({
          ...editingWorker,
          name: name.trim(),
          phone: phone.trim(),
          password: password.trim(),
          pin: pin.trim() || undefined,
          role,
          can_daily_sales: canDailySales,
          can_khata: canKhata,
          can_wasooli: canWasooli,
          is_active: isActive,
        });
      } else {
        await chickenShopApi.createWorker({
          name: name.trim(),
          phone: phone.trim(),
          password: password.trim(),
          pin: pin.trim() || undefined,
          role,
          can_daily_sales: canDailySales,
          can_khata: canKhata,
          can_wasooli: canWasooli,
          is_active: isActive,
        });
      }
      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(`ورکر اکاؤنٹ محفوظ کرنے میں خرابی: ${err.message || 'Error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (w: ChickenShopWorker) => {
    const isConfirmed = window.confirm(
      `کیا آپ واقعی ورکر "${w.name} (${w.phone})" کا لاگ ان اکاؤنٹ مستقل طور پر حذف کرنا چاہتے ہیں؟`
    );
    if (!isConfirmed) return;

    try {
      await chickenShopApi.deleteWorker(w.id);
      onRefresh();
    } catch (err: any) {
      alert(`ورکر اکاؤنٹ حذف کرنے میں خرابی: ${err.message || 'Error'}`);
    }
  };

  const filteredWorkers = workers.filter(w => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      w.name.toLowerCase().includes(q) ||
      w.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
            👥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-urdu">
                چکن شاپ ورکرز و اکاؤنٹس (Chicken Shop Workers)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                مستقل لاگ ان سسٹم
              </span>
            </div>
            <p className="text-xs text-slate-500 font-urdu mt-0.5">
              چکن شاپ ورکرز کے لاگ ان یوزرنیم اور پاس ورڈز — یہ اکاؤنٹس ویسٹ مینجمنٹ سسٹم سے 100% الگ ہیں
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs font-urdu rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ نیا چکن شاپ ورکر شامل کریں</span>
          </button>
        </div>
      </div>

      {/* Search and Count Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ورکر تلاش کریں (Search worker)..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-urdu focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-urdu font-medium flex items-center gap-2">
          <span>کل ورکرز: <strong className="font-mono text-slate-800">{workers.length}</strong></span>
          <span>• فعال: <strong className="font-mono text-emerald-700">{workers.filter(w => w.is_active).length}</strong></span>
        </div>
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWorkers.map(w => (
          <div
            key={w.id}
            className="bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-blue-300 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                  w.is_active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {w.is_active ? 'فعال (Active)' : 'غیر فعال (Inactive)'}
                </span>

                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  {w.role}
                </span>
              </div>

              <h4 className="font-extrabold text-slate-900 text-base font-urdu">
                {w.name}
              </h4>
              <p className="text-xs text-slate-600 font-mono flex items-center gap-1.5 mt-1">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>{w.phone}</span>
              </p>

              <div className="mt-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px] flex items-center justify-between">
                <span className="text-slate-500 font-urdu">پاس ورڈ (Password):</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {w.password ? '••••••' : 'کوئی پاس ورڈ نہیں'}
                </span>
              </div>

              {/* Allowed Responsibilities */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-urdu block">
                  اجازتیں و اختیارات:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {w.can_daily_sales && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-lg text-[10px] font-bold font-urdu flex items-center gap-1 border border-amber-200">
                      <ShoppingCart className="w-3 h-3" /> روزانہ سیلز
                    </span>
                  )}
                  {w.can_khata && (
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded-lg text-[10px] font-bold font-urdu flex items-center gap-1 border border-purple-200">
                      <BookOpen className="w-3 h-3" /> گاہک کھاتہ
                    </span>
                  )}
                  {w.can_wasooli && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-lg text-[10px] font-bold font-urdu flex items-center gap-1 border border-emerald-200">
                      <Banknote className="w-3 h-3" /> رقم وصولی
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleOpenEdit(w)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition"
                title="ورکر ایڈٹ کریں"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(w)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="ورکر حذف کریں"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredWorkers.length === 0 && (
        <div className="py-16 text-center text-slate-400 text-xs font-urdu bg-white rounded-3xl border border-slate-200">
          کوئی چکن شاپ ورکر رجسٹرڈ نہیں ہے۔ نیا ورکر شامل کرنے کے لیے اوپر دیا گیا بٹن دبائیں۔
        </div>
      )}

      {/* Add / Edit Worker Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <h3 className="text-sm font-bold font-urdu">
                  {editingWorker ? 'ورکر اکاؤنٹ تبدیل کریں (Edit Worker)' : 'نیا چکن شاپ ورکر (New Worker Account)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 font-urdu mb-1">
                  ورکر کا نام (Worker Name) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثال: محمد احمد / کاشف علی"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-urdu font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-urdu mb-1">
                  موبائل نمبر / یوزرنیم (Phone / Login ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="03001234567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-urdu mb-1">
                    لاگ ان پاس ورڈ (Password) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="پاس ورڈ درج کریں"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 font-urdu mb-1">
                    4 ہندسوں کا پن (Optional PIN)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="1234"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Permissions checkboxes */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 font-urdu block">
                  ورکر کے اختیارات و اجازتیں (Worker Permissions):
                </span>
                <label className="flex items-center gap-2 text-xs font-urdu cursor-pointer text-slate-800">
                  <input
                    type="checkbox"
                    checked={canDailySales}
                    onChange={e => setCanDailySales(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>1. روزانہ سیلز درج کرنے کی اجازت (Daily Sales)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-urdu cursor-pointer text-slate-800">
                  <input
                    type="checkbox"
                    checked={canKhata}
                    onChange={e => setCanKhata(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>2. گاہک کھاتہ و نیا ادھار بل درج کرنے کی اجازت (Customer Khata)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-urdu cursor-pointer text-slate-800">
                  <input
                    type="checkbox"
                    checked={canWasooli}
                    onChange={e => setCanWasooli(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>3. رقم وصولی درج کرنے کی اجازت (Wasooli / Payments)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition font-urdu"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm font-urdu disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'محفوظ ہو رہا ہے...' : 'محفوظ کریں (Save)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
