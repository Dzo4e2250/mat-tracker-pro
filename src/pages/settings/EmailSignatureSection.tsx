/**
 * @file EmailSignatureSection.tsx
 * @description Obrazec za email podpis z živim predogledom
 */

import { useState, useEffect, useRef } from 'react';
import { Loader2, Save, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEmailSignature } from '@/hooks/useEmailSignature';
import { supabase } from '@/integrations/supabase/client';

interface EmailSignatureSectionProps {
  userId: string;
}

export default function EmailSignatureSection({ userId }: EmailSignatureSectionProps) {
  const { signature, isLoading, upsertSignature } = useEmailSignature(userId);

  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (signature) {
      setFullName(signature.full_name || '');
      setTitle(signature.title || '');
      setPhone(signature.phone || '');
      setCompanyName(signature.company_name || '');
      setCompanyAddress(signature.company_address || '');
      setWebsite(signature.website || '');
      setLogoUrl(signature.logo_url || null);
    }
  }, [signature]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Izberite slikovno datoteko'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Slika je prevelika (max 2MB)'); return; }

    setIsUploading(true);
    try {
      const fileName = `${userId}/email-logo-${Date.now()}.${file.name.split('.').pop()}`;

      // Delete old logo
      if (logoUrl) {
        const oldPath = logoUrl.includes('/avatars/') ? logoUrl.split('/avatars/')[1] : null;
        if (oldPath) await supabase.storage.from('avatars').remove([decodeURIComponent(oldPath)]);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setLogoUrl(publicUrl);
      toast.success('Logo naložen');
    } catch (error: any) {
      toast.error(error.message || 'Napaka pri nalaganju');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
  };

  const handleSave = async () => {
    try {
      await upsertSignature.mutateAsync({
        full_name: fullName,
        title,
        phone,
        company_name: companyName,
        company_address: companyAddress,
        website,
        logo_url: logoUrl,
        is_active: true,
      });
      toast.success('Podpis shranjen');
    } catch (error: any) {
      toast.error(error.message || 'Napaka pri shranjevanju');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const hasContent = fullName || title || phone || companyName;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Nastavite podpis ki se doda na konec ponudb (za "Lep pozdrav,").
      </p>

      {/* Form fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Ime in priimek</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="Janez Novak" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Naziv / funkcija</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="Komercialist" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Telefon</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="+386 40 123 456" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Ime podjetja</label>
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="Podjetje d.o.o." />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Naslov podjetja</label>
            <input type="text" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="Ulica 1, 1000 Ljubljana" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Spletna stran</label>
            <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="https://www.podjetje.si" />
          </div>
        </div>

        {/* Logo upload */}
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Logo podjetja</label>
          {logoUrl ? (
            <div className="flex items-center gap-3">
              <div className="border rounded-lg p-2 bg-gray-50">
                <img src={logoUrl} alt="Logo" className="max-h-12 object-contain" />
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 hover:text-blue-700">Zamenjaj</button>
              <button onClick={handleRemoveLogo} className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1">
                <Trash2 size={14} /> Odstrani
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isUploading ? 'Nalagam...' : 'Naloži logo'}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          <p className="text-xs text-gray-500 mt-1">Priporočena velikost: 200x60px, PNG ali JPG</p>
        </div>
      </div>

      {/* Live preview - always visible on desktop beside form */}
      {hasContent && (
        <div className="border-t pt-4">
          <label className="text-sm text-gray-600 mb-2 block font-medium">Predogled podpisa</label>
          <div className="border rounded-lg p-4 bg-white" style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px' }}>
            <p style={{ margin: '0 0 10px 0' }}>Lep pozdrav,</p>
            <div style={{ borderTop: '2px solid #1e3a5f', paddingTop: '10px', marginTop: '10px' }}>
              {fullName && <p style={{ margin: '0', fontWeight: 'bold', color: '#1e3a5f' }}>{fullName}</p>}
              {title && <p style={{ margin: '2px 0', color: '#666' }}>{title}</p>}
              {phone && <p style={{ margin: '2px 0' }}>Tel: {phone}</p>}
              {companyName && <p style={{ margin: '8px 0 2px', fontWeight: 'bold' }}>{companyName}</p>}
              {companyAddress && <p style={{ margin: '2px 0', color: '#666' }}>{companyAddress}</p>}
              {website && <p style={{ margin: '2px 0' }}><span style={{ color: '#0066cc' }}>{website}</span></p>}
              {logoUrl && <img src={logoUrl} alt="Logo" style={{ maxHeight: '40px', marginTop: '8px' }} />}
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={upsertSignature.isPending}
        className="w-full md:w-auto md:px-8 py-3 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {upsertSignature.isPending ? (
          <><Loader2 size={20} className="animate-spin" /> Shranjujem...</>
        ) : (
          <><Save size={20} /> Shrani podpis</>
        )}
      </button>
    </div>
  );
}
