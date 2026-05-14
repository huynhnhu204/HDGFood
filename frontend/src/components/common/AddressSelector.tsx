'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, MapPin, Loader2, AlertCircle, Check } from 'lucide-react';

interface Province {
  code: string;
  name: string;
}

interface Ward {
  code: string;
  name: string;
  full_address: string;
}

interface AddressSelectorProps {
  onSubmit?: (province: string, ward: string) => void;
}

export default function AddressSelector({ onSubmit }: AddressSelectorProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedProvinceName, setSelectedProvinceName] = useState('');
  const [selectedWardName, setSelectedWardName] = useState('');
  
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [error, setError] = useState('');

  // Lấy danh sách Tỉnh/Thành phố
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const res = await fetch('https://tinhthanhpho.com/api/v1/new-provinces');
        const data = await res.json();
        // Fallback xử lý nếu data trả về khác định dạng mong muốn
        setProvinces(data.data || data || []);
      } catch (err) {
        console.error('Lỗi khi tải tỉnh/thành phố:', err);
      } finally {
        setLoadingProvinces(false);
      }
    };
    fetchProvinces();
  }, []);

  // Lấy danh sách Phường/Xã khi Tỉnh thay đổi
  useEffect(() => {
    if (!selectedProvinceId) {
      setWards([]);
      setSelectedWardName('');
      return;
    }

    const fetchWards = async () => {
      setLoadingWards(true);
      try {
        const res = await fetch(`https://tinhthanhpho.com/api/v1/new-provinces/${selectedProvinceId}/wards`);
        const data = await res.json();
        setWards(data.data || data || []);
      } catch (err) {
        console.error('Lỗi khi tải phường/xã:', err);
      } finally {
        setLoadingWards(false);
      }
    };
    fetchWards();
  }, [selectedProvinceId]);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedProvinceId(code);
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedProvinceName(name === 'Chọn Tỉnh / Thành phố...' ? '' : name);
    // Reset Ward when Province changes
    setSelectedWardName(''); 
    setError('');
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWardName(e.target.value);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProvinceId || !selectedWardName) {
      setError('Vui lòng chọn đầy đủ Tỉnh/Thành phố và Phường/Xã để tiếp tục.');
      return;
    }
    
    setError('');
    
    if (onSubmit) {
      onSubmit(selectedProvinceName, selectedWardName);
    } else {
      alert(`Thành công! Tỉnh: ${selectedProvinceName}, Phường: ${selectedWardName}`);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white p-7 md:p-9 rounded-[2rem] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] font-['Inter',sans-serif] border border-slate-50">
      <div className="flex items-center gap-3.5 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100/50 shadow-inner">
          <MapPin size={22} className="opacity-90" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Địa chỉ giao hàng</h2>
          <p className="text-sm font-medium text-slate-400 mt-0.5">Nhập địa chỉ nhận hàng của bạn</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        {/* Lưới 2 Cột */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 relative w-full items-start md:items-center">
          
          {/* Tỉnh / Thành phố */}
          <div className="w-full md:w-1/2 relative space-y-2">
            <label className="block text-[13px] font-bold text-slate-600 uppercase tracking-widest pl-1">
              Tỉnh / Thành phố
            </label>
            <div className="relative group">
              <select
                value={selectedProvinceId}
                onChange={handleProvinceChange}
                disabled={loadingProvinces}
                className="w-full appearance-none bg-white border border-[#e5e7eb] text-slate-800 py-3.5 pl-4 pr-10 rounded-[12px] outline-none transition-all duration-300 hover:border-[#d4a373]/50 focus:border-[#d4a373] focus:ring-4 focus:ring-[#d4a373]/15 shadow-sm disabled:opacity-50 text-base font-medium"
              >
                <option value="">Chọn Tỉnh / Thành phố...</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-[#d4a373] transition-colors">
                {loadingProvinces ? (
                  <Loader2 size={18} className="animate-spin text-[#d4a373]" />
                ) : (
                  <ChevronDown size={18} />
                )}
              </div>
            </div>
          </div>

          {/* Phường / Xã */}
          <div className="w-full md:w-1/2 relative space-y-2">
            <label className="block text-[13px] font-bold text-slate-600 uppercase tracking-widest pl-1">
              Phường / Xã
            </label>
            <div className="relative group">
              <select
                value={selectedWardName}
                onChange={handleWardChange}
                disabled={!selectedProvinceId || loadingWards}
                className="w-full appearance-none bg-white border border-[#e5e7eb] text-slate-800 py-3.5 pl-4 pr-10 rounded-[12px] outline-none transition-all duration-300 hover:border-[#d4a373]/50 focus:border-[#d4a373] focus:ring-4 focus:ring-[#d4a373]/15 shadow-sm disabled:opacity-50 text-base font-medium disabled:hover:border-[#e5e7eb]"
              >
                <option value="">
                  {selectedProvinceId ? 'Chọn Phường / Xã...' : 'Vui lòng chọn Tỉnh trước'}
                </option>
                {wards.map((w) => (
                  <option key={w.code} value={w.name}>
                    {w.name}
                  </option>
                ))}
              </select>
              <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${!selectedProvinceId ? 'text-slate-300' : 'text-slate-400 group-hover:text-[#d4a373]'}`}>
                {loadingWards ? (
                  <Loader2 size={18} className="animate-spin text-[#d4a373]" />
                ) : (
                  <ChevronDown size={18} />
                )}
              </div>
            </div>
            
            {/* Icon Check Hợp lệ - Dịch ra lề ngoài cột 2 */}
            <div className={`absolute -right-8 top-10 pointer-events-none transition-all duration-500 text-green-500 hidden md:flex items-center justify-center ${selectedProvinceId && selectedWardName ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
              <Check size={24} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="flex items-center gap-2.5 text-red-600 bg-red-50 border border-red-100 p-4 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle size={18} className="shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Nút Submit */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4.5 rounded-2xl transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] hover:shadow-2xl hover:shadow-slate-900/20"
          >
            Xác nhận địa chỉ
          </button>
        </div>
      </form>
    </div>
  );
}
