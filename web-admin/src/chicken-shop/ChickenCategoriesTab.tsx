import React, { useState } from 'react';
import { ChickenCategory } from './types';
import { chickenShopApi } from './api';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Layers,
  ArrowUpDown,
  Search,
} from 'lucide-react';

interface ChickenCategoriesTabProps {
  categories: ChickenCategory[];
  onRefresh: () => void;
}

export const ChickenCategoriesTab: React.FC<ChickenCategoriesTabProps> = ({
  categories,
  onRefresh,
}) => {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<ChickenCategory | null>(null);
  const [name, setName] = useState<string>('');
  const [urduName, setUrduName] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setUrduName('');
    setSortOrder(String(categories.length + 1));
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: ChickenCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setUrduName(cat.urdu_name);
    setSortOrder(String(cat.sort_order || 1));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('براہ کرم کیٹیگری کا انگریزی نام درج کریں');
      return;
    }
    if (!urduName.trim()) {
      alert('براہ کرم کیٹیگری کا اردو نام درج کریں');
      return;
    }

    try {
      setSaving(true);
      if (editingCategory) {
        await chickenShopApi.updateCategory({
          ...editingCategory,
          name: name.trim(),
          urdu_name: urduName.trim(),
          default_rate_per_kg: 0,
          sort_order: Number(sortOrder) || 1,
        });
      } else {
        await chickenShopApi.createCategory({
          name: name.trim(),
          urdu_name: urduName.trim(),
          default_rate_per_kg: 0,
          sort_order: Number(sortOrder) || 1,
        });
      }
      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(`کیٹیگری محفوظ کرنے میں خرابی: ${err.message || 'Error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: ChickenCategory) => {
    const isConfirmed = window.confirm(
      `کیا آپ واقعی کیٹیگری "${cat.name} (${cat.urdu_name})" کو حذف کرنا چاہتے ہیں؟`
    );
    if (!isConfirmed) return;

    try {
      await chickenShopApi.deleteCategory(cat.id);
      onRefresh();
    } catch (err: any) {
      alert(`کیٹیگری حذف کرنے میں خرابی: ${err.message || 'Error'}`);
    }
  };

  const filteredCategories = categories.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.urdu_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
            🍗
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-urdu">
                چکن اقسام و کیٹیگریز (Chicken Categories)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                پروڈکٹ ٹائپس
              </span>
            </div>
            <p className="text-xs text-slate-500 font-urdu mt-0.5">
              چکن کٹس و اقسام (لیگز، چیسٹ، ونگز، تکہ بوٹی وغیرہ) — ریٹ اور قیمت سیل کے وقت درج کی جاتی ہے
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs font-urdu rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ نئی کیٹیگری شامل کریں</span>
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
            placeholder="کیٹیگری تلاش کریں (Search category)..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-urdu focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-urdu font-medium flex items-center gap-2">
          <span>کل کیٹیگریز: <strong className="font-mono text-slate-800">{categories.length}</strong></span>
          <span>• فعال: <strong className="font-mono text-emerald-700">{categories.filter(c => c.is_active).length}</strong></span>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {filteredCategories.map(cat => (
          <div
            key={cat.id}
            className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-amber-300 shadow-2xs hover:shadow-xs transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-mono text-[11px] font-bold flex items-center justify-center">
                  #{cat.sort_order || 1}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  فعال (Active)
                </span>
              </div>

              <h4 className="font-extrabold text-slate-900 text-base font-urdu">
                {cat.urdu_name}
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{cat.name}</p>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleOpenEdit(cat)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition"
                title="کیٹیگری ایڈٹ کریں"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(cat)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="کیٹیگری حذف کریں"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="py-16 text-center text-slate-400 text-xs font-urdu bg-white rounded-3xl border border-slate-200">
          کوئی چکن کیٹیگری موجود نہیں ہے۔ نئی کیٹیگری شامل کرنے کے لیے اوپر بٹن دبائیں۔
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                <h3 className="text-sm font-bold font-urdu">
                  {editingCategory ? 'کیٹیگری تبدیل کریں (Edit Category)' : 'نئی چکن کیٹیگری (New Chicken Category)'}
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
                  کیٹیگری کا نام (اردو) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثال: تکہ بوٹی / چکن لیگز"
                  value={urduName}
                  onChange={e => setUrduName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-urdu font-bold focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tikka Boti, Chicken Legs"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-urdu mb-1">
                  ترتیب نمبر (Sort Order)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
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
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm font-urdu disabled:opacity-50"
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
