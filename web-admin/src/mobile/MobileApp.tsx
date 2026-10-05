// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Worker Application
// Daylight Clean B2B Corporate Edition
// Built for fast field collection, touch signature, camera & offline sync
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Customer, WeightCategory } from '../types/database';
import { mobileStorage, OfflineCollectionItem } from './mobileStorage';
import appIcon from '../assets/app_icon.png';
import {
  Home,
  PlusCircle,
  FileText,
  Users,
  User,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  Search,
  Phone,
  Camera,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  LogOut,
  RefreshCw,
  X,
  ChevronRight,
  TrendingUp,
  MapPin,
  Calendar,
  AlertTriangle,
  Edit2,
  Share2,
  MessageSquare,
  Download,
  Navigation
} from 'lucide-react';
import {
  generateReceiptImageBlob,
  shareReceiptImage,
  downloadReceiptImage
} from '../utils/receiptImageGenerator';

type Tab = 'home' | 'new_collection' | 'collections' | 'customers' | 'profile';

const defaultCategories: WeightCategory[] = [
  { id: 'charbi', code: 'charbi', name: 'Charbi Weight', urdu_name: 'چربی وزن', unit: 'KG', default_rate: 55, is_active: true, display_order: 1, created_at: '', updated_at: '' },
  { id: 'kachara', code: 'kachara', name: 'Kachara Weight', urdu_name: 'کچرا وزن', unit: 'KG', default_rate: 45, is_active: true, display_order: 2, created_at: '', updated_at: '' },
];


// Lightweight client-side image compression to prevent localStorage QuotaExceededError
const compressImage = (file: File, maxDimension = 900, quality = 0.65): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const generateWhatsAppReceiptText = (slip: OfflineCollectionItem): string => {
  const charbiGross = slip.charbi_gross ?? 0;
  const charbiTare = slip.charbi_tare ?? 0;
  const charbiNet = slip.charbi_net ?? 0;
  const charbiRate = slip.charbi_rate ?? 55;
  const charbiTotal = slip.charbi_total ?? Math.round(charbiNet * charbiRate);

  const kacharaGross = slip.kachara_gross ?? 0;
  const kacharaTare = slip.kachara_tare ?? 0;
  const kacharaNet = slip.kachara_net ?? 0;
  const kacharaRate = slip.kachara_rate ?? (slip.rate_per_kg || 45);
  const kacharaTotal = slip.kachara_total ?? Math.round(kacharaNet * kacharaRate);

  let text = `*🐔 SHAN POULTRY PROTEIN 🐔*\n`;
  text += `*شان پولٹری پروٹین - وصولی رسید*\n`;
  text += `────────────────────\n`;
  text += `*رسید نمبر (Slip #):* ${slip.receipt_no}\n`;
  text += `*دکان / گاہک (Shop):* ${slip.customer_name}\n`;
  if (slip.customer_area) text += `*علاقہ (Area):* ${slip.customer_area}\n`;
  text += `*تاریخ اور وقت:* ${slip.collection_date} ${slip.collection_time?.substring(0, 5) || ''}\n`;
  text += `*کلیکٹر (Collector):* ${slip.worker_name}\n`;
  text += `────────────────────\n`;

  if (charbiGross > 0 || charbiNet > 0) {
    text += `*🟢 چربی وزن (Charbi Weight):*\n`;
    text += `• کل وزن (Gross): ${charbiGross} KG\n`;
    text += `• تار / برتن (Tare): ${charbiTare} KG\n`;
    text += `• خالص وزن (Net): ${charbiNet} KG\n`;
    text += `• ریٹ (Rate): Rs. ${charbiRate}/KG\n`;
    text += `• چربی بل: Rs. ${charbiTotal.toLocaleString()}\n`;
    text += `────────────────────\n`;
  }

  if (kacharaGross > 0 || kacharaNet > 0) {
    text += `*🟠 کچرا وزن (Kachara Weight):*\n`;
    text += `• کل وزن (Gross): ${kacharaGross} KG\n`;
    text += `• تار / برتن (Tare): ${kacharaTare} KG\n`;
    text += `• خالص وزن (Net): ${kacharaNet} KG\n`;
    text += `• ریٹ (Rate): Rs. ${kacharaRate}/KG\n`;
    text += `• کچرا بل: Rs. ${kacharaTotal.toLocaleString()}\n`;
    text += `────────────────────\n`;
  }

  if (charbiNet === 0 && kacharaNet === 0 && slip.total_net_weight > 0) {
    text += `*کل وزن (Gross):* ${slip.gross_weight} KG\n`;
    text += `*تار / برتن (Tare):* ${slip.tare_weight} KG\n`;
    text += `*خالص وزن (Net):* ${slip.total_net_weight} KG\n`;
    text += `*ریٹ (Rate):* Rs. ${slip.rate_per_kg}/KG\n`;
    text += `────────────────────\n`;
  }

  text += `*⚖️ کل خالص وزن (TOTAL NET):* ${slip.total_net_weight} KG\n`;
  text += `*💰 کل بل (TOTAL BILL): Rs. ${slip.total_amount.toLocaleString()}*\n`;
  text += `────────────────────\n`;
  if (slip.notes) text += `*نوٹ (Note):* ${slip.notes}\n`;
  text += `_شکریہ! شان پولٹری پروٹین_\n`;

  return text;
};

