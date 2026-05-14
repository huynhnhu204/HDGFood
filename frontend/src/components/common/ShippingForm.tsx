'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, MapPin, Loader2, Search, Map, CheckCircle2, Navigation } from 'lucide-react';

interface Province {
  code: string;
  name: string;
}

interface Ward {
  code: string;
  name: string;
}

export default function ShippingForm() {
  const [fullName, setFullName] = useState('');
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedProvinceName, setSelectedProvinceName] = useState('');
  
  const [addressRaw, setAddressRaw] = useState('');
  const [filteredWards, setFilteredWards] = useState<Ward[]>([]);
  const [showWardSuggestions, setShowWardSuggestions] = useState(false);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Fetch Tỉnh
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const res = await fetch('https://tinhthanhpho.com/api/v1/new-provinces');
        const data = await res.json();
        setProvinces(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProvinces(false);
      }
    };
    fetchProvinces();
  }, []);

  // Fetch Phường khi chọn Tỉnh
  useEffect(() => {
    if (!selectedProvince) {
      setWards([]);
      setAddressRaw('');
      setSelectedWard(null);
      return;
    }

    const fetchWards = async () => {
      setLoadingWards(true);
      try {
        const res = await fetch(`https://tinhthanhpho.com/api/v1/new-provinces/${selectedProvince}/wards`);
        const data = await res.json();
        setWards(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingWards(false);
      }
    };
    fetchWards();
  }, [selectedProvince]);

  // Lọc phường bám theo text người dùng gõ
  useEffect(() => {
    if (addressRaw.trim() === '') {
      setFilteredWards(wards);
    } else {
      const lower = addressRaw.toLowerCase();
      // Tìm phường/xã khớp chuỗi (bỏ qua số nhà ở trước nếu có)
      const matches = wards.filter(w => 
        w.name.toLowerCase().includes(lower) || 
        lower.includes(w.name.toLowerCase())
      );
      setFilteredWards(matches);
    }
  }, [addressRaw, wards]);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedProvince(code);
    if(code) {
      const name = e.target.options[e.target.selectedIndex].text;
      setSelectedProvinceName(name);
    } else {
      setSelectedProvinceName('');
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressRaw(e.target.value);
    setShowWardSuggestions(true);
    // Nếu thay đổi text thì coi như chưa chốt phường cụ thể
    if (selectedWard && !e.target.value.includes(selectedWard.name)) {
      setSelectedWard(null);
    }
  };

  const selectWard = (ward: Ward) => {
    setSelectedWard(ward);
    // Tự động gán tên phường vào ô input, chừa chỗ cho ghi số nhà bên trái
    if (!addressRaw.includes(ward.name)) {
      // Cách 1: Đẩy tên phường xuống cuối
      setAddressRaw((prev) => prev.trim() ? `${prev}, ${ward.name}` : ward.name);
    }
    setShowWardSuggestions(false);
    addressInputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 font-['Inter',sans-serif]">
      {/* Header Form */}
      <div className="text-center mb-10">
        <h2 className="text-2xl font-black text-[#2D3142] tracking-tight mb-2">Thông Tin Giao Hàng</h2>
        <p className="text-[#898C9A] text-sm font-medium">Hoàn tất thủ tục để nhận ngay tuyệt tác nội thất</p>
      </div>

      <form className="space-y-7" onSubmit={(e) => e.preventDefault()}>
        
        {/* 1. Họ Tên */}
        <div className="space-y-2.5">
          <label className="text-[12px] font-bold text-[#898C9A] uppercase tracking-[0.15em] ml-2">
            Họ và tên
          </label>
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#D1D3D8] group-focus-within:text-[#D4AF37] transition-colors">
              <User size={20} strokeWidth={2.5} />
            </div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập tên người nhận..."
              className="w-full bg-[#FAFAFA] border-2 border-transparent focus:border-[#E8DCC4] text-[#2D3142] placeholder:text-[#D1D3D8] py-4.5 pl-14 pr-5 rounded-2xl outline-none transition-all font-semibold text-base"
            />
          </div>
        </div>

        {/* 2. Tỉnh / Thành Phố (Dropdown) */}
        <div className="space-y-2.5">
          <label className="text-[12px] font-bold text-[#898C9A] uppercase tracking-[0.15em] ml-2">
            Tỉnh / Thành Phố
          </label>
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#D1D3D8] group-focus-within:text-[#D4AF37] transition-colors z-10">
              <MapPin size={20} strokeWidth={2.5} />
            </div>
            <select
              value={selectedProvince}
              onChange={handleProvinceChange}
              disabled={loadingProvinces}
              className="w-full appearance-none bg-[#FAFAFA] border-2 border-transparent focus:border-[#E8DCC4] text-[#2D3142] py-4.5 pl-14 pr-12 rounded-2xl outline-none transition-all font-semibold text-base disabled:opacity-60 cursor-pointer"
            >
              <option value="" className="text-[#D1D3D8]">Chọn tỉnh/thành phố...</option>
              {provinces.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#D1D3D8]">
              {loadingProvinces ? <Loader2 size={20} className="animate-spin text-[#D4AF37]" /> : <Map size={20} />}
            </div>
          </div>
        </div>

        {/* 3. Phường / Xã / Địa chỉ (Searchable Select kết hợp input) */}
        <div className="space-y-2.5 relative">
          <label className="text-[12px] font-bold text-[#898C9A] uppercase tracking-[0.15em] ml-2">
            Phường / Xã / Số điện thoại / Địa chỉ
          </label>

          {/* TRẠNG THÁI EMPTY STATE KHI CHƯA CHỌN TỈNH */}
          {!selectedProvince ? (
            <div className="w-full py-8 bg-[#FAFAFA]/50 border-2 border-dashed border-[#E8DCC4]/50 rounded-2xl flex flex-col items-center justify-center gap-3 opacity-60 transition-opacity">
              <div className="w-12 h-12 bg-[#E8DCC4]/20 rounded-full flex items-center justify-center text-[#D4AF37]">
                <Navigation size={22} strokeWidth={2} />
              </div>
              <p className="text-[#898C9A] text-sm font-medium italic">
                Đang chờ vị trí Tỉnh / Thành phố...
              </p>
            </div>
          ) : (
            // Form Nhập Địa Chỉ (Active)
            <div className="relative group animate-in fade-in zoom-in-95 duration-400">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#D1D3D8] group-focus-within:text-[#D4AF37] transition-colors">
                <Search size={20} strokeWidth={2.5} />
              </div>
              <input
                ref={addressInputRef}
                type="text"
                value={addressRaw}
                onChange={handleAddressChange}
                onFocus={() => setShowWardSuggestions(true)}
                placeholder="VD: Số nhà, Đường, Tên Phường..."
                className={`w-full bg-[#FAFAFA] border-2 border-transparent focus:border-[#E8DCC4] text-[#2D3142] placeholder:text-[#D1D3D8] py-4.5 pl-14 pr-12 rounded-2xl outline-none transition-all font-semibold text-base ${
                  selectedWard ? 'ring-2 ring-emerald-500/20 bg-emerald-50/10' : ''
                }`}
              />
              
              {selectedWard && (
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500">
                  <CheckCircle2 size={20} strokeWidth={2.5} />
                </div>
              )}

              {/* Suggestions Dropdown */}
              {showWardSuggestions && addressRaw.trim().length > 0 && !selectedWard && (
                <div className="absolute z-50 top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-[#FAFAFA] overflow-hidden max-h-56 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-2">
                  {loadingWards ? (
                    <div className="p-4 text-center text-[#898C9A] text-sm flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-[#D4AF37]" /> Tải dữ liệu phường...
                    </div>
                  ) : filteredWards.length > 0 ? (
                    <div className="space-y-1">
                      <div className="px-3 py-2 text-[10px] font-bold text-[#898C9A] uppercase tracking-widest">
                        Gợi ý Phường / Xã thuộc {selectedProvinceName}
                      </div>
                      {filteredWards.map(ward => (
                        <button
                          key={ward.code}
                          type="button"
                          onClick={() => selectWard(ward)}
                          className="w-full text-left px-4 py-3 hover:bg-[#FAFAFA] rounded-xl flex items-center gap-3 transition-colors group/item"
                        >
                          <Navigation size={16} className="text-[#D1D3D8] group-hover/item:text-[#D4AF37]" />
                          <span className="font-semibold text-[#2D3142] text-sm">{ward.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-[#898C9A] text-sm font-medium">
                      Không tìm thấy phường/xã nào.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nút Đặt Mua */}
        <div className="pt-6">
          <button
            className={`w-full py-5 rounded-2xl font-bold text-lg tracking-wide transition-all shadow-xl active:scale-[0.98] ${
              fullName && selectedProvince && selectedWard
                ? 'bg-[#2D3142] hover:bg-[#1a1c26] text-white shadow-[#2D3142]/20'
                : 'bg-[#D1D3D8]/30 text-[#898C9A] cursor-not-allowed shadow-none'
            }`}
          >
            TIẾN HÀNH ĐẶT HÀNG
          </button>
        </div>

      </form>
    </div>
  );
}
