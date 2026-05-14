'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronRight, ListTree, Save, Loader2 } from 'lucide-react';
import {
  BLOG_UNCATEGORIZED_SLUG,
  blogPostPathFromSlugs,
  blogTopicListingPath,
  categoryPublicPath,
  productPublicPath,
} from '@/lib/client-paths';

const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace(/\/api\/?$/, '');

// ── Helpers ────────────────────────────────────────────────────────────────
function getToken(): string {
  try {
    const raw = localStorage.getItem('HDG-auth-storage');
    return raw ? JSON.parse(raw)?.state?.token ?? '' : '';
  } catch { return ''; }
}

function slugify(s = '') {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s\/-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-');
}

function toInt(v: any, d = 0): number {
  return Number.isFinite(Number(v)) ? Number(v) : d;
}

function canonicalUrlForSource(
  type: string,
  referenceId: string | number | '',
  src: { categories: any[]; topics: any[]; products: any[]; posts: any[] }
): string | null {
  const ref = referenceId !== '' && referenceId != null ? toInt(referenceId, 0) : 0;
  if (!ref || type === 'custom' || type === 'group') return null;
  if (type === 'post' || type === 'page') {
    const p = src.posts.find((x: any) => x.id === ref);
    if (!p) return null;
    const topicSlug = p.topic_slug ?? BLOG_UNCATEGORIZED_SLUG;
    const slug = p.slug || slugify(p.title || '');
    return blogPostPathFromSlugs(slug, topicSlug);
  }
  if (type === 'category') {
    const c = src.categories.find((x: any) => x.id === ref);
    return c ? categoryPublicPath(c.slug || slugify(c.name)) : null;
  }
  if (type === 'topic') {
    const t = src.topics.find((x: any) => x.id === ref);
    return t ? blogTopicListingPath(t.slug || slugify(t.name)) : null;
  }
  if (type === 'product') {
    const pr = src.products.find((x: any) => x.id === ref);
    return pr ? productPublicPath(pr.slug || slugify(pr.name)) : null;
  }
  return null;
}

