/**
 * @file ProfileSettingsModal.tsx
 * @description Modal za urejanje profila uporabnika (slika, ime, priimek, telefon, geslo)
 */

import { useState, useEffect, useRef } from 'react';
import { X, Settings, Camera, Loader2, Eye, EyeOff, User, Save, PenTool } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Profile } from '@/integrations/supabase/types';
import AvatarEditor from './AvatarEditor';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onProfileUpdate: () => void;
}

export default function ProfileSettingsModal({
  isOpen,
  onClose,
  profile,
  onProfileUpdate,
}: ProfileSettingsModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null); // display URL (signed)
  const [signaturePath, setSignaturePath] = useState<string | null>(null); // storage path
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);

  // Avatar editor state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);

  // Password change fields
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Resolve a signature path to a signed URL for display
  const resolveSignatureUrl = async (path: string | null) => {
    if (!path) {
      setSignatureUrl(null);
      setSignaturePath(null);
      return;
    }
    // If it's already a full URL (legacy data), extract path
    if (path.startsWith('http')) {
      const parts = path.split('/avatars/');
      if (parts[1]) {
        path = decodeURIComponent(parts[1]);
      }
    }
    setSignaturePath(path);
    const { data } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
    setSignatureUrl(data?.signedUrl || null);
  };

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
      setAvatarUrl(profile.avatar_url || null);
      resolveSignatureUrl(profile.signature_url || null);
    }
  }, [profile]);

  if (!isOpen || !profile) return null;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Prosim izberite slikovno datoteko');
      return;
    }

    // Allow larger files (up to 10MB) - we'll compress after cropping
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Slika je prevelika (max 10MB)');
      return;
    }

    // Open avatar editor
    setSelectedFile(file);
    setShowAvatarEditor(true);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAvatarEditorSave = async (blob: Blob) => {
    setIsUploadingAvatar(true);
    try {
      // Create unique filename
      const fileName = `${profile.id}/${Date.now()}.jpg`;

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload cropped avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      onProfileUpdate();
      toast.success('Slika profila posodobljena');

      // Close editor
      setShowAvatarEditor(false);
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      if (error.message?.includes('bucket') || error.message?.includes('Bucket')) {
        toast.error('Storage bucket "avatars" ne obstaja. Ustvarite ga v Supabase dashboardu.');
      } else {
        toast.error(error.message || 'Napaka pri nalaganju slike');
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarEditorCancel = () => {
    setShowAvatarEditor(false);
    setSelectedFile(null);
  };

  const handleSignatureSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Prosim izberite slikovno datoteko');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Slika je prevelika (max 5MB)');
      return;
    }

    setIsUploadingSignature(true);
    try {
      const fileName = `${profile.id}/signature-${Date.now()}.png`;

      // Delete old signature if exists
      if (signaturePath) {
        await supabase.storage.from('avatars').remove([signaturePath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      // Store relative path (not public URL) for security
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ signature_url: fileName })
        .eq('id', profile.id);

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

    // Validate password if changing
    if (showPasswordSection && newPassword) {
      if (newPassword.length < 8) {
        toast.error('Geslo mora imeti vsaj 8 znakov');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('Gesli se ne ujemata');
        return;
      }
    }

    setIsLoading(true);
    try {
      // Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Update password if provided
      if (showPasswordSection && newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passwordError) throw passwordError;
      }

      onProfileUpdate();
      toast.success('Profil uspešno posodobljen');

      // Reset password fields
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);

      onClose();
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Napaka pri shranjevanju');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset to original values
    setFirstName(profile.first_name || '');
    setLastName(profile.last_name || '');
    setPhone(profile.phone || '');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordSection(false);
    setShowAvatarEditor(false);
    setSelectedFile(null);
    resolveSignatureUrl(profile.signature_url || null);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
            <h3 className="font-bold flex items-center gap-2">
              <Settings size={20} />
              Nastavitve profila
            </h3>
            <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <div
                onClick={handleAvatarClick}
                className="relative w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profil"
                    className="w-full h-full object-cover"
                  />
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
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-sm text-gray-500 mt-2">Kliknite za spremembo slike</p>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Ime</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Vnesite ime"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Priimek</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Vnesite priimek"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Telefonska številka</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="+386 XX XXX XXX"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  className="w-full p-3 border rounded-lg bg-gray-50 text-gray-500"
                  disabled
                />
                <p className="text-xs text-gray-400 mt-1">Email ni mogoče spremeniti</p>
              </div>
            </div>

            {/* Signature Section */}
            <div className="border-t pt-4">
              <label className="text-sm text-gray-600 mb-2 block font-medium flex items-center gap-2">
                <PenTool size={16} />
                Podpis (za pogodbe)
              </label>
              {signatureUrl ? (
                <div className="space-y-2">
                  <div className="border rounded-lg p-3 bg-gray-50 flex items-center justify-center">
                    <img
                      src={signatureUrl}
                      alt="Podpis"
                      className="max-h-20 object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => signatureInputRef.current?.click()}
                      className="flex-1 py-2 text-sm border rounded-lg text-blue-600 hover:bg-blue-50"
                    >
                      Zamenjaj
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveSignature}
                      className="flex-1 py-2 text-sm border rounded-lg text-red-600 hover:bg-red-50"
                    >
                      Odstrani
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => signatureInputRef.current?.click()}
                  disabled={isUploadingSignature}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-2"
                >
                  {isUploadingSignature ? (
                    <><Loader2 size={18} className="animate-spin" /> Nalagam...</>
                  ) : (
                    <><PenTool size={18} /> Nalozi sliko podpisa</>
                  )}
                </button>
              )}
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                onChange={handleSignatureSelect}
                className="hidden"
              />
              <p className="text-xs text-gray-400 mt-1">Slika podpisa se uporabi na generirani pogodbi (PNG s prosojnim ozadjem)</p>
            </div>

            {/* Password Section */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-blue-600 text-sm font-medium"
              >
                {showPasswordSection ? 'Skrij spremembo gesla' : 'Spremeni geslo'}
              </button>

              {showPasswordSection && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Novo geslo</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-3 border rounded-lg pr-10"
                        placeholder="Vnesite novo geslo"
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Najmanj 8 znakov</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Potrdi geslo</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-3 border rounded-lg"
                      placeholder="Ponovite geslo"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Shranjujem...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Shrani spremembe
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Avatar Editor Modal */}
      {showAvatarEditor && selectedFile && (
        <AvatarEditor
          imageFile={selectedFile}
          onSave={handleAvatarEditorSave}
          onCancel={handleAvatarEditorCancel}
          isSaving={isUploadingAvatar}
        />
      )}
    </>
  );
}