const openWhatsAppReceipt = (slip: OfflineCollectionItem): void => {
  const text = generateWhatsAppReceiptText(slip);
  let phone = (slip.customer_phone || '').replace(/[^0-9]/g, '');
  if (phone.startsWith('03')) {
    phone = '92' + phone.substring(1);
  } else if (phone.startsWith('3') && phone.length === 10) {
    phone = '92' + phone;
  }

  const encoded = encodeURIComponent(text);
  const url = phone.length >= 10
    ? `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;

  window.open(url, '_blank');
};

export const MobileApp: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<Tab>('home');

  // Network State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Authentication State
  const [worker, setWorker] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Data Lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [offlineSlips, setOfflineSlips] = useState<OfflineCollectionItem[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Refresh State
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [todayScope, setTodayScope] = useState<'all' | 'mine'>('all');

  // Edit Slip Modal State
  const [editingSlip, setEditingSlip] = useState<OfflineCollectionItem | null>(null);
  const [editCustomerId, setEditCustomerId] = useState<string>('');
  const [editCharbiGross, setEditCharbiGross] = useState<string>('');
  const [editCharbiTare, setEditCharbiTare] = useState<string>('0');
  const [editCharbiRate, setEditCharbiRate] = useState<string>('55');
  const [editKacharaGross, setEditKacharaGross] = useState<string>('');
  const [editKacharaTare, setEditKacharaTare] = useState<string>('0');
  const [editKacharaRate, setEditKacharaRate] = useState<string>('45');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Modals
  const [customerModalOpen, setCustomerModalOpen] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState<boolean>(false);
  const [receiptModalSlip, setReceiptModalSlip] = useState<OfflineCollectionItem | null>(null);

  // New Collection Form State (Charbi & Kachara)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [charbiGross, setCharbiGross] = useState<string>('');
  const [charbiTare, setCharbiTare] = useState<string>('0');
  const [charbiRate, setCharbiRate] = useState<string>('55');

  const [kacharaGross, setKacharaGross] = useState<string>('');
  const [kacharaTare, setKacharaTare] = useState<string>('0');
  const [kacharaRate, setKacharaRate] = useState<string>('45');

  const [notes, setNotes] = useState<string>('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [isSavingCollection, setIsSavingCollection] = useState<boolean>(false);

  // Add Customer Form State
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustContact, setNewCustContact] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustArea, setNewCustArea] = useState<string>('Gaggoo Mandi');
  const [newCustCharbiRate, setNewCustCharbiRate] = useState<string>('55');
  const [newCustKacharaRate, setNewCustKacharaRate] = useState<string>('45');


  // Sync Progress State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Signature Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // GPS Tracking State
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const lastGpsUpdateRef = useRef<number>(0);

  // Sharing image state
  const [isSharingImage, setIsSharingImage] = useState<boolean>(false);

  // Live Worker GPS Tracking Watcher
  useEffect(() => {
    if (!worker?.id || !navigator.geolocation) {
      setGpsActive(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        setGpsCoords({ lat, lng, accuracy });
        setGpsActive(true);
        setGpsError(null);

        const now = Date.now();
        // Update Supabase if at least 15 seconds passed
        if (now - lastGpsUpdateRef.current > 15000) {
          lastGpsUpdateRef.current = now;
          try {
            await supabase
              .from('profiles')
              .update({
                current_latitude: lat,
                current_longitude: lng,
                location_accuracy: accuracy,
                last_location_updated_at: new Date().toISOString(),
                is_online: true,
              })
              .eq('id', worker.id);

            await supabase
              .from('worker_locations')
              .insert({
                worker_id: worker.id,
                latitude: lat,
                longitude: lng,
                accuracy: accuracy,
                recorded_at: new Date().toISOString(),
              });
          } catch (e) {
            console.warn('GPS location sync warning:', e);
          }
        }
      },
      (err) => {
        console.warn('Geolocation watch error:', err.message);
        setGpsActive(false);
        setGpsError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [worker?.id]);

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load persisted worker session
    const savedWorker = mobileStorage.getLoggedWorker();
    if (savedWorker) {
      setWorker(savedWorker);
      loadData(savedWorker);
    } else {
      setWorker(null);
      setOfflineSlips([]);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Realtime subscription & auto-sync across workers
  useEffect(() => {
    if (!worker) return;

    // Supabase Realtime Channel: Listen to all events on collections
    const channel = supabase
      .channel('public:mobile_worker_collections_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collections',
        },
        () => {
          // Immediately reload data when ANY worker inserts, updates, or deletes
          loadData();
        }
      )
      .subscribe();

    // 10-second polling fallback to guarantee fresh updates
    const pollInterval = setInterval(() => {
      if (navigator.onLine) {
        loadData();
      }
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [worker?.id]);

  const loadData = async (activeWorkerParam?: any) => {
    const activeWorker = activeWorkerParam !== undefined ? activeWorkerParam : (worker || mobileStorage.getLoggedWorker());
    const workerId = activeWorker?.id;

    // 1. Initial Local Slips
    const allLocalSlips = mobileStorage.getOfflineSlips();
    setOfflineSlips(allLocalSlips);
    const pendingSlips = allLocalSlips.filter(s => s.status === 'pending_sync');
    setPendingCount(pendingSlips.length);

    // 2. Customers
    const cached = mobileStorage.getCachedCustomers();
    if (cached.length > 0) {
      setCustomers(cached);
    }

    // Try fetching live customers & live collections across ALL workers if online
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('status', 'active')
          .order('name');
        if (!error && data && data.length > 0) {
          setCustomers(data);
          mobileStorage.setCachedCustomers(data);
        }
      } catch (err) {
        console.warn('Could not fetch live customers, using cache:', err);
      }

      // Fetch collections across ALL workers so Worker B sees Worker A's collections immediately
      try {
        const { data: remoteData, error: colError } = await supabase
          .from('collections')
          .select(`
            *,
            customer:customers(*),
            worker:profiles(id, full_name, phone)
          `)
          .order('collection_timestamp', { ascending: false })
          .limit(150);

        if (!colError && remoteData) {
          const mappedRemote: OfflineCollectionItem[] = remoteData.map((r: any) => ({
            client_uuid: r.client_uuid || r.id,
            receipt_no: r.receipt_no,
            customer_id: r.customer_id,
            customer_name: r.customer?.name || 'Customer',
            customer_area: r.customer?.area || '',
            customer_phone: r.customer?.phone || '',
            worker_id: r.worker_id,
            worker_name: r.worker?.full_name || (r.worker_id === workerId ? (activeWorker?.full_name || 'Field Collector') : 'Field Collector'),
            collection_date: r.collection_date,
            collection_time: r.collection_time || '00:00',
            gross_weight: r.gross_weight,
            tare_weight: r.tare_weight,
            total_net_weight: r.total_net_weight,
            rate_per_kg: r.rate_per_kg,
            total_amount: r.total_amount,
            notes: r.notes,
            signature_base64: r.signature_url || null,
            photo_base64: null,
            items: [],
            charbi_gross: r.charbi_gross ?? 0,
            charbi_tare: r.charbi_tare ?? 0,
            charbi_net: r.charbi_net ?? 0,
            charbi_rate: r.charbi_rate ?? 55,
            charbi_total: r.charbi_total ?? 0,
            kachara_gross: r.kachara_gross ?? 0,
            kachara_tare: r.kachara_tare ?? 0,
            kachara_net: r.kachara_net ?? 0,
            kachara_rate: r.kachara_rate ?? (r.rate_per_kg || 45),
            kachara_total: r.kachara_total ?? 0,
            status: 'synced',
            created_at: r.created_at || r.collection_timestamp,
          }));

          // Merge pending slips from local storage (pending take precedence if un-synced)
          const seenReceipts = new Set(pendingSlips.map(s => s.receipt_no));
          const merged = [...pendingSlips];
          for (const rem of mappedRemote) {
            if (!seenReceipts.has(rem.receipt_no)) {
              merged.push(rem);
              seenReceipts.add(rem.receipt_no);
            }
          }

          setOfflineSlips(merged);
          mobileStorage.setAllOfflineSlips(merged);
          setPendingCount(pendingSlips.length);
        }
      } catch (colErr) {
        console.warn('Could not fetch collections from Supabase:', colErr);
      }
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (navigator.onLine) {
        await mobileStorage.syncAllPending();
      }
      await loadData();
    } catch (e) {
      console.warn('Manual refresh failed:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const startEditingSlip = (slip: OfflineCollectionItem) => {
    setEditingSlip(slip);
    setEditCustomerId(slip.customer_id);
    setEditCharbiGross(slip.charbi_gross !== undefined && slip.charbi_gross > 0 ? slip.charbi_gross.toString() : '');
    setEditCharbiTare(slip.charbi_tare !== undefined ? slip.charbi_tare.toString() : '0');
    setEditCharbiRate(slip.charbi_rate ? slip.charbi_rate.toString() : '55');

    setEditKacharaGross(slip.kachara_gross !== undefined && slip.kachara_gross > 0 ? slip.kachara_gross.toString() : (slip.charbi_gross ? '' : slip.gross_weight.toString()));
    setEditKacharaTare(slip.kachara_tare !== undefined ? slip.kachara_tare.toString() : (slip.charbi_gross ? '0' : slip.tare_weight.toString()));
    setEditKacharaRate(slip.kachara_rate ? slip.kachara_rate.toString() : (slip.rate_per_kg ? slip.rate_per_kg.toString() : '45'));

    setEditNotes(slip.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingSlip) return;

    const cGross = parseFloat(editCharbiGross) || 0;
    const cTare = parseFloat(editCharbiTare) || 0;
    const cRate = parseFloat(editCharbiRate) || 0;
    const cNet = Math.max(0, cGross - cTare);
    const cTotal = Math.round(cNet * cRate);

    const kGross = parseFloat(editKacharaGross) || 0;
    const kTare = parseFloat(editKacharaTare) || 0;
    const kRate = parseFloat(editKacharaRate) || 0;
    const kNet = Math.max(0, kGross - kTare);
    const kTotal = Math.round(kNet * kRate);

    const totalNet = cNet + kNet;
    const totalAmount = cTotal + kTotal;
    const totalGross = cGross + kGross;
    const totalTare = cTare + kTare;

    if (totalNet <= 0 && totalGross <= 0) {
      alert('Please enter at least Charbi or Kachara weight.');
      return;
    }

    const selectedCust = customers.find(c => c.id === editCustomerId);

    setIsSavingEdit(true);

    const updatedSlip: OfflineCollectionItem = {
      ...editingSlip,
      customer_id: editCustomerId,
      customer_name: selectedCust?.name || editingSlip.customer_name,
      customer_area: selectedCust?.area || editingSlip.customer_area,
      customer_phone: selectedCust?.phone || editingSlip.customer_phone,
      gross_weight: totalGross > 0 ? totalGross : totalNet,
      tare_weight: totalTare,
      total_net_weight: totalNet,
      rate_per_kg: kRate || cRate || editingSlip.rate_per_kg,
      total_amount: totalAmount,
      notes: editNotes.trim() || null,
      charbi_gross: cGross,
      charbi_tare: cTare,
      charbi_net: cNet,
      charbi_rate: cRate,
      charbi_total: cTotal,
      kachara_gross: kGross,
      kachara_tare: kTare,
      kachara_net: kNet,
      kachara_rate: kRate,
      kachara_total: kTotal,
    };

    try {
      // 1. Update in Supabase if online
      if (navigator.onLine) {
        try {
          await supabase
            .from('collections')
            .update({
              customer_id: editCustomerId,
              gross_weight: updatedSlip.gross_weight,
              tare_weight: updatedSlip.tare_weight,
              total_net_weight: updatedSlip.total_net_weight,
              rate_per_kg: updatedSlip.rate_per_kg,
              total_amount: updatedSlip.total_amount,
              notes: editNotes.trim() || null,
              charbi_gross: cGross,
              charbi_tare: cTare,
              charbi_net: cNet,
              charbi_rate: cRate,
              charbi_total: cTotal,
              kachara_gross: kGross,
              kachara_tare: kTare,
              kachara_net: kNet,
              kachara_rate: kRate,
              kachara_total: kTotal,
            })
            .or(`client_uuid.eq.${editingSlip.client_uuid},receipt_no.eq.${editingSlip.receipt_no}`);
        } catch (supErr) {
          console.warn('Could not update online collection, updated locally:', supErr);
        }
      }

      // 2. Update locally
      mobileStorage.updateOfflineSlip(updatedSlip);

      // 3. Update state
      setOfflineSlips(prev =>
        prev.map(s => (s.client_uuid === updatedSlip.client_uuid || s.receipt_no === updatedSlip.receipt_no ? updatedSlip : s))
      );

      // If currently open in receipt modal, update it too
      if (receiptModalSlip && (receiptModalSlip.client_uuid === updatedSlip.client_uuid || receiptModalSlip.receipt_no === updatedSlip.receipt_no)) {
        setReceiptModalSlip(updatedSlip);
      }

      setEditingSlip(null);
      alert('Collection slip updated successfully! / رسید کامیابی سے تبدیل ہو گئی!');
    } catch (e: any) {
      alert(`Error updating slip: ${e.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleWorkerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const emailTrim = loginEmail.trim();
    if (!emailTrim) {
      setAuthError('Please enter your assigned email or phone number. / ای میل یا فون نمبر درج کریں');
      return;
    }
    if (!loginPassword) {
      setAuthError('Please enter your password. / پاس ورڈ درج کریں');
      return;
    }

    setAuthLoading(true);

    try {
      // 1. Direct Supabase profiles query (live database check)
      if (navigator.onLine) {
        try {
          const cleanPhone = emailTrim.replace(/\D/g, '');
          let query = supabase
            .from('profiles')
            .select('*')
            .eq('role', 'worker');

          if (cleanPhone.length >= 7) {
            query = query.or(`email.ilike.${emailTrim},phone.ilike.%${cleanPhone}%,full_name.ilike.${emailTrim}`);
          } else {
            query = query.or(`email.ilike.${emailTrim},full_name.ilike.${emailTrim}`);
          }

          const { data: profs, error: profErr } = await query;

          if (!profErr && profs && profs.length > 0) {
            const matched = profs.find(p => p.password === loginPassword);
            if (!matched) {
              setAuthError('پاس ورڈ درست نہیں۔ ایڈمن حاجی شان کا دیا گیا پاس ورڈ درج کریں۔ / Incorrect password.');
              setAuthLoading(false);
              return;
            }

            if (matched.is_active === false) {
              setAuthError('آپ کا اکاؤنٹ ایڈمن نے غیر فعال کر دیا ہے۔ / Worker account deactivated by Admin.');
              setAuthLoading(false);
              return;
            }

            const loggedWorker = {
              id: matched.id,
              full_name: matched.full_name || 'Field Worker',
              phone: matched.phone || '',
              email: matched.email || emailTrim,
              role: 'worker',
            };

            mobileStorage.saveRegisteredWorker(matched);
            mobileStorage.setLoggedWorker(loggedWorker);
            setWorker(loggedWorker);
            loadData(loggedWorker);
            setAuthLoading(false);
            return;
          }
        } catch (netErr) {
          console.warn('Supabase worker login query failed, checking offline store:', netErr);
        }
      }

      // 2. Offline fallback (if no internet in field)
      const authResult = mobileStorage.verifyWorkerCredentials(emailTrim, loginPassword);
      if (authResult.success && authResult.worker) {
        mobileStorage.setLoggedWorker(authResult.worker);
        setWorker(authResult.worker);
        loadData(authResult.worker);
      } else {
        setAuthError(authResult.error || 'ایڈمن نے اس ای میل یا فون پر کوئی ورکر اکاؤنٹ رجسٹر نہیں کیا۔ / No worker account found.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Calculations for New Collection (Charbi & Kachara)
  const cGross = parseFloat(charbiGross) || 0;
  const cTare = parseFloat(charbiTare) || 0;
  const cRate = parseFloat(charbiRate) || 0;
  const cNet = Math.max(0, cGross - cTare);
  const cTotal = Math.round(cNet * cRate);

  const kGross = parseFloat(kacharaGross) || 0;
  const kTare = parseFloat(kacharaTare) || 0;
  const kRate = parseFloat(kacharaRate) || 0;
  const kNet = Math.max(0, kGross - kTare);
  const kTotal = Math.round(kNet * kRate);

  const totalGrossWeight = cGross + kGross;
  const totalTareWeight = cTare + kTare;
  const effectiveNetWeight = cNet + kNet;
  const totalAmount = cTotal + kTotal;

  // Photo Capture with automatic downscaling & compression to prevent quota errors
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressingPhoto(true);
        const compressedDataUrl = await compressImage(file, 900, 0.65);
        setPhotoBase64(compressedDataUrl);
      } catch (err) {
        console.error('Failed to compress photo, falling back to original:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressingPhoto(false);
      }
    }
  };

  // Signature Canvas Helpers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0F172A';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureBase64(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setSignatureBase64(null);
  };

  // Submit New Collection Slip
  const handleSaveCollection = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer / shop. / گاہک یا دکان منتخب کریں');
      return;
    }
    if (effectiveNetWeight <= 0) {
      alert('Please enter a valid weight greater than 0 KG. / کم از کم ایک وزن درج کریں');
      return;
    }

    setIsSavingCollection(true);

    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const receiptNo = `SPP-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${randomSuffix}`;
      const clientUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

      const items = [
        ...(cNet > 0 ? [{
          category_id: 'charbi',
          category_name: 'Charbi Weight',
          category_code: 'charbi',
          gross_weight: cGross,
          tare_weight: cTare,
          weight: cNet,
          rate: cRate,
          amount: cTotal,
        }] : []),
        ...(kNet > 0 ? [{
          category_id: 'kachara',
          category_name: 'Kachara Weight',
          category_code: 'kachara',
          gross_weight: kGross,
          tare_weight: kTare,
          weight: kNet,
          rate: kRate,
          amount: kTotal,
        }] : []),
      ];

      const newSlip: OfflineCollectionItem = {
        client_uuid: clientUuid,
        receipt_no: receiptNo,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        customer_area: selectedCustomer.area,
        customer_phone: selectedCustomer.phone,
        worker_id: worker?.id || null,
        worker_name: worker?.full_name || 'Field Collector',
        collection_date: dateStr,
        collection_time: timeStr,
        gross_weight: totalGrossWeight > 0 ? totalGrossWeight : effectiveNetWeight,
        tare_weight: totalTareWeight,
        total_net_weight: effectiveNetWeight,
        rate_per_kg: kRate || cRate || 45,
        total_amount: totalAmount,
        notes: notes.trim() || null,
        signature_base64: signatureBase64,
        photo_base64: photoBase64,
        items,
        charbi_gross: cGross,
        charbi_tare: cTare,
        charbi_net: cNet,
        charbi_rate: cRate,
        charbi_total: cTotal,
        kachara_gross: kGross,
        kachara_tare: kTare,
        kachara_net: kNet,
        kachara_rate: kRate,
        kachara_total: kTotal,
        status: 'pending_sync',
        created_at: now.toISOString(),
      };

      // If online, attempt direct save to Supabase
      let savedOnline = false;
      if (isOnline) {
        try {
          const { data: colData, error: colError } = await supabase
            .from('collections')
            .insert({
              client_uuid: clientUuid,
              receipt_no: receiptNo,
              customer_id: selectedCustomer.id,
              worker_id: worker?.id && worker.id.length > 20 ? worker.id : null,
              collection_date: dateStr,
              collection_time: timeStr,
              collection_timestamp: `${dateStr}T${timeStr}`,
              gross_weight: newSlip.gross_weight,
              tare_weight: newSlip.tare_weight,
              total_net_weight: newSlip.total_net_weight,
              rate_per_kg: newSlip.rate_per_kg,
              total_amount: newSlip.total_amount,
              notes: newSlip.notes,
              signature_url: newSlip.signature_base64 || null,
              charbi_gross: cGross,
              charbi_tare: cTare,
              charbi_net: cNet,
              charbi_rate: cRate,
              charbi_total: cTotal,
              kachara_gross: kGross,
              kachara_tare: kTare,
              kachara_net: kNet,
              kachara_rate: kRate,
              kachara_total: kTotal,
              status: 'submitted',
            })
            .select()
            .single();

          if (!colError && colData) {
            savedOnline = true;
            newSlip.status = 'synced';

            // Insert scale photo attachment if captured
            if (photoBase64) {
              await supabase.from('collection_attachments').insert({
                collection_id: colData.id,
                storage_bucket: 'collection-attachments',
                file_path: photoBase64,
                file_name: `photo_${receiptNo}.jpg`,
                file_type: 'image/jpeg',
                uploaded_by: worker?.id && worker.id.length > 20 ? worker.id : null,
              });
            }
          }
        } catch (e) {
          console.warn('Online insert failed, saved to offline queue:', e);
        }
      }

      // Save locally (strip photo from localStorage if already saved online to avoid storage quota)
      if (savedOnline) {
        newSlip.photo_base64 = null;
      }
      mobileStorage.saveOfflineSlip(newSlip);
      await loadData(worker);

      // Show digital receipt popup
      setReceiptModalSlip(newSlip);

      // Automatically trigger receipt image generation & sharing to customer's WhatsApp
      try {
        shareReceiptImage(newSlip).catch(e => console.warn('Auto-share receipt image notice:', e));
      } catch (e) {
        console.warn('Auto-share receipt error:', e);
      }

      // Reset form
      setSelectedCustomer(null);
      setCharbiGross('');
      setCharbiTare('0');
      setKacharaGross('');
      setKacharaTare('0');
      setNotes('');
      setPhotoBase64(null);
      setSignatureBase64(null);
      clearSignature();
    } catch (err: any) {
      alert(`Error saving collection: ${err.message}`);
    } finally {
      setIsSavingCollection(false);
    }
  };

  // Add Customer Quick Action
  const handleAddCustomer = async () => {
    if (!newCustName.trim()) {
      alert('Customer / Shop Name is required. / دکان کا نام درج کریں');
      return;
    }

    const cRate = parseFloat(newCustCharbiRate) || 55;
    const kRate = parseFloat(newCustKacharaRate) || 45;
    const newCustomerObj: Customer = {
      id: 'cust-' + Date.now(),
      customer_code: 'CUST-' + Math.floor(100 + Math.random() * 900),
      name: newCustName.trim(),
      contact_person: newCustContact.trim() || null,
      phone: newCustPhone.trim() || '+92 300 0000000',
      alternate_phone: null,
      address: null,
      area: newCustArea.trim() || 'Gaggoo Mandi',
      rate_per_kg: kRate,
      rate_charbi: cRate,
      rate_kachara: kRate,
      category_rates: {
        charbi: cRate,
        kachara: kRate,
      },
      status: 'active',
      notes: null,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isOnline) {
      try {
        const { data, error } = await supabase.from('customers').insert({
          customer_code: newCustomerObj.customer_code,
          name: newCustomerObj.name,
          contact_person: newCustomerObj.contact_person,
          phone: newCustomerObj.phone,
          area: newCustomerObj.area,
          rate_per_kg: newCustomerObj.rate_per_kg,
          rate_charbi: newCustomerObj.rate_charbi,
          rate_kachara: newCustomerObj.rate_kachara,
          category_rates: newCustomerObj.category_rates,
          status: 'active',
        }).select().single();

        if (!error && data) {
          newCustomerObj.id = data.id;
        }
      } catch (e) {
        console.warn('Could not insert online, cached locally:', e);
      }
    }

    const updated = [newCustomerObj, ...customers];
    setCustomers(updated);
    mobileStorage.setCachedCustomers(updated);
    setSelectedCustomer(newCustomerObj);
    setCharbiRate(cRate.toString());
    setKacharaRate(kRate.toString());

    setAddCustomerModalOpen(false);
    setNewCustName('');
    setNewCustContact('');
    setNewCustPhone('');
  };

  // Sync Offline Slips
  const handleSyncAll = async () => {
    if (!isOnline) {
      alert('You are currently offline. Please check your internet connection.');
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg('Syncing collection slips with Supabase...');

    const result = await mobileStorage.syncAllPending((curr, total) => {
      setSyncStatusMsg(`Syncing ${curr} of ${total} collection slips...`);
    });

    setOfflineSlips(mobileStorage.getOfflineSlips());
    setPendingCount(mobileStorage.getPendingSyncCount());
    setIsSyncing(false);
    setSyncStatusMsg(null);
    alert(`Sync completed! ${result.success} synced successfully, ${result.failed} failed.`);
  };

  // Today's Combined Totals (All Workers)
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySlips = offlineSlips.filter(s => s.collection_date === todayStr);
  const todayTotalWeight = todaySlips.reduce((acc, s) => acc + s.total_net_weight, 0);
  const todayTotalAmount = todaySlips.reduce((acc, s) => acc + s.total_amount, 0);

  // My Personal Share Today
  const myTodaySlips = todaySlips.filter(s => s.worker_id === worker?.id);
  const myTodayWeight = myTodaySlips.reduce((acc, s) => acc + s.total_net_weight, 0);
  const myTodayAmount = myTodaySlips.reduce((acc, s) => acc + s.total_amount, 0);

  // Today's scope filtered list
  const displayedTodaySlips = todayScope === 'mine' ? myTodaySlips : todaySlips;

  // All Slips scope filtered list - strictly worker's own slips for the Slips section!
  const myAllSlips = offlineSlips.filter(s => s.worker_id === worker?.id);
  const displayedAllSlips = myAllSlips;

  // Filtered Customers for Modal
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.area.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.contact_person && c.contact_person.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  // STRICT ENFORCEMENT: Without assigned worker login credentials, show Login Screen
  if (!worker) {
    return (
      <div className="flex flex-col min-h-screen w-full bg-slate-900 text-white select-none overflow-y-auto font-sans p-5 justify-center items-center">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo & Branding */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl mx-auto shadow-xl shadow-blue-500/25 border border-slate-700 overflow-hidden flex items-center justify-center bg-white p-1">
              <img
                src={appIcon}
                alt="Shan Poultry"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              شن پولٹری پروٹین
            </h1>
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
              SHAN POULTRY PROTEIN
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold tracking-wider">
              فیلڈ کلیکٹر موبائل ایپ (Field Worker App)
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-100">ورکر لاگ ان</h2>
                <span className="text-xs text-slate-400 font-mono">Terminal Login</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                ایڈمن حاجی شان کا دیا گیا ای میل یا فون نمبر اور پاس ورڈ درج کریں۔
              </p>
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleWorkerLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between mb-1.5">
                  <span>Assigned Email or Phone</span>
                  <span className="text-[11px] text-blue-400 font-normal">ای میل یا فون نمبر</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="e.g. ali@gmail.com / 03197784575"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between mb-1.5">
                  <span>Assigned Password</span>
                  <span className="text-[11px] text-blue-400 font-normal">پاس ورڈ</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 pr-10 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {authLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>تصدیق ہو رہی ہے... (Verifying...)</span>
                  </>
                ) : (
                  <span>لاگ ان کریں / Log In to Terminal</span>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-700/60 text-center">
              <p className="text-[11px] text-slate-400">
                ورکرز ایڈمن کے تفویض کردہ لاگ ان کے بغیر داخل نہیں ہو سکتے۔
              </p>
            </div>
          </div>

          {/* Connection Status indicator */}
          <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Online Mode (Cloud Ready)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400 font-medium">Offline Mode (Using Cached Logins)</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 select-none overflow-hidden font-sans">
      {/* =========================================================================
          TOP STATUS & BRAND HEADER WITH REFRESH BUTTON & APP ICON
      ========================================================================= */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white p-0.5 flex items-center justify-center shrink-0">
            <img
              src={appIcon}
              alt="Shan Poultry"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wide text-slate-900">SHAN POULTRY</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">FIELD</span>
            </div>
            <div className="text-xs text-slate-500 font-medium truncate max-w-[150px]">
              {worker?.full_name || 'Worker App'}
            </div>
          </div>
        </div>

        {/* Action Controls: Refresh + Online/Offline Status */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold transition shadow-2xs disabled:opacity-50"
            title="تازہ کریں / Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
            <span className="text-[11px] font-bold">تازہ کریں</span>
          </button>

          {/* GPS Live Indicator Badge */}
          {gpsActive ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold" title="Live GPS Active">
              <Navigation className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
              <span>GPS LIVE</span>
            </div>
          ) : gpsError ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold" title={gpsError}>
              <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
              <span>NO GPS</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold">
              <span>GPS...</span>
            </div>
          )}

          {isOnline ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              OFFLINE
            </div>
          )}
        </div>
      </header>

      {/* =========================================================================
          MAIN SCROLLABLE CONTENT AREA
      ========================================================================= */}
      <main className="flex-1 overflow-y-auto pb-24 p-4">
        {/* TAB 1: HOME DASHBOARD */}
        {activeTab === 'home' && (
          <div className="space-y-4 max-w-lg mx-auto">
            {/* Offline Alert Banner */}
            {pendingCount > 0 && (
              <div
                onClick={() => setActiveTab('profile')}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between shadow-sm cursor-pointer active:scale-98 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-900">
                      {pendingCount} Collection Slip{pendingCount > 1 ? 's' : ''} Pending Sync
                    </div>
                    <div className="text-[11px] text-amber-700">Tap here to sync with main database</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600" />
              </div>
            )}

            {/* Today's Combined KPI Metric Cards (All Workers Total) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">آج کا کل وزن</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">تمام ورکرز</span>
                </div>
                <div className="text-2xl font-black text-blue-600 mt-1 font-mono tracking-tight">
                  {todayTotalWeight.toFixed(1)} <span className="text-sm font-bold text-slate-500">KG</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium flex items-center justify-between">
                  <span>{todaySlips.length} رسیدیں</span>
                  <span className="text-blue-700 font-bold">آپ کا: {myTodayWeight.toFixed(1)} KG</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">آج کی کل رقم</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">تمام ورکرز</span>
                </div>
                <div className="text-2xl font-black text-amber-600 mt-1 font-mono tracking-tight">
                  Rs. {todayTotalAmount.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium flex items-center justify-between">
                  <span>{pendingCount} زیر التواء</span>
                  <span className="text-amber-700 font-bold">آپ کا: Rs. {myTodayAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Big Primary Action: RECORD NEW COLLECTION */}
            <button
              onClick={() => setActiveTab('new_collection')}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-base py-4 px-5 rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-between transition-all active:scale-98"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-black tracking-wide">نئی رسید درج کریں (RECORD COLLECTION)</div>
                  <div className="text-xs text-blue-100 font-medium">وزن، کیمرہ، دستخط اور ڈیجیٹل سلپ</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70" />
            </button>

            {/* Quick Action Navigation Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => setActiveTab('customers')}
                className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm active:bg-slate-50 transition"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">گاہک (Shops)</span>
                <span className="text-[10px] text-slate-400 font-medium">{customers.length} shops</span>
              </button>

              <button
                onClick={() => setActiveTab('collections')}
                className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm active:bg-slate-50 transition"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">تمام رسیدیں</span>
                <span className="text-[10px] text-slate-400 font-medium">{offlineSlips.length} total</span>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm active:bg-slate-50 transition"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">سنک سینٹر</span>
                <span className="text-[10px] text-slate-400 font-medium">{pendingCount} unsynced</span>
              </button>
            </div>

            {/* Today's Collections List with Scope Filter */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between px-1">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    آج کی وصولیاں
                  </span>
                  <span className="text-xs text-slate-400 font-mono ml-1.5">({displayedTodaySlips.length})</span>
                </div>
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTodayScope('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      todayScope === 'all' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    تمام ورکرز ({todaySlips.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTodayScope('mine')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      todayScope === 'mine' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    میری رسیدیں ({myTodaySlips.length})
                  </button>
                </div>
              </div>

              {displayedTodaySlips.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    {todayScope === 'mine' ? 'آپ نے آج کوئی رسید درج نہیں کی' : 'آج کی کوئی رسید درج نہیں ہوئی'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">نئی رسید درج کرنے کے لیے اوپر نیلا بٹن دبائیں۔</div>
                </div>
              ) : (
                displayedTodaySlips.map(s => (
                  <div
                    key={s.client_uuid}
                    onClick={() => setReceiptModalSlip(s)}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm active:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-blue-600">{s.receipt_no}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          s.worker_id === worker?.id ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {s.worker_id === worker?.id ? `آپ (${s.worker_name})` : s.worker_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">{s.collection_time.substring(0, 5)}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingSlip(s);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-xs font-bold flex items-center gap-1 transition"
                          title="ایڈٹ کریں / Edit Slip"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>ایڈٹ</span>
                        </button>
                      </div>
                    </div>
                    <div className="font-bold text-slate-900 text-sm truncate">{s.customer_name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {s.customer_area}
                    </div>
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                      <div className="font-mono font-black text-base text-blue-600">
                        {s.total_net_weight} <span className="text-xs font-bold text-slate-500">KG</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          Rs. {s.total_amount.toLocaleString()}
                        </span>
                        {s.status === 'synced' ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Synced" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Pending Sync" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: NEW COLLECTION WORKFLOW */}
        {activeTab === 'new_collection' && (
          <div className="space-y-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-lg font-black text-slate-900">نئی رسید درج کریں</h2>
                <p className="text-xs text-slate-500">Record New Collection & Customer Confirmation</p>
              </div>
              <button
                onClick={() => setActiveTab('home')}
                className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl active:bg-slate-100"
              >
                منسوخ (Cancel)
              </button>
            </div>

            {/* STEP 1: CUSTOMER SELECTION */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <span>Step 1: گاہک / دکان کا انتخاب</span>
                </label>
                <button
                  type="button"
                  onClick={() => setAddCustomerModalOpen(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  + نئی دکان درج کریں
                </button>
              </div>

              {selectedCustomer ? (
                <div
                  onClick={() => setCustomerModalOpen(true)}
                  className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="font-black text-sm text-slate-900">{selectedCustomer.name}</div>
                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{selectedCustomer.area}</span>
                      <span className="font-bold text-emerald-700">چربی: Rs. {selectedCustomer.rate_charbi || 55}/KG</span>
                      <span className="font-bold text-amber-700">کچرا: Rs. {selectedCustomer.rate_kachara || selectedCustomer.rate_per_kg || 45}/KG</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs shrink-0 ml-2">
                    تبدیل کریں
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  className="w-full py-3.5 px-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-left flex items-center justify-between text-slate-600 active:bg-slate-100"
                >
                  <span className="text-sm font-semibold text-slate-500">گاہک یا دکان منتخب کرنے کیلئے ٹچ کریں...</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* STEP 2: WEIGHT ENTRY (CHARBI & KACHARA) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Step 2: وزن کی تفصیلات (Weight & Rates) *
              </label>

              {/* CARD 1: CHARBI WEIGHT */}
              <div className="p-3.5 bg-emerald-50/40 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-black text-sm text-emerald-950">چربی وزن (Charbi Weight)</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-lg font-mono">
                    خالص: {cNet.toFixed(1)} KG
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Charbi Gross */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 flex justify-between mb-1">
                      <span>Gross (KG)</span>
                      <span className="text-emerald-700 text-[11px]">کل وزن</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      placeholder="0.0"
                      value={charbiGross}
                      onChange={e => setCharbiGross(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-mono text-base font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex gap-1 mt-1">
                      {['+5', '+10', '+25'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            const cur = parseFloat(charbiGross) || 0;
                            setCharbiGross((cur + parseInt(val.replace('+', ''))).toString());
                          }}
                          className="flex-1 py-0.5 bg-emerald-100/70 text-emerald-800 rounded-md text-[10px] font-bold active:bg-emerald-200"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Charbi Tare */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 flex justify-between mb-1">
                      <span>Tare (KG)</span>
                      <span className="text-slate-500 text-[11px]">تار / برتن وزن</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      placeholder="0.0"
                      value={charbiTare}
                      onChange={e => setCharbiTare(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-mono text-base font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex gap-1 mt-1">
                      {['0', '2.5', '5.0'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCharbiTare(val)}
                          className="flex-1 py-0.5 bg-emerald-100/70 text-emerald-800 rounded-md text-[10px] font-bold active:bg-emerald-200"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Charbi Rate */}
                <div className="grid grid-cols-2 gap-2.5 items-center pt-1 border-t border-emerald-200/60">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-0.5">
                      ریٹ فی کلو (Price / KG)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="55"
                      value={charbiRate}
                      onChange={e => setCharbiRate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">چربی ٹوٹل بل</span>
                    <span className="font-mono font-black text-sm text-emerald-950">Rs. {cTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* CARD 2: KACHARA WEIGHT */}
              <div className="p-3.5 bg-amber-50/40 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="font-black text-sm text-amber-950">کچرا وزن (Kachara Weight)</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-lg font-mono">
                    خالص: {kNet.toFixed(1)} KG
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Kachara Gross */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 flex justify-between mb-1">
                      <span>Gross (KG)</span>
                      <span className="text-amber-700 text-[11px]">کل وزن</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      placeholder="0.0"
                      value={kacharaGross}
                      onChange={e => setKacharaGross(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono text-base font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex gap-1 mt-1">
                      {['+5', '+10', '+25'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            const cur = parseFloat(kacharaGross) || 0;
                            setKacharaGross((cur + parseInt(val.replace('+', ''))).toString());
                          }}
                          className="flex-1 py-0.5 bg-amber-100/70 text-amber-800 rounded-md text-[10px] font-bold active:bg-amber-200"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kachara Tare */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 flex justify-between mb-1">
                      <span>Tare (KG)</span>
                      <span className="text-slate-500 text-[11px]">تار / برتن وزن</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      placeholder="0.0"
                      value={kacharaTare}
                      onChange={e => setKacharaTare(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono text-base font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex gap-1 mt-1">
                      {['0', '2.5', '5.0'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setKacharaTare(val)}
                          className="flex-1 py-0.5 bg-amber-100/70 text-amber-800 rounded-md text-[10px] font-bold active:bg-amber-200"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Kachara Rate */}
                <div className="grid grid-cols-2 gap-2.5 items-center pt-1 border-t border-amber-200/60">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-0.5">
                      ریٹ فی کلو (Price / KG)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="45"
                      value={kacharaRate}
                      onChange={e => setKacharaRate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">کچرا ٹوٹل بل</span>
                    <span className="font-mono font-black text-sm text-amber-950">Rs. {kTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* SUMMARY BAR: TOTAL NET WEIGHT & TOTAL BILL */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    TOTAL NET WEIGHT (کل خالص وزن)
                  </span>
                  <span className="text-2xl font-black font-mono text-blue-400">
                    {effectiveNetWeight.toFixed(1)} <span className="text-sm font-bold text-slate-400">KG</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    TOTAL BILL (کل بل رقم)
                  </span>
                  <span className="text-2xl font-black font-mono text-amber-400">
                    Rs. {totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* STEP 3: PHOTO ATTACHMENT */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>Step 3: Scale / Slip Photo Proof</span>
                <span className="text-[11px] text-slate-400 font-normal">کانٹے / رسید کی تصویر</span>
              </label>

              {isCompressingPhoto ? (
                <div className="w-full py-8 border border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50 gap-2">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                  <span className="text-xs font-bold text-slate-700">تصویر پروسیس اور کمپریس ہو رہی ہے...</span>
                  <span className="text-[10px] text-slate-400">Compressing scale photo to save storage</span>
                </div>
              ) : photoBase64 ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={photoBase64} alt="Scale attachment" className="w-full h-40 object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoBase64(null)}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg shadow-md active:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer active:bg-slate-50 transition">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">تصویر بنائیں یا منتخب کریں</span>
                  <span className="text-[10px] text-slate-400">کانٹے کے وزن کا فوٹو ثبوت (Photo Proof)</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* STEP 4: CUSTOMER SIGNATURE PAD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <span>Step 4: گاہک کے ڈیجیٹل دستخط *</span>
                </label>
                {signatureBase64 && (
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-xs font-bold text-red-600 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> دوبارہ کریں (Clear)
                  </button>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden relative">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={130}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={endDrawing}
                  className="w-full touch-none bg-white cursor-crosshair"
                />
                {!signatureBase64 && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs font-medium text-slate-300">
                    یہاں انگلی سے دستخط کروائیں (Sign with finger)...
                  </div>
                )}
              </div>
            </div>

            {/* STEP 5: NOTES */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between mb-1.5">
                <span>Remarks / Notes</span>
                <span className="text-[11px] text-slate-400 font-normal">ریمارکس / تفصیل</span>
              </label>
              <input
                type="text"
                placeholder="مثلاً: کیش ادا کیا، کریٹ جمع، وغیرہ..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="button"
              disabled={isSavingCollection || !selectedCustomer || effectiveNetWeight <= 0}
              onClick={handleSaveCollection}
              className={`w-full py-4 rounded-2xl font-black text-base tracking-wide text-white shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 ${
                isSavingCollection || !selectedCustomer || effectiveNetWeight <= 0
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
              }`}
            >
              {isSavingCollection ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>محفوظ ہو رہا ہے... (SAVING...)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>رسید محفوظ کریں / SAVE COLLECTION</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 3: COLLECTIONS HISTORY (STRICTLY WORKER'S OWN SLIPS) */}
        {activeTab === 'collections' && (
          <div className="space-y-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-lg font-black text-slate-900">میری رسیدیں (My Slips)</h2>
                <p className="text-xs text-slate-500">{displayedAllSlips.length} slips recorded by you</p>
              </div>
              {pendingCount > 0 && (
                <button
                  onClick={handleSyncAll}
                  disabled={isSyncing}
                  className="text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-xl shadow-xs active:bg-blue-700"
                >
                  Sync ({pendingCount})
                </button>
              )}
            </div>

            {displayedAllSlips.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="text-sm font-bold text-slate-700">
                  آپ کے پاس کوئی رسید موجود نہیں (No slips recorded yet)
                </div>
                <div className="text-xs text-slate-400 mt-1">Recorded weigh-in slips will appear here.</div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayedAllSlips.map(s => (
                  <div
                    key={s.client_uuid}
                    onClick={() => setReceiptModalSlip(s)}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm active:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs text-blue-600">{s.receipt_no}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          s.worker_id === worker?.id ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {s.worker_id === worker?.id ? `آپ (${s.worker_name})` : s.worker_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-mono">{s.collection_date}</span>
                        {s.status === 'synced' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            SYNCED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            OFFLINE
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            shareReceiptImage(s);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 transition ml-1"
                          title="واٹس ایپ پر رسید تصویر بھیجیں / Send Receipt Image"
                        >
                          <Share2 className="w-3 h-3 text-emerald-600" />
                          <span>تصویر</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingSlip(s);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-xs font-bold flex items-center gap-1 transition ml-1"
                          title="ایڈٹ کریں / Edit Slip"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>ایڈٹ</span>
                        </button>
                      </div>
                    </div>
                    <div className="font-bold text-slate-900 text-sm truncate">{s.customer_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.customer_area}</div>
                    <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 font-mono">
                      <span className="font-bold text-sm text-blue-600">{s.total_net_weight} KG</span>
                      <span className="font-black text-sm text-slate-900">Rs. {s.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CUSTOMERS DIRECTORY */}
        {activeTab === 'customers' && (
          <div className="space-y-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-lg font-black text-slate-900">Customers Directory</h2>
                <p className="text-xs text-slate-500">{customers.length} registered shops</p>
              </div>
              <button
                onClick={() => setAddCustomerModalOpen(true)}
                className="text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-xl shadow-xs active:bg-blue-700"
              >
                + Add Shop
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search shop name, owner, or mandi..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Customer Cards */}
            <div className="space-y-2.5">
              {filteredCustomers.map(c => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{c.contact_person || 'Owner'}</div>
                      <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {c.area}
                      </div>
                    </div>

                    <a
                      href={`tel:${c.phone}`}
                      className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 active:bg-emerald-100"
                      title="Call customer"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
                    <span className="font-bold text-slate-500">Agreed Rates:</span>
                    <div className="flex gap-2">
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        چربی: Rs. {c.rate_charbi || 55}
                      </span>
                      <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                        کچرا: Rs. {c.rate_kachara || c.rate_per_kg || 45}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE & SYNC MANAGER */}
        {activeTab === 'profile' && (
          <div className="space-y-4 max-w-lg mx-auto">
            <h2 className="text-lg font-black text-slate-900">Worker Profile & Sync</h2>

            {/* Worker Details Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                {worker?.full_name?.charAt(0) || 'W'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-slate-900 text-base truncate">{worker?.full_name || 'Field Collector'}</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">{worker?.phone || '+92 300 0000000'}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    FIELD AGENT
                  </span>
                  <span className="text-[11px] text-slate-400">• Shan Poultry</span>
                </div>
              </div>
            </div>

            {/* Offline Sync Manager Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Offline Sync Center</span>
                <span className="text-xs font-mono font-bold text-amber-600">{pendingCount} pending</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Network Connection:</span>
                  <span className={`font-bold ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isOnline ? '🟢 Connected' : '🟡 Offline'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Offline Slips:</span>
                  <span className="font-bold font-mono text-slate-900">{pendingCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Slips on Phone:</span>
                  <span className="font-bold font-mono text-slate-900">{offlineSlips.length}</span>
                </div>
              </div>

              {syncStatusMsg && (
                <div className="text-xs text-blue-600 font-bold text-center py-1">
                  {syncStatusMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleSyncAll}
                disabled={isSyncing || pendingCount === 0 || !isOnline}
                className={`w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm transition active:scale-98 ${
                  isSyncing || pendingCount === 0 || !isOnline
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'SYNCING IN PROGRESS...' : 'SYNC ALL PENDING SLIPS NOW'}</span>
              </button>
            </div>

            {/* App Info Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2 text-xs text-slate-500">
              <div className="font-bold text-slate-700">App Information</div>
              <div className="flex justify-between">
                <span>Application:</span>
                <span className="font-medium text-slate-900">Shan Poultry Mobile Worker</span>
              </div>
              <div className="flex justify-between">
                <span>Version:</span>
                <span className="font-mono text-slate-900">v1.0.0 Daylight Native</span>
              </div>
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="font-mono text-slate-900 truncate max-w-[180px]">ohwslpcuetrpkqhvvszu.supabase.co</span>
              </div>
            </div>

            {/* Sign Out / Switch Worker */}
            <button
              onClick={async () => {
                if (confirm('Log out from this worker account? You will need your assigned credentials to log back in.')) {
                  if (worker?.id) {
                    try {
                      await supabase.from('profiles').update({ is_online: false }).eq('id', worker.id);
                    } catch (e) {}
                  }
                  mobileStorage.clearSession();
                  setWorker(null);
                  setOfflineSlips([]);
                  setPendingCount(0);
                  setGpsActive(false);
                }
              }}
              className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:bg-rose-100 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out & Lock Terminal</span>
            </button>
          </div>
        )}
      </main>

      {/* =========================================================================
          FIXED BOTTOM NAVIGATION BAR
      ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-3 py-1.5 flex items-center justify-around shadow-lg z-30">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            activeTab === 'home' ? 'text-blue-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">ہوم (Home)</span>
        </button>

        <button
          onClick={() => setActiveTab('collections')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            activeTab === 'collections' ? 'text-blue-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">رسیدیں (Slips)</span>
        </button>

        {/* Center Prominent Record Button */}
        <button
          onClick={() => setActiveTab('new_collection')}
          className="w-13 h-13 -mt-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 border-4 border-slate-50 active:scale-95 transition"
          title="نئی رسید (New Collection)"
        >
          <PlusCircle className="w-7 h-7" />
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            activeTab === 'customers' ? 'text-blue-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">گاہک (Shops)</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition relative ${
            activeTab === 'profile' ? 'text-blue-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">پروفائل (Profile)</span>
          {pendingCount > 0 && (
            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
      </nav>

      {/* =========================================================================
          MODAL 1: CUSTOMER PICKER
      ========================================================================= */}
      {customerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-slideUp">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Select Customer / Shop</h3>
                <p className="text-xs text-slate-500">{filteredCustomers.length} shops available</p>
              </div>
              <button
                onClick={() => setCustomerModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Type shop name or area..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredCustomers.map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setCharbiRate(c.rate_charbi ? c.rate_charbi.toString() : '55');
                    setKacharaRate(c.rate_kachara ? c.rate_kachara.toString() : (c.rate_per_kg ? c.rate_per_kg.toString() : '45'));
                    setCustomerModalOpen(false);
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer flex items-center justify-between transition"
                >
                  <div>
                    <div className="font-bold text-sm text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {c.area} • {c.contact_person || 'Owner'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-emerald-700 block">چربی: Rs. {c.rate_charbi || 55}</span>
                    <span className="font-mono font-bold text-xs text-amber-700 block">کچرا: Rs. {c.rate_kachara || c.rate_per_kg || 45}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setCustomerModalOpen(false);
                  setAddCustomerModalOpen(true);
                }}
                className="w-full py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-2xs active:bg-slate-100"
              >
                + نئی دکان درج کریں / Add Shop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADD NEW CUSTOMER WITH CHARBI & KACHARA RATES
      ========================================================================= */}
      {addCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">نئی دکان درج کریں</h3>
                <p className="text-xs text-slate-500">Add New Poultry Shop & Agreed Rates</p>
              </div>
              <button onClick={() => setAddCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">دکان / کاروبار کا نام (Shop Name) *</label>
                <input
                  type="text"
                  placeholder="مثلاً: المدینہ چکن شاپ"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">مالک / رابطہ کار (Contact Person)</label>
                <input
                  type="text"
                  placeholder="مثلاً: حاجی راشد"
                  value={newCustContact}
                  onChange={e => setNewCustContact(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">فون نمبر (Phone for WhatsApp) *</label>
                <input
                  type="tel"
                  placeholder="03001234567"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">علاقہ / منڈی (Area / Town)</label>
                <input
                  type="text"
                  placeholder="گگو منڈی / Gaggoo Mandi"
                  value={newCustArea}
                  onChange={e => setNewCustArea(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              {/* Two Agreed Rates: Charbi & Kachara */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <label className="text-xs font-bold text-emerald-800 block mb-1">
                    چربی ریٹ (Charbi / KG)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="55"
                    value={newCustCharbiRate}
                    onChange={e => setNewCustCharbiRate(e.target.value)}
                    className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-300 rounded-xl text-sm font-bold font-mono text-emerald-950"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-amber-800 block mb-1">
                    کچرا ریٹ (Kachara / KG)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="45"
                    value={newCustKacharaRate}
                    onChange={e => setNewCustKacharaRate(e.target.value)}
                    className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-xl text-sm font-bold font-mono text-amber-950"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setAddCustomerModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
              >
                منسوخ (Cancel)
              </button>
              <button
                type="button"
                onClick={handleAddCustomer}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm"
              >
                محفوظ کریں (Save)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: DIGITAL SLIP RECEIPT WITH LOGO, CHARBI/KACHARA & WHATSAPP
      ========================================================================= */}
      {receiptModalSlip && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-5 space-y-3.5 animate-scaleUp max-h-[95vh] overflow-y-auto">
            {/* Prominent Header with Logo & Business Name */}
            <div className="text-center pb-3 border-b border-dashed border-slate-200">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-2 shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center bg-white p-1">
                <img
                  src={appIcon}
                  alt="Shan Poultry Protein"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="font-black text-lg text-slate-900 tracking-wide uppercase">SHAN POULTRY PROTEIN</div>
              <div className="text-xs text-blue-700 font-bold">شان پولٹری پروٹین</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">آفیشل وصولی رسید (Official Collection Slip)</div>
              <div className="font-mono font-black text-sm text-blue-600 mt-1">{receiptModalSlip.receipt_no}</div>
            </div>

            {/* Receipt Breakdown Details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">گاہک / دوکان (Customer):</span>
                <span className="font-bold text-slate-900 text-right">{receiptModalSlip.customer_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">علاقہ / منڈی (Area):</span>
                <span className="font-medium text-slate-700">{receiptModalSlip.customer_area}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">تاریخ اور وقت (Date & Time):</span>
                <span className="font-mono text-slate-700">
                  {receiptModalSlip.collection_date} {receiptModalSlip.collection_time.substring(0, 5)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">کلیکٹر (Collector):</span>
                <span className="font-medium text-slate-700">{receiptModalSlip.worker_name}</span>
              </div>

              {/* Itemized Charbi Breakdown */}
              {(receiptModalSlip.charbi_net || 0) > 0 || (receiptModalSlip.charbi_gross || 0) > 0 ? (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 font-mono text-xs">
                  <div className="font-bold text-emerald-950 font-sans flex items-center justify-between pb-1 border-b border-emerald-200/60">
                    <span>🟢 چربی وزن (Charbi Weight)</span>
                    <span className="font-bold text-emerald-800">Rs. {receiptModalSlip.charbi_rate || 55}/KG</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>کل وزن (Gross):</span>
                    <span>{receiptModalSlip.charbi_gross || 0} KG</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>تار / برتن (Tare):</span>
                    <span>-{receiptModalSlip.charbi_tare || 0} KG</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold">
                    <span>خالص چربی (Net):</span>
                    <span className="text-emerald-700">{receiptModalSlip.charbi_net || 0} KG</span>
                  </div>
                  <div className="flex justify-between text-emerald-950 font-black pt-1 border-t border-emerald-200/60">
                    <span>چربی بل:</span>
                    <span>Rs. {(receiptModalSlip.charbi_total || Math.round((receiptModalSlip.charbi_net || 0) * (receiptModalSlip.charbi_rate || 55))).toLocaleString()}</span>
                  </div>
                </div>
              ) : null}

              {/* Itemized Kachara Breakdown */}
              {(receiptModalSlip.kachara_net || 0) > 0 || (receiptModalSlip.kachara_gross || 0) > 0 ? (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 font-mono text-xs">
                  <div className="font-bold text-amber-950 font-sans flex items-center justify-between pb-1 border-b border-amber-200/60">
                    <span>🟠 کچرا وزن (Kachara Weight)</span>
                    <span className="font-bold text-amber-800">Rs. {receiptModalSlip.kachara_rate || receiptModalSlip.rate_per_kg || 45}/KG</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>کل وزن (Gross):</span>
                    <span>{receiptModalSlip.kachara_gross || 0} KG</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>تار / برتن (Tare):</span>
                    <span>-{receiptModalSlip.kachara_tare || 0} KG</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold">
                    <span>خالص کچرا (Net):</span>
                    <span className="text-amber-700">{receiptModalSlip.kachara_net || 0} KG</span>
                  </div>
                  <div className="flex justify-between text-amber-950 font-black pt-1 border-t border-amber-200/60">
                    <span>کچرا بل:</span>
                    <span>Rs. {(receiptModalSlip.kachara_total || Math.round((receiptModalSlip.kachara_net || 0) * (receiptModalSlip.kachara_rate || receiptModalSlip.rate_per_kg || 45))).toLocaleString()}</span>
                  </div>
                </div>
              ) : null}

              {/* Legacy slip fallback if neither is explicitly populated */}
              {!((receiptModalSlip.charbi_net || 0) > 0 || (receiptModalSlip.kachara_net || 0) > 0) && (
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 my-2 font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>کل وزن (Gross):</span>
                    <span>{receiptModalSlip.gross_weight} KG</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>کٹوتی / خالی (Tare):</span>
                    <span>-{receiptModalSlip.tare_weight} KG</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black pt-1 border-t border-slate-200 text-sm">
                    <span>خالص وزن (Net):</span>
                    <span className="text-blue-600">{receiptModalSlip.total_net_weight} KG</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-xs">
                    <span>ریٹ (Rate):</span>
                    <span>Rs. {receiptModalSlip.rate_per_kg} / KG</span>
                  </div>
                </div>
              )}

              {/* Total Net Weight & Total Bill Grand Summary */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-1.5 font-mono">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>TOTAL NET WEIGHT (کل خالص وزن):</span>
                  <span className="text-blue-400 font-black text-sm">{receiptModalSlip.total_net_weight} KG</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 text-sm font-black">
                  <span className="text-white">TOTAL BILL (کل رقم):</span>
                  <span className="text-amber-400 text-base">Rs. {receiptModalSlip.total_amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Signature Display if available */}
              {receiptModalSlip.signature_base64 && (
                <div className="pt-1">
                  <div className="text-[10px] text-slate-500 font-bold tracking-wider mb-1 flex justify-between">
                    <span>گاہک کے دستخط</span>
                    <span className="text-[9px] uppercase text-slate-400">Customer Signature</span>
                  </div>
                  <div className="h-14 border border-slate-200 rounded-lg bg-white overflow-hidden flex items-center justify-center">
                    <img src={receiptModalSlip.signature_base64} alt="Signature" className="max-h-full max-w-full" />
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500">حالت (Status):</span>
                {receiptModalSlip.status === 'synced' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    تصدیق شدہ (VERIFIED & SYNCED)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    محفوظ شدہ (SAVED LOCALLY)
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons: WhatsApp Image Share + Download + Text + Edit + Complete */}
            <div className="space-y-2 pt-1">
              {/* Primary Dedicated WhatsApp IMAGE Share Button */}
              <button
                type="button"
                disabled={isSharingImage}
                onClick={async () => {
                  setIsSharingImage(true);
                  try {
                    await shareReceiptImage(receiptModalSlip);
                  } catch (e) {
                    console.warn('Share image error, fallback to text:', e);
                    openWhatsAppReceipt(receiptModalSlip);
                  } finally {
                    setIsSharingImage(false);
                  }
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition disabled:opacity-60"
              >
                {isSharingImage ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span>واٹس ایپ پر رسید تصویر بھیجیں (Send Receipt Image)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => downloadReceiptImage(receiptModalSlip)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>تصویر محفوظ (Download)</span>
                </button>
                <button
                  type="button"
                  onClick={() => openWhatsAppReceipt(receiptModalSlip)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                  <span>ٹیکسٹ میسج (Text)</span>
                </button>
              </div>

              <div className="flex gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const slipToEdit = receiptModalSlip;
                    setReceiptModalSlip(null);
                    startEditingSlip(slipToEdit);
                  }}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>ایڈٹ کریں (Edit)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReceiptModalSlip(null);
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>مکمل (Done)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: EDIT COLLECTION SLIP (CHARBI & KACHARA)
      ========================================================================= */}
      {editingSlip && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">رسید تبدیل کریں (Edit Slip)</h3>
                <p className="text-xs font-mono font-bold text-blue-600">{editingSlip.receipt_no}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlip(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Customer */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  گاہک / دوکان (Customer Shop)
                </label>
                <select
                  value={editCustomerId}
                  onChange={(e) => {
                    setEditCustomerId(e.target.value);
                    const selected = customers.find(c => c.id === e.target.value);
                    if (selected) {
                      setEditCharbiRate(selected.rate_charbi ? selected.rate_charbi.toString() : '55');
                      setEditKacharaRate(selected.rate_kachara ? selected.rate_kachara.toString() : (selected.rate_per_kg ? selected.rate_per_kg.toString() : '45'));
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.area})
                    </option>
                  ))}
                </select>
              </div>

              {/* Charbi Weight Inputs */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                <span className="font-bold text-emerald-950 block">🟢 چربی وزن (Charbi)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">کل وزن (Gross KG)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={editCharbiGross}
                      onChange={e => setEditCharbiGross(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">تار وزن (Tare KG)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={editCharbiTare}
                      onChange={e => setEditCharbiTare(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">چربی ریٹ (Rate / KG)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editCharbiRate}
                    onChange={e => setEditCharbiRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Kachara Weight Inputs */}
              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
                <span className="font-bold text-amber-950 block">🟠 کچرا وزن (Kachara)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">کل وزن (Gross KG)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={editKacharaGross}
                      onChange={e => setEditKacharaGross(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">تار وزن (Tare KG)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={editKacharaTare}
                      onChange={e => setEditKacharaTare(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">کچرا ریٹ (Rate / KG)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editKacharaRate}
                    onChange={e => setEditKacharaRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Calculated Summary Box */}
              {(() => {
                const cg = parseFloat(editCharbiGross) || 0;
                const ct = parseFloat(editCharbiTare) || 0;
                const cr = parseFloat(editCharbiRate) || 0;
                const cn = Math.max(0, cg - ct);
                const ctot = Math.round(cn * cr);

                const kg = parseFloat(editKacharaGross) || 0;
                const kt = parseFloat(editKacharaTare) || 0;
                const kr = parseFloat(editKacharaRate) || 0;
                const kn = Math.max(0, kg - kt);
                const ktot = Math.round(kn * kr);

                const totNet = cn + kn;
                const totAmt = ctot + ktot;

                return (
                  <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-blue-300 font-bold">
                      <span>خالص وزن (Total Net):</span>
                      <span>{totNet.toFixed(1)} KG</span>
                    </div>
                    <div className="flex justify-between text-amber-300 font-black text-sm pt-1 border-t border-slate-700">
                      <span>کل رقم (Total Billed):</span>
                      <span>Rs. {totAmt.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  نوٹس / ریمارکس (Notes)
                </label>
                <input
                  type="text"
                  placeholder="Optional remarks..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingSlip(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                منسوخ (Cancel)
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>محفوظ ہو رہا ہے...</span>
                  </>
                ) : (
                  <span>تبدیلیاں محفوظ کریں</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