async function apiFetch(path: string, { method = 'GET', body }: { method?: string; body?: any } = {}) {
  const t = typeof window !== 'undefined' ? getToken() : '';
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j?.message || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

const inputClass =
  'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all';
const labelClass = 'block text-[12px] font-bold text-slate-600 uppercase tracking-wide mb-1.5';
const sectionTitleClass = 'block text-[12px] font-black text-slate-500 uppercase tracking-widest mb-4';

// ── Component ──────────────────────────────────────────────────────────────
export default function AdminMenuCreatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [existingMenus, setExistingMenus] = useState<any[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [form, setForm] = useState({
    name: '',
    link: '',
    type: 'custom',
    position: 'header',
    parent_id: '',
    sort_order: 0,
    status: true,
    reference_id: '',
    autoLink: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/menus?position=${encodeURIComponent(form.position)}&status=1`);
        setExistingMenus(Array.isArray(data) ? data : []);
      } catch {}
    })();
  }, [form.position]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingSources(true);
        const data = await apiFetch('/admin/menus/resources');
        if (!alive) return;
        setCategories(data?.categories || []);
        setTopics(data?.topics || []);
        setProducts(data?.products || []);
        setPosts(data?.posts || []);
      } catch {} finally { if (alive) setLoadingSources(false); }
    })();
    return () => { alive = false; };
  }, []);

  const parentOptions = useMemo(() => {
    return existingMenus.map(m => ({ id: m.id, label: m.name }));
  }, [existingMenus]);

  const isGroup = form.type === 'group';

  const filteredSource = useMemo(() => {
    const q = (filter || '').toLowerCase().trim();
    const match = (s: any) => String(s || '').toLowerCase().includes(q);
    if (form.type === 'category') return categories.filter(x => match(x.name));
    if (form.type === 'topic')    return topics.filter(x => match(x.name));
    if (form.type === 'product')  return products.filter(x => match(x.name));
    if (form.type === 'post')     return posts.filter(x => match(x.title || x.name));
    return [];
  }, [form.type, filter, categories, topics, products, posts]);

  function pickSourceItem(item: any) {
    if (!item) return;
    const name = item.name || item.title || '';
    const slug = item.slug || slugify(name);
    let link = '/';
    if (form.type === 'category') link = categoryPublicPath(slug);
    else if (form.type === 'topic')   link = blogTopicListingPath(slug);
    else if (form.type === 'product') link = productPublicPath(slug);
    else if (form.type === 'post') {
      const topicSlug = (item as { topic_slug?: string }).topic_slug ?? BLOG_UNCATEGORIZED_SLUG;
      link = blogPostPathFromSlugs(slug, topicSlug);
    }
    setForm(f => ({ ...f, name, link, reference_id: item.id, autoLink: false }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    let finalLink = (form.link || '').trim();
    const canonical = !isGroup
      ? canonicalUrlForSource(form.type, form.reference_id, {
          categories,
          topics,
          products,
          posts,
        })
      : null;
    if (canonical) {
      finalLink = canonical;
    } else if (!isGroup && !finalLink && form.name.trim()) {
      finalLink = `/${slugify(form.name)}`;
    }
    if (!isGroup && !finalLink) finalLink = '/';

    const payload: any = {
      name:       (form.name || '').trim(),
      position:   form.position || 'header',
      sort_order: toInt(form.sort_order, 0),
      items: [],
    };

    if (!payload.name) { setErr('Vui lòng nhập tên menu.'); return; }

    const parentMenuId =
      form.parent_id !== '' && form.parent_id != null ? toInt(form.parent_id, 0) : 0;

    try {
      setSaving(true);

      if (isGroup) {
        await apiFetch('/admin/menus', { method: 'POST', body: payload });
        router.push('/admin/menus');
        return;
      }

      const newRow = {
        title:        payload.name,
        type:         form.type === 'custom' ? 'custom' : form.type,
        url:          finalLink,
        reference_id: form.reference_id ? toInt(form.reference_id) : null,
        parent_id:    null as number | null,
        sort_order:   toInt(form.sort_order, 0),
        is_active:    form.status,
      };

      if (parentMenuId > 0) {
        const detail = await apiFetch(`/admin/menus/${parentMenuId}`);
        const existing: any[] = Array.isArray(detail.items) ? detail.items : [];
        const synced: Array<{
          id?: number
          title: string
          type: string
          reference_id: number | null
          url: string | null
          parent_id: number | null
          sort_order: number
          is_active: boolean
        }> = existing.map((it: any) => ({
          id: it.id,
          title: it.title,
          type: it.type,
          reference_id: it.reference_id ?? null,
          url: it.url ?? null,
          parent_id: it.parent_id ?? null,
          sort_order: toInt(it.sort_order, 0),
          is_active: it.is_active === true || it.is_active === 1 || it.is_active === '1',
        }));
        synced.push({
          title: newRow.title,
          type: newRow.type,
          url: newRow.url,
          reference_id: newRow.reference_id,
          parent_id: null,
          sort_order: newRow.sort_order,
          is_active: newRow.is_active,
        });
        await apiFetch(`/admin/menus/${parentMenuId}/sync`, {
          method: 'POST',
          body: { items: synced },
        });
      } else {
        payload.items = [
          {
            ...newRow,
            temp_id: 'tmp_1',
            created_at: new Date().toISOString(),
          },
        ];
        await apiFetch('/admin/menus', { method: 'POST', body: payload });
      }

      router.push('/admin/menus');
    } catch (e2: any) {
      setErr(e2.message || 'Tạo menu thất bại.');
    } finally {
      setSaving(false);
    }
  }

  const typeTile = (active: boolean) =>
    `p-3 rounded-xl border-2 transition-all text-left ${
      active
        ? 'border-[#ed2a2a] bg-red-50/80 shadow-md shadow-red-500/10'
        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
    }`;

  return (
    <form onSubmit={submit} className="max-w-4xl mx-auto space-y-5 pb-28 lg:pb-10 animate-in fade-in duration-300">
      {/* Sticky header — giống Categories / admin */}
      <div className="sticky top-0 z-40 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm lg:p-5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/menus')}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-all hover:bg-slate-100 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <span>Admin</span>
              <ChevronRight className="h-3 w-3" />
              <button type="button" onClick={() => router.push('/admin/menus')} className="hover:text-slate-600">
                Menu
              </button>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#ed2a2a]">Thêm mới</span>
            </div>
            <h1 className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-800">
              <ListTree className="h-5 w-5 text-[#ed2a2a]" />
              Thêm menu mới
            </h1>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Tạo mục điều hướng cho website
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="hidden items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 sm:flex"
          >
            Huỷ
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ed2a2a] px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(237,42,42,0.35)] transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-initial"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Tạo menu
          </button>
        </div>
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{err}</span>
        </div>
      )}

      <div className="divide-y divide-slate-100 rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-100 ring-1 ring-slate-100">
        {/* Bước 1 */}
        <div className="p-6 lg:p-8">
          <span className={sectionTitleClass}>1. Chọn loại menu</span>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
            {[
              { v: 'custom',   label: 'Tự nhập',  icon: '✏️' },
              { v: 'product',  label: 'Sản phẩm', icon: '🍜' },
              { v: 'category', label: 'Danh mục', icon: '📁' },
              { v: 'post',     label: 'Bài viết', icon: '📰' },
              { v: 'topic',    label: 'Chủ đề',   icon: '🏷️' },
              { v: 'group',    label: 'Nhóm',     icon: '📂' },
            ].map(o => (
              <button
                type="button"
                key={o.v}
                onClick={() => { setForm(f => ({ ...f, type: o.v, link: '', reference_id: '' })); setFilter(''); }}
                className={typeTile(form.type === o.v)}
              >
                <div className="mb-1 text-xl">{o.icon}</div>
                <div className={`text-xs font-bold ${form.type === o.v ? 'text-[#ed2a2a]' : 'text-slate-700'}`}>
                  {o.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {!['custom', 'group'].includes(form.type) && (
          <div className="p-6 lg:p-8">
            <span className={sectionTitleClass}>
              2. Chọn {form.type === 'category' ? 'danh mục' : form.type === 'topic' ? 'chủ đề' : form.type === 'product' ? 'sản phẩm' : 'bài viết'}
            </span>
            <div className="space-y-3">
              <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder={`Tìm ${form.type === 'category' ? 'danh mục' : form.type === 'topic' ? 'chủ đề' : form.type === 'product' ? 'sản phẩm' : 'bài viết'}...`}
                className={inputClass}
              />
              <div className="max-h-64 overflow-auto rounded-2xl border border-slate-200">
                {loadingSources ? (
                  <div className="p-4 text-center text-sm font-semibold text-slate-500">Đang tải...</div>
                ) : filteredSource.length === 0 ? (
                  <div className="p-4 text-center text-sm font-semibold text-slate-500">Không tìm thấy</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredSource.map((it: any) => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => pickSourceItem(it)}
                        className={`w-full px-4 py-3 text-left transition-colors hover:bg-red-50/80 ${
                          String(form.reference_id) === String(it.id) ? 'bg-red-50' : ''
                        }`}
                      >
                        <div className="font-semibold text-slate-900">{it.name || it.title}</div>
                        <div className="mt-0.5 font-mono text-xs text-slate-500">/{it.slug}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-6 lg:p-8">
          <span className={sectionTitleClass}>
            {['custom', 'group'].includes(form.type) ? '2.' : '3.'} Thông tin menu
          </span>
          <div className="space-y-5">
            <div>
              <label className={labelClass}>
                Tên menu <span className="text-[#ed2a2a]">*</span>
              </label>
              <input
                value={form.name}
                onChange={e => {
                  const newName = e.target.value;
                  setForm(f => {
                    const updated = { ...f, name: newName };
                    if (f.autoLink && f.type === 'custom' && !isGroup && newName.trim()) {
                      updated.link = `/${slugify(newName)}`;
                    }
                    return updated;
                  });
                }}
                placeholder="Ví dụ: Thực đơn, Blog, Khuyến mãi..."
                className={inputClass}
              />
            </div>

            {!isGroup && (
              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label className={labelClass.replace('mb-1.5', 'mb-0')}>
                    Đường dẫn (Link)
                    {form.reference_id && (
                      <span className="ml-2 text-[11px] font-semibold normal-case text-emerald-600">
                        ✓ Tự động từ nguồn
                      </span>
                    )}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.autoLink}
                      onChange={e => {
                        const autoLink = e.target.checked;
                        setForm(f => ({
                          ...f,
                          autoLink,
                          link: autoLink && f.name.trim() ? `/${slugify(f.name)}` : f.link,
                        }));
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-[#ed2a2a] focus:ring-[#ed2a2a]"
                    />
                    Tự động từ tên
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    value={form.link}
                    onChange={e => setForm(f => ({ ...f, link: e.target.value, autoLink: false }))}
                    placeholder={form.autoLink ? 'Tự động từ tên...' : '/duong-dan hoặc https://...'}
                    disabled={form.autoLink}
                    className={`${inputClass} flex-1 disabled:bg-slate-100 disabled:text-slate-500`}
                  />
                  {!form.autoLink && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, link: `/${slugify(f.name || '')}` }))}
                      className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Từ tên
                    </button>
                  )}
                </div>
                {form.link && (
                  <p className="mt-2 font-mono text-xs font-semibold text-[#ed2a2a]">→ {form.link}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className={labelClass}>Vị trí</label>
                <select
                  value={form.position}
                  onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                  className={inputClass}
                >
                  <option value="header">Header</option>
                  <option value="footer">Footer</option>
                  <option value="mobile">Mobile</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Thứ tự <span className="font-normal normal-case text-slate-400">(nhỏ = trái)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Menu cha</label>
                <select
                  value={form.parent_id ?? ''}
                  onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">— Menu gốc —</option>
                  {parentOptions.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center justify-between text-left text-sm font-black uppercase tracking-widest text-slate-600 hover:text-slate-900"
          >
            <span>Tùy chọn nâng cao</span>
            <ChevronDown className={`h-5 w-5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          {showAdvanced && (
            <div className="mt-5 grid grid-cols-1 gap-5 border-t border-slate-100 pt-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>Thứ tự hiển thị</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  className={inputClass}
                />
                <p className="mt-1 text-xs font-medium text-slate-500">Số nhỏ hiển thị trước trên header</p>
              </div>
              <div>
                <label className={labelClass}>Trạng thái</label>
                <div className="flex h-11 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, status: !f.status }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.status ? 'bg-[#ed2a2a]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.status ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-semibold text-slate-600">
                    {form.status ? 'Hiển thị' : 'Ẩn'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
