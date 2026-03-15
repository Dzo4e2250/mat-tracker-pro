/**
 * @file ProfileSection.tsx
 * @description Profilna sekcija za Settings stran (izvlečeno iz ProfileSettingsModal)
 */

import { useState, useEffect, useRef } from 'react';
import { Camera, Loader2, Eye, EyeOff, User, Save, PenTool, Bot, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Profile } from '@/integrations/supabase/types';
import AvatarEditor from '@/components/AvatarEditor';
import AISettingsSection from '@/components/AISettingsSection';

interface ProfileSectionProps {
  profile: Profile;
  onProfileUpdate: () => void;
}

export default function ProfileSection({ profile, onProfileUpdate }: ProfileSectionProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signaturePath, setSignaturePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const resolveSignatureUrl = async (path: string | null) => {
    if (!path) {
      setSignatureUrl(null);
      setSignaturePath(null);
      return;
    }
    if (path.startsWith('http')) {
      const parts = path.split('/avatars/');
      if (parts[1]) path = decodeURIComponent(parts[1]);
    }
    setSignaturePath(path);
    const { data } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
    setSignatureUrl(data?.signedUrl || null);
  };

  useEffect(() => {
    setFirstName(profile.first_name || '');
    setLastName(profile.last_name || '');
    setPhone(profile.phone || '');
    setAvatarUrl(profile.avatar_url || null);
    resolveSignatureUrl(profile.signature_url || null);
  }, [profile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Prosim izberite slikovno datoteko'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Slika je prevelika (max 10MB)'); return; }
    setSelectedFile(file);
    setShowAvatarEditor(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarEditorSave = async (blob: Blob) => {
    setIsUploadingAvatar(true);
    try {
      const fileName = `${profile.id}/${Date.now()}.jpg`;
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/avatars/')[1];
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath]);
      }
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
      onProfileUpdate();
      toast.success('Slika profila posodobljena');
      setShowAvatarEditor(false);
      setSelectedFile(null);
    } catch (error: any) {
      toast.error(error.message || 'Napaka pri nalaganju slike');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSignatureSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Prosim izberite slikovno datoteko'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Slika je prevelika (max 5MB)'); return; }
    setIsUploadingSignature(true);
    try {
      const fileName = `${profile.id}/signature-${Date.now()}.png`;
      if (signaturePath) await supabase.storage.from('avatars').remove([signaturePath]);
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from('profiles').update({ signature_url: fileName }).eq('id', profile.id);
      if (updateError) throw updateError;
      await resolveSignatureUrl(fileName);
      onProfileUpdate();
      toast.success('Podpis posodobljen');
    } catch (error: any) {
      toast.error(error.message || 'Napaka pri nalaganju podpisa');
    } finally {
      setIsUploadingSignature(false);
      if (signatureInputRef.current) signatureInputRef.current.value = '';
    }
  };

  const handleRemoveSignature = async () => {
    if (!signaturePath) return;
    try {
      await supabase.storage.from('avatars').remove([signaturePath]);
      await supabase.from('profiles').update({ signature_url: null }).eq('id', profile.id);
      setSignatureUrl(null);
      setSignaturePath(null);
      onProfileUpdate();
      toast.success('Podpis odstranjen');
    } catch (error: any) {
      toast.error(error.message || 'Napaka pri brisanju podpisa');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showPasswordSection && newPassword) {
      if (newPassword.length < 8) { toast.error('Geslo mora imeti vsaj 8 znakov'); return; }
      if (newPassword !== confirmPassword) { toast.error('Gesli se ne ujemata'); return; }
    }
    setIsLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ first_name: firstName, last_name: lastName, phone: phone || null })
        .eq('id', profile.id);
      if (profileError) throw profileError;
      if (showPasswordSection && newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
        if (passwordError) throw passwordError;
      }
      onProfileUpdate();
      toast.success('Profil uspešno posodobljen');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (error: any) {
      toast.error(error.message || 'Napaka pri shranjevanju');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar + Basic Info - side by side on desktop */}
        <div className="md:grid md:grid-cols-[auto_1fr] md:gap-8">
          {/* Avatar */}
          <div className="flex flex-col items-center md:items-start">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Spremeni sliko profila"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-gray-400" />
              )}
              {isUploadingAvatar ? (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-white" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-white" />
                </div>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <p className="text-sm text-gray-500 mt-2">Kliknite za spremembo slike</p>
          </div>

          {/* Basic Info */}
          <div className="space-y-4 mt-6 md:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Ime</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Vnesite ime" required />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Priimek</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Vnesite priimek" required />
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Telefonska številka</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="+386 XX XXX XXX" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Email</label>
                <input type="email" value={profile.email} className="w-full p-3 border rounded-lg bg-gray-50 text-gray-500 disabled:cursor-not-allowed" disabled />
                <p className="text-xs text-gray-500 mt-1">Email ni mogoče spremeniti</p>
              </div>
            </div>
          </div>
        </div>

        {/* Signature for contracts */}
        <div className="border-t pt-4">
          <label className="text-sm text-gray-600 mb-2 block font-medium flex items-center gap-2">
            <PenTool size={16} /> Podpis (za pogodbe)
          </label>
          {signatureUrl ? (
            <div className="space-y-2">
              <div className="border rounded-lg p-3 bg-gray-50 flex items-center justify-center">
                <img src={signatureUrl} alt="Podpis" className="max-h-20 object-contain" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => signatureInputRef.current?.click()} className="flex-1 py-2 text-sm border rounded-lg text-blue-600 hover:bg-blue-50">Zamenjaj</button>
                <button type="button" onClick={handleRemoveSignature} className="flex-1 py-2 text-sm border rounded-lg text-red-600 hover:bg-red-50">Odstrani</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => signatureInputRef.current?.click()} disabled={isUploadingSignature} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-2">
              {isUploadingSignature ? (<><Loader2 size={18} className="animate-spin" /> Nalagam...</>) : (<><PenTool size={18} /> Nalozi sliko podpisa</>)}
            </button>
          )}
          <input ref={signatureInputRef} type="file" accept="image/*" onChange={handleSignatureSelect} className="hidden" />
          <p className="text-xs text-gray-500 mt-1">Slika podpisa se uporabi na generirani pogodbi (PNG s prosojnim ozadjem)</p>
        </div>

        {/* Password */}
        <div className="border-t pt-4">
          <button type="button" onClick={() => setShowPasswordSection(!showPasswordSection)} className="text-blue-600 text-sm font-medium flex items-center gap-2" aria-expanded={showPasswordSection}>
            <ChevronRight size={16} className={`transition-transform duration-200 ${showPasswordSection ? 'rotate-90' : ''}`} />
            {showPasswordSection ? 'Skrij spremembo gesla' : 'Spremeni geslo'}
          </button>
          {showPasswordSection && (
            <div className="mt-4 space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Novo geslo</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-3 border rounded-lg pr-10" placeholder="Vnesite novo geslo" minLength={8} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Najmanj 8 znakov</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Potrdi geslo</label>
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Ponovite geslo" />
              </div>
            </div>
          )}
        </div>

        {/* AI Settings */}
        <div className="border-t pt-4">
          <button type="button" onClick={() => setShowAISettings(!showAISettings)} className="text-indigo-600 text-sm font-medium flex items-center gap-2" aria-expanded={showAISettings}>
            <ChevronRight size={16} className={`transition-transform duration-200 ${showAISettings ? 'rotate-90' : ''}`} />
            <Bot size={16} />
            {showAISettings ? 'Skrij AI nastavitve' : 'AI nastavitve (skeniranje vizitk)'}
          </button>
          {showAISettings && (
            <div className="mt-4 animate-in fade-in duration-200">
              <AISettingsSection userId={profile.id} />
            </div>
          )}
        </div>

        {/* Submit */}
        <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2">
          {isLoading ? (<><Loader2 size={20} className="animate-spin" /> Shranjujem...</>) : (<><Save size={20} /> Shrani spremembe</>)}
        </button>
      </form>

      {showAvatarEditor && selectedFile && (
        <AvatarEditor imageFile={selectedFile} onSave={handleAvatarEditorSave} onCancel={() => { setShowAvatarEditor(false); setSelectedFile(null); }} isSaving={isUploadingAvatar} />
      )}
    </>
  );
}
