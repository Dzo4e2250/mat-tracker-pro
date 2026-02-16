/**
 * @file TaskDetailModal.tsx
 * @description Modal za prikaz in urejanje podrobnosti naloge s podporo za slike
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Building2, Calendar, Image, Trash2, Upload, Save, Pencil, Download, Truck, MapPin, FileText, Plus, Minus, Palette, Copy, Check, User, ClipboardPaste, ChevronDown } from 'lucide-react';
import type { TaskWithRelations } from '@/hooks/useTasks';
import type { TaskStatus } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { sl } from 'date-fns/locale';
import { generateDeliveryInfoPdf } from '@/components/deliveryInfo';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MatLocation {
  location: string;
  coordinates: string;
}

interface DeliveryInfo {
  parking: string;
  matCount: number;
  mats: MatLocation[];
  companyAddress: string;
  companyPostal?: string;
  companyCity?: string;
  companyName: string;
  reportGenerated: boolean;
  attachments?: string[];
  // New fields for PDF generation
  salesRep?: string;
  salesRepPhone?: string;
  customerNumber?: string;
  selectedContactId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  secondaryContactId?: string;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  secondaryContactEmail?: string;
  discount?: string;
  hasPhase?: boolean;
  expansionNotes?: string;
  locationDescription?: string;
  driverNotes?: string;
  images?: string[];
}

interface IzrisTaskData {
  supplier: string;
  orderType: string;
  backgroundColorCode: string;
  backgroundColorName: string;
  logoColorCode: string;
  logoColorName: string;
  isDesignerChoice: boolean;
  matType: string;
  mbwCode?: string;
  width: number;
  height: number;
  orientation: string;
  templatePath?: string;
  templateLabel?: string;
  title: string;
}

interface TaskDetailModalProps {
  task: TaskWithRelations;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: { title?: string; description?: string; attachments?: string[]; deliveryInfo?: DeliveryInfo }) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  isUpdating?: boolean;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'Za narediti', color: 'bg-gray-200 text-gray-700' },
  { value: 'in_progress', label: 'V procesiranju', color: 'bg-blue-200 text-blue-700' },
  { value: 'done', label: 'Opravljeno', color: 'bg-green-200 text-green-700' },
  { value: 'needs_help', label: 'Potrebujem pomoč', color: 'bg-orange-200 text-orange-700' },
];

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onUpdate,
  onStatusChange,
  onDelete,
  isUpdating,
}: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [attachments, setAttachments] = useState<string[]>(() => {
    const items = task.checklist_items as any;
    return items?.attachments || [];
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<HTMLDivElement>(null);

  // Izris task state
  const isIzrisTask = task.task_type === 'izris';
  const [titleCopied, setTitleCopied] = useState(false);
  const izrisData: IzrisTaskData | null = (() => {
    const items = task.checklist_items as any;
    return items?.izrisData || null;
  })();

  const handleCopyTitle = async () => {
    if (izrisData?.title) {
      await navigator.clipboard.writeText(izrisData.title);
      setTitleCopied(true);
      setTimeout(() => setTitleCopied(false), 2000);
    }
  };

  // Delivery info state (for delivery_info task type)
  const isDeliveryTask = task.task_type === 'delivery_info';
  const { profile } = useAuth();
  const pasteAreaRef = useRef<HTMLDivElement>(null);

  // Fetch contacts for the company (only for delivery_info tasks)
  const { data: companyContacts } = useQuery({
    queryKey: ['company-contacts', task.company_id],
    queryFn: async () => {
      if (!task.company_id) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, work_phone, email, role, is_primary, is_billing_contact')
        .eq('company_id', task.company_id)
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: isDeliveryTask && !!task.company_id,
  });

  // Handle contact selection from dropdown
  const handleContactSelect = (contactId: string) => {
    const contact = companyContacts?.find(c => c.id === contactId);
    if (contact) {
      const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
      const updated = {
        ...deliveryInfo,
        selectedContactId: contactId,
        contactName: fullName,
        contactPhone: contact.phone || '',
        contactEmail: contact.email || '',
      };
      setDeliveryInfo(updated);
      onUpdate(task.id, { deliveryInfo: updated });
    }
  };

  // Handle secondary contact selection
  const handleSecondaryContactSelect = (contactId: string) => {
    const contact = companyContacts?.find(c => c.id === contactId);
    if (contact) {
      const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
      const updated = {
        ...deliveryInfo,
        secondaryContactId: contactId,
        secondaryContactName: fullName,
        secondaryContactPhone: contact.phone || '',
        secondaryContactEmail: contact.email || '',
      };
      setDeliveryInfo(updated);
      onUpdate(task.id, { deliveryInfo: updated });
    }
  };

  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>(() => {
    const items = task.checklist_items as any;
    const company = task.company;

    return {
      parking: items?.parking || '',
      matCount: items?.matCount || 1,
      mats: items?.mats || [{ location: '', coordinates: '' }],
      companyAddress: items?.companyAddress || company?.address_street || '',
      companyPostal: items?.companyPostal || company?.address_postal || '',
      companyCity: items?.companyCity || company?.address_city || '',
      companyName: items?.companyName || company?.display_name || company?.name || '',
      reportGenerated: items?.reportGenerated || false,
      attachments: items?.attachments || [],
      // New fields - use full_name or combine first_name + last_name as fallback
      salesRep: items?.salesRep || profile?.full_name ||
        (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : ''),
      salesRepPhone: items?.salesRepPhone || profile?.phone || '',
      customerNumber: items?.customerNumber || '',
      selectedContactId: items?.selectedContactId || '',
      contactName: items?.contactName || '',
      contactPhone: items?.contactPhone || '',
      contactEmail: items?.contactEmail || '',
      secondaryContactId: items?.secondaryContactId || '',
      secondaryContactName: items?.secondaryContactName || '',
      secondaryContactPhone: items?.secondaryContactPhone || '',
      secondaryContactEmail: items?.secondaryContactEmail || '',
      discount: items?.discount || '',
      hasPhase: items?.hasPhase || false,
      expansionNotes: items?.expansionNotes || '',
      locationDescription: items?.locationDescription || '',
      driverNotes: items?.driverNotes || '',
      images: items?.images || [],
    };
  });

  // Update salesRep from profile when it loads (if not already set)
  useEffect(() => {
    if (isDeliveryTask && profile && !deliveryInfo.salesRep) {
      const salesRepName = profile.full_name ||
        (profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : '');
      setDeliveryInfo(prev => ({
        ...prev,
        salesRep: salesRepName,
        salesRepPhone: prev.salesRepPhone || profile.phone || '',
      }));
    }
  }, [isDeliveryTask, profile, deliveryInfo.salesRep]);

  // Handle clipboard paste for images
  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (!isDeliveryTask) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    if (imageItems.length === 0) return;

    e.preventDefault();

    imageItems.forEach(item => {
      const blob = item.getAsFile();
      if (!blob) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const updatedImages = [...(deliveryInfo.images || []), dataUrl];
          const updated = { ...deliveryInfo, images: updatedImages };
          setDeliveryInfo(updated);
          onUpdate(task.id, { deliveryInfo: updated });
        }
      };
      reader.readAsDataURL(blob);
    });
  }, [isDeliveryTask, deliveryInfo, task.id, onUpdate]);

  // Add paste event listener
  useEffect(() => {
    if (isDeliveryTask && isOpen) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [isDeliveryTask, isOpen, handlePaste]);

  // Remove delivery image
  const handleRemoveDeliveryImage = (index: number) => {
    const updatedImages = (deliveryInfo.images || []).filter((_, i) => i !== index);
    const updated = { ...deliveryInfo, images: updatedImages };
    setDeliveryInfo(updated);
    onUpdate(task.id, { deliveryInfo: updated });
  };

  // Update mat fields when count changes
  const handleMatCountChange = (count: number) => {
    const newCount = Math.max(1, Math.min(10, count));
    const currentMats = [...deliveryInfo.mats];

    if (newCount > currentMats.length) {
      // Add new mats
      for (let i = currentMats.length; i < newCount; i++) {
        currentMats.push({ location: '', coordinates: '' });
      }
    } else {
      // Remove extra mats
      currentMats.splice(newCount);
    }

    const updated = { ...deliveryInfo, matCount: newCount, mats: currentMats };
    setDeliveryInfo(updated);
    // Auto-save
    onUpdate(task.id, { deliveryInfo: updated });
  };

  const updateMatLocation = (index: number, field: 'location' | 'coordinates', value: string) => {
    const newMats = [...deliveryInfo.mats];
    newMats[index] = { ...newMats[index], [field]: value };
    const updated = { ...deliveryInfo, mats: newMats };
    setDeliveryInfo(updated);
  };

  const saveDeliveryInfo = () => {
    onUpdate(task.id, { deliveryInfo });
  };

  const updateParking = (value: string) => {
    const updated = { ...deliveryInfo, parking: value };
    setDeliveryInfo(updated);
  };

  // Generate driver report as PDF
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const generateDriverReport = async () => {
    setIsGeneratingPdf(true);
    try {
      const company = task.company;

      // Prepare form data for PDF
      const salesRepName = profile?.full_name ||
        (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : '');
      const pdfFormData = {
        salesRep: deliveryInfo.salesRep || salesRepName,
        salesRepPhone: deliveryInfo.salesRepPhone || profile?.phone || '',
        customerNumber: deliveryInfo.customerNumber || '',
        companyName: deliveryInfo.companyName || company?.display_name || company?.name || '',
        address: deliveryInfo.companyAddress || company?.address_street || '',
        postal: deliveryInfo.companyPostal || company?.address_postal || '',
        city: deliveryInfo.companyCity || company?.address_city || '',
        contactName: deliveryInfo.contactName || '',
        contactPhone: deliveryInfo.contactPhone || '',
        contactEmail: deliveryInfo.contactEmail || '',
        secondaryContactName: deliveryInfo.secondaryContactName,
        secondaryContactPhone: deliveryInfo.secondaryContactPhone,
        secondaryContactEmail: deliveryInfo.secondaryContactEmail,
        discount: deliveryInfo.discount || '',
        hasPhase: deliveryInfo.hasPhase || false,
        expansionNotes: deliveryInfo.expansionNotes || '',
        locationDescription: deliveryInfo.locationDescription || '',
        driverNotes: deliveryInfo.driverNotes || deliveryInfo.parking || '',
        images: deliveryInfo.images || [],
      };

      // Generate PDF
      const pdfBlob = await generateDeliveryInfoPdf(pdfFormData);

      // Download PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (company?.name || 'podjetje').replace(/[^a-zA-Z0-9čšžČŠŽ]/g, '_');
      link.download = `dostava_${safeName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Mark as generated
      const updated = { ...deliveryInfo, reportGenerated: true };
      setDeliveryInfo(updated);
      onUpdate(task.id, { deliveryInfo: updated });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Napaka pri generiranju PDF dokumenta');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Scroll to images when new image is added
  useEffect(() => {
    if (attachments.length > 0 && imagesRef.current) {
      imagesRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [attachments.length]);

  if (!isOpen) return null;

  const createdDate = format(new Date(task.created_at), 'd. MMMM yyyy, HH:mm', { locale: sl });
  const completedDate = task.completed_at
    ? format(new Date(task.completed_at), 'd. MMMM yyyy, HH:mm', { locale: sl })
    : null;

  const handleSave = () => {
    onUpdate(task.id, {
      title,
      description,
      attachments,
    });
    setIsEditing(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: string[] = [];
    let filesProcessed = 0;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          newAttachments.push(dataUrl);
        }
        filesProcessed++;

        // When all files are processed, update state and save
        if (filesProcessed === files.length) {
          const updatedAttachments = [...attachments, ...newAttachments];
          setAttachments(updatedAttachments);
          // Auto-save images immediately
          onUpdate(task.id, { attachments: updatedAttachments });
        }
      };
      reader.onerror = () => {
        console.error('Error reading file');
        filesProcessed++;
      };
      reader.readAsDataURL(file);
    });

    // Reset input to allow selecting same file again
    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    const updatedAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(updatedAttachments);
    // Auto-save when removing
    onUpdate(task.id, { attachments: updatedAttachments });
  };

  const handleDownloadImage = (dataUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `naloga-${task.title.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}-slika-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    attachments.forEach((dataUrl, index) => {
      setTimeout(() => handleDownloadImage(dataUrl, index), index * 200);
    });
  };

  const handleDelete = () => {
    if (confirm('Ali ste prepričani, da želite izbrisati nalogo?')) {
      onDelete(task.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Podrobnosti naloge</h2>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Uredi"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Status</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => onStatusChange(task.id, opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    task.status === opt.value
                      ? opt.color + ' ring-2 ring-offset-1 ring-gray-400'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Naslov */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Naslov</label>
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg font-medium text-gray-900">{task.title}</p>
            )}
          </div>

          {/* Opis */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Opis</label>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Dodaj opis..."
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">
                {task.description || <span className="text-gray-400 italic">Brez opisa</span>}
              </p>
            )}
          </div>

          {/* Podjetje */}
          {task.company && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="block text-sm font-medium text-gray-600 mb-2">Povezano podjetje</label>
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <Building2 size={16} className="text-gray-500" />
                <span>{task.company.display_name || task.company.name}</span>
              </div>
              {(task.company.address_street || task.company.address_city) && (
                <div className="text-sm text-gray-500 mt-1 ml-6">
                  {task.company.address_street && <span>{task.company.address_street}, </span>}
                  {task.company.address_postal && <span>{task.company.address_postal} </span>}
                  {task.company.address_city && <span>{task.company.address_city}</span>}
                </div>
              )}
            </div>
          )}

          {/* Delivery Info Form (only for delivery_info tasks) */}
          {isDeliveryTask && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 text-blue-700 font-medium">
                <Truck size={20} />
                <span>Informacije o dostavnem mestu</span>
              </div>

              {/* Prodajni zastopnik */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Prodajni zastopnik
                  </label>
                  <input
                    type="text"
                    value={deliveryInfo.salesRep || ''}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, salesRep: e.target.value })}
                    onBlur={saveDeliveryInfo}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Ime prodajalca..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Telefon zastopnika
                  </label>
                  <input
                    type="text"
                    value={deliveryInfo.salesRepPhone || ''}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, salesRepPhone: e.target.value })}
                    onBlur={saveDeliveryInfo}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Telefonska številka..."
                  />
                </div>
              </div>

              {/* Naslov firme */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600">
                  <Building2 size={14} className="inline mr-1" />
                  Naslov firme
                </label>
                <input
                  type="text"
                  value={deliveryInfo.companyAddress || ''}
                  onChange={(e) => setDeliveryInfo({ ...deliveryInfo, companyAddress: e.target.value })}
                  onBlur={saveDeliveryInfo}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Ulica in hišna številka..."
                />
                <input
                  type="text"
                  value={deliveryInfo.companyPostal || ''}
                  onChange={(e) => setDeliveryInfo({ ...deliveryInfo, companyPostal: e.target.value })}
                  onBlur={saveDeliveryInfo}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Poštna številka"
                />
                <input
                  type="text"
                  value={deliveryInfo.companyCity || ''}
                  onChange={(e) => setDeliveryInfo({ ...deliveryInfo, companyCity: e.target.value })}
                  onBlur={saveDeliveryInfo}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Mesto"
                />
              </div>

              {/* Šifra stranke */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Šifra stranke (DC number)
                </label>
                <input
                  type="text"
                  value={deliveryInfo.customerNumber || ''}
                  onChange={(e) => setDeliveryInfo({ ...deliveryInfo, customerNumber: e.target.value })}
                  onBlur={saveDeliveryInfo}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="DC-XXXXX..."
                />
              </div>

              {/* Kontaktna oseba */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600">
                  <User size={14} className="inline mr-1" />
                  Kontaktna oseba za lokacijo
                </label>
                {companyContacts && companyContacts.length > 0 ? (
                  <select
                    value={deliveryInfo.selectedContactId || ''}
                    onChange={(e) => handleContactSelect(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="">-- Izberi kontakt --</option>
                    {companyContacts.map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {[contact.first_name, contact.last_name].filter(Boolean).join(' ')}
                        {contact.role ? ` (${contact.role})` : ''}
                        {contact.is_primary ? ' ★' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={deliveryInfo.contactName || ''}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, contactName: e.target.value })}
                    onBlur={saveDeliveryInfo}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Ime in priimek..."
                  />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={deliveryInfo.contactPhone || ''}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, contactPhone: e.target.value })}
                    onBlur={saveDeliveryInfo}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    placeholder="Telefon..."
                    readOnly={!!deliveryInfo.selectedContactId}
                  />
                  <input
                    type="text"
                    value={deliveryInfo.contactEmail || ''}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, contactEmail: e.target.value })}
                    onBlur={saveDeliveryInfo}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    placeholder="Email..."
                    readOnly={!!deliveryInfo.selectedContactId}
                  />
                </div>
              </div>

              {/* Kontakt za račune - opcijsko */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600">
                  Kontakt za račune/plačila (opcijsko)
                </label>
                {companyContacts && companyContacts.length > 0 ? (
                  <select
                    value={deliveryInfo.secondaryContactId || ''}
                    onChange={(e) => handleSecondaryContactSelect(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="">-- Izberi kontakt --</option>
                    {companyContacts.map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {[contact.first_name, contact.last_name].filter(Boolean).join(' ')}
                        {contact.position ? ` (${contact.position})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={deliveryInfo.secondaryContactName || ''}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, secondaryContactName: e.target.value })}
                    onBlur={saveDeliveryInfo}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Ime in priimek..."
                  />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={deliveryInfo.secondaryContactPhone || ''}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, secondaryContactPhone: e.target.value })}
                    onBlur={saveDeliveryInfo}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    placeholder="Telefon..."
                    readOnly={!!deliveryInfo.secondaryContactId}
                  />
                  <input
                    type="text"
                    value={deliveryInfo.secondaryContactEmail || ''}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, secondaryContactEmail: e.target.value })}
                    onBlur={saveDeliveryInfo}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    placeholder="Email..."
                    readOnly={!!deliveryInfo.secondaryContactId}
                  />
                </div>
              </div>

              {/* Predpražniki info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Popust (%)
                  </label>
                  <input
                    type="text"
                    value={deliveryInfo.discount || ''}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, discount: e.target.value })}
                    onBlur={saveDeliveryInfo}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="npr. 10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Ima fazo?
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...deliveryInfo, hasPhase: !deliveryInfo.hasPhase };
                      setDeliveryInfo(updated);
                      onUpdate(task.id, { deliveryInfo: updated });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      deliveryInfo.hasPhase
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {deliveryInfo.hasPhase ? 'DA' : 'NE'}
                  </button>
                </div>
              </div>

              {/* Možnosti za razširitev */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Možnosti za razširitev
                </label>
                <textarea
                  value={deliveryInfo.expansionNotes || ''}
                  onChange={(e) => setDeliveryInfo({ ...deliveryInfo, expansionNotes: e.target.value })}
                  onBlur={saveDeliveryInfo}
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                  rows={2}
                  placeholder="Možnosti za dodatne predpražnike..."
                />
              </div>

              {/* Mesto namestitve */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  <MapPin size={14} className="inline mr-1" />
                  Mesto namestitve predpražnika
                </label>
                <textarea
                  value={deliveryInfo.locationDescription || ''}
                  onChange={(e) => setDeliveryInfo({ ...deliveryInfo, locationDescription: e.target.value })}
                  onBlur={saveDeliveryInfo}
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                  rows={2}
                  placeholder="Opis lokacije kjer se predpražnik namesti..."
                />
              </div>

              {/* Opombe za voznika */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Dodatne opombe za voznika
                </label>
                <textarea
                  value={deliveryInfo.driverNotes || ''}
                  onChange={(e) => setDeliveryInfo({ ...deliveryInfo, driverNotes: e.target.value })}
                  onBlur={saveDeliveryInfo}
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                  rows={3}
                  placeholder="Kje parkirati, kdaj je dostop, posebnosti..."
                />
              </div>

              {/* Image paste area */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  <Image size={14} className="inline mr-1" />
                  Slike lokacije (Ctrl+V za prilepitev)
                </label>
                <div
                  ref={pasteAreaRef}
                  className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-white min-h-[100px] cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => pasteAreaRef.current?.focus()}
                  tabIndex={0}
                >
                  {(deliveryInfo.images?.length || 0) > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {deliveryInfo.images?.map((src, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={src}
                            alt={`Lokacija ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg border cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(src, '_blank');
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveDeliveryImage(index);
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Odstrani"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 py-4">
                      <ClipboardPaste size={24} className="mb-2" />
                      <p className="text-sm">Uporabi Ctrl+V za prilepitev screenshota</p>
                      <p className="text-xs mt-1">ali klikni za fokus</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Generate report button */}
              <button
                type="button"
                onClick={generateDriverReport}
                disabled={isGeneratingPdf}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText size={18} />
                {isGeneratingPdf
                  ? 'Generiram PDF...'
                  : deliveryInfo.reportGenerated
                    ? 'Ponovno generiraj PDF'
                    : 'Generiraj PDF za šoferja'}
              </button>
              {deliveryInfo.reportGenerated && (
                <p className="text-sm text-green-600 text-center">✓ PDF je bil generiran</p>
              )}
            </div>
          )}

          {/* Izris Task Info */}
          {isIzrisTask && izrisData && (
            <div className="bg-amber-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 text-amber-700 font-medium">
                <Palette size={20} />
                <span>Podatki za izris</span>
              </div>

              {/* Copyable title */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Naslov za kopiranje
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white border rounded-lg font-mono text-sm overflow-x-auto">
                    {izrisData.title}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyTitle}
                    className={`p-2 rounded-lg transition-colors ${
                      titleCopied
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                    title="Kopiraj naslov"
                  >
                    {titleCopied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
                {titleCopied && (
                  <p className="text-sm text-green-600 mt-1">✓ Kopirano!</p>
                )}
              </div>

              {/* Template image */}
              {izrisData.templatePath && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-600">
                      Pozicija logotipa
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const response = await fetch(izrisData.templatePath!);
                          const blob = await response.blob();
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `pozicija-${izrisData.title.replace(/[^a-zA-Z0-9-]/g, '_')}.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error('Error downloading image:', error);
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-green-600 hover:bg-green-50 rounded"
                      title="Prenesi sliko pozicije"
                    >
                      <Download size={14} />
                      Prenesi
                    </button>
                  </div>
                  <div className="bg-white rounded-lg border p-2">
                    <img
                      src={izrisData.templatePath}
                      alt={izrisData.templateLabel || 'Pozicija'}
                      className="max-h-32 object-contain mx-auto cursor-pointer"
                      onClick={() => window.open(izrisData.templatePath, '_blank')}
                      title="Klikni za povečavo"
                    />
                    {izrisData.templateLabel && (
                      <p className="text-center text-sm text-gray-500 mt-1">
                        {izrisData.templateLabel}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-lg p-2 border">
                  <span className="text-gray-500">Dobavitelj:</span>
                  <span className="ml-1 font-medium">
                    {izrisData.supplier === 'mount_will' ? 'Mount Will' :
                     izrisData.supplier === 'emco' ? 'EMCO' :
                     izrisData.supplier === 'kleen_tex' ? 'Kleen-Tex' :
                     izrisData.supplier}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-2 border">
                  <span className="text-gray-500">Vrsta:</span>
                  <span className="ml-1 font-medium">
                    {izrisData.orderType === 'najem' ? 'Najem (DESIGN)' : 'Nakup (PROMO)'}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-2 border">
                  <span className="text-gray-500">Dimenzije:</span>
                  <span className="ml-1 font-medium">
                    {izrisData.width}x{izrisData.height} cm
                    {izrisData.mbwCode && ` (${izrisData.mbwCode})`}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-2 border">
                  <span className="text-gray-500">Orientacija:</span>
                  <span className="ml-1 font-medium">
                    {izrisData.orientation === 'portret' ? 'Portret' : 'Landscape'}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-2 border col-span-2">
                  <span className="text-gray-500">Barva ozadja:</span>
                  <span className="ml-1 font-medium">
                    {izrisData.backgroundColorCode} - {izrisData.backgroundColorName}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-2 border col-span-2">
                  <span className="text-gray-500">Barva logotipa:</span>
                  <span className="ml-1 font-medium">
                    {izrisData.isDesignerChoice
                      ? 'Designer choice'
                      : `${izrisData.logoColorCode} - ${izrisData.logoColorName}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Slike / Priloge */}
          <div ref={imagesRef}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-600">
                <Image size={16} className="inline mr-1" />
                Slike in priloge
              </label>
              <div className="flex items-center gap-2">
                {attachments.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-green-600 hover:bg-green-50 rounded"
                    title="Prenesi vse slike"
                  >
                    <Download size={14} />
                    Prenesi vse
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Upload size={14} />
                  Dodaj
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {attachments.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {attachments.map((src, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={src}
                      alt={`Priloga ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border cursor-pointer"
                      onClick={() => window.open(src, '_blank')}
                      title="Klikni za povečavo"
                    />
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleDownloadImage(src, index)}
                        className="p-1 bg-green-500 text-white rounded-full"
                        title="Prenesi"
                      >
                        <Download size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(index)}
                        className="p-1 bg-red-500 text-white rounded-full"
                        title="Odstrani"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-gray-400">
                <Image size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Ni priloženih slik</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-blue-500 hover:text-blue-600 text-sm"
                >
                  Klikni za dodajanje
                </button>
              </div>
            )}
          </div>

          {/* Meta info */}
          <div className="pt-4 border-t space-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              <span>Ustvarjeno: {createdDate}</span>
            </div>
            {completedDate && (
              <div className="flex items-center gap-2">
                <Calendar size={14} />
                <span>Zaključeno: {completedDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 size={16} />
            Izbriši
          </button>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setTitle(task.title);
                    setDescription(task.description || '');
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Prekliči
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={16} />
                  {isUpdating ? 'Shranjujem...' : 'Shrani'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Zapri
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailModal;
